/**
 * Mobilize integration — Pass 2–3 (publish/update + sync hash + remote refresh / health).
 *
 * Secrets: MOBILIZE_API_TOKEN | MOBILIZE_API_KEY, MOBILIZE_ORGANIZATION_ID, SUPABASE_SERVICE_ROLE_KEY — never exposed to the browser.
 * Client sends only Supabase session JWT (Authorization: Bearer).
 *
 * Env:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - MOBILIZE_API_TOKEN | MOBILIZE_API_KEY
 * - MOBILIZE_ORGANIZATION_ID (numeric org id)
 * - MOBILIZE_DEFAULT_CONTACT_EMAIL (fallback when row.public_contact_email empty)
 * - MOBILIZE_DEFAULT_TIMEZONE (optional, default America/Chicago)
 *
 * Pass 3: refresh_remote — GET Mobilize event to reconcile public URL, clear stale errors on success,
 * and recompute hash drift (same rules as check_sync). No RSVP/attendance sync.
 *
 * Unsupported: archive/delete (Mobilize DELETE not wired); tag_ids (no Mobilize tag id map).
 */

import { createClient } from '@supabase/supabase-js'
import {
  MOBILIZE_API_BASE,
  buildMobilizeCreateBody,
  buildMobilizeUpdateBody,
  buildServerMobilizeEligibility,
  computeMobilizeSyncHash,
  parseMobilizeJson,
  type CampaignEventDbRow,
} from '../lib/mobilizePass2Core'

type NetlifyEvent = {
  httpMethod: string
  headers: Record<string, string | undefined>
  body?: string
}

type NetlifyResponse = {
  statusCode: number
  headers?: Record<string, string>
  body?: string
}

function corsHeaders(event: NetlifyEvent): Record<string, string> {
  const origin = event.headers.origin || event.headers.Origin || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(statusCode: number, event: NetlifyEvent, payload: unknown): NetlifyResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(event),
    },
    body: JSON.stringify(payload),
  }
}

type MobilizeAction =
  | 'capabilities'
  | 'publish'
  | 'update'
  | 'archive'
  | 'check_sync'
  | 'refresh_remote'

type SyncRow = {
  event_id: string
  mobilize_event_id: string | null
  mobilize_public_url: string | null
  sync_state: string
  update_needed: boolean
  last_synced_at: string | null
  last_error: string | null
  sync_hash: string | null
  tags_synced: string[] | null
  published_by_user_id: string | null
}

function parseBody(raw: string | undefined): { action?: MobilizeAction; eventId?: string } {
  if (!raw) return {}
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const action = o.action
    const eventId = o.eventId
    return {
      action: typeof action === 'string' ? (action as MobilizeAction) : undefined,
      eventId: typeof eventId === 'string' ? eventId : undefined,
    }
  } catch {
    return {}
  }
}

function bearerToken(event: NetlifyEvent): string | null {
  const h =
    event.headers.authorization ||
    event.headers.Authorization ||
    event.headers.AUTHORIZATION
  if (!h || typeof h !== 'string') return null
  const m = h.trim().match(/^Bearer\s+(\S+)/i)
  return m?.[1] ?? null
}

function mobilizeTokenConfigured(): boolean {
  const t = process.env.MOBILIZE_API_TOKEN || process.env.MOBILIZE_API_KEY
  return typeof t === 'string' && t.trim().length > 0
}

function pass2EnvReady(): boolean {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const orgRaw = process.env.MOBILIZE_ORGANIZATION_ID
  const orgOk = typeof orgRaw === 'string' && /^\d+$/.test(orgRaw.trim())
  return Boolean(
    supabaseUrl &&
      typeof serviceKey === 'string' &&
      serviceKey.trim().length > 0 &&
      mobilizeTokenConfigured() &&
      orgOk,
  )
}

function getMobilizeToken(): string {
  const t = process.env.MOBILIZE_API_TOKEN || process.env.MOBILIZE_API_KEY
  if (!t?.trim()) throw new Error('missing_mobilize_token')
  return t.trim()
}

function getOrgIdNum(): number {
  const raw = process.env.MOBILIZE_ORGANIZATION_ID
  if (!raw || !/^\d+$/.test(raw.trim())) throw new Error('missing_mobilize_organization_id')
  return Number(raw.trim())
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key?.trim()) throw new Error('missing_supabase_admin')
  return createClient(url, key.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type MobilizeEventResponse = {
  id?: number
  browser_url?: string
  modified_date?: number
  timeslots?: { id?: number; start_date?: number; end_date?: number }[]
}

async function mobilizeFetchJson(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(`${MOBILIZE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

function mobilizeErrorMessage(status: number, text: string): string {
  const parsed = parseMobilizeJson(text)
  if (parsed.error === 'invalid_json') {
    return `Mobilize HTTP ${status}: ${text.slice(0, 500)}`
  }
  const o = parsed as { message?: string; error?: string; detail?: string }
  const msg = o.message ?? o.detail ?? o.error
  if (typeof msg === 'string') return `Mobilize HTTP ${status}: ${msg}`
  return `Mobilize HTTP ${status}: ${text.slice(0, 500)}`
}

async function loadEventAndSync(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
): Promise<{ row: CampaignEventDbRow | null; sync: SyncRow | null; error?: string }> {
  const { data: row, error: e1 } = await admin.from('campaign_events').select('*').eq('id', eventId).maybeSingle()
  if (e1) {
    console.error('mobilize-events load campaign_events', e1.message)
    return { row: null, sync: null, error: 'database_error' }
  }
  if (!row) return { row: null, sync: null, error: 'event_not_found' }

  const { data: sync, error: e2 } = await admin
    .from('campaign_event_mobilize_sync')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()
  if (e2) {
    console.error('mobilize-events load mobilize_sync', e2.message)
    return { row: null, sync: null, error: 'database_error' }
  }

  return { row: row as CampaignEventDbRow, sync: sync as SyncRow | null }
}

async function upsertSync(
  admin: ReturnType<typeof createAdminClient>,
  payload: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const { error } = await admin.from('campaign_event_mobilize_sync').upsert(payload, {
    onConflict: 'event_id',
  })
  if (error) {
    console.error('mobilize-events upsert sync', error.message)
    return { error: error.message }
  }
  return { error: null }
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event) }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, event, { error: 'method_not_allowed' })
  }

  const accessToken = bearerToken(event)
  if (!accessToken) {
    return json(401, event, {
      error: 'unauthorized',
      detail: 'Authorization: Bearer <supabase_access_token> required.',
    })
  }

  const { action, eventId } = parseBody(event.body)

  if (action === 'capabilities' || action === undefined) {
    const ready = pass2EnvReady()
    return json(200, event, {
      pass: 3,
      mutateOperationsImplemented: ready,
      mobilizeApiTokenConfigured: mobilizeTokenConfigured(),
      supabaseAdminConfigured: Boolean(
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      ),
      mobilizeOrganizationIdConfigured: Boolean(
        process.env.MOBILIZE_ORGANIZATION_ID &&
          /^\d+$/.test(String(process.env.MOBILIZE_ORGANIZATION_ID).trim()),
      ),
      supportedActions: ready
        ? ['publish', 'update', 'check_sync', 'refresh_remote']
        : [],
      unsupportedActions: {
        archive:
          'Mobilize delete/archive is not wired. Use Mobilize dashboard or a future pass.',
        rsvp_sync:
          'RSVP and signup lists are not synced from Mobilize in this integration pass — API surface and product scope TBD.',
      },
      notes: [
        'Mobilize create/update endpoints are RESTRICTED — your org must be granted API access by Mobilize.',
        'refresh_remote performs a real GET; it can clear stale last_error when Mobilize responds OK.',
        'Mobilize tag_ids are not sent; CampaignOS tag strings have no Mobilize id map yet.',
        'is_virtual cannot be changed after Mobilize create — do not switch between virtual and in-person after publish.',
      ],
      message: ready
        ? 'Pass 3: publish, update, check_sync, and refresh_remote (remote health) when env is configured.'
        : 'Pass 3 code is present; set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MOBILIZE_ORGANIZATION_ID, and Mobilize token to enable mutations.',
    })
  }

  if (!eventId?.trim()) {
    return json(400, event, { error: 'invalid_body', detail: 'eventId required for this action.' })
  }

  const id = eventId.trim()

  if (action === 'archive') {
    return json(501, event, {
      error: 'not_implemented',
      action: 'archive',
      eventId: id,
      message:
        'Mobilize event delete/archive is not implemented. Use Mobilize dashboard or a future pass.',
    })
  }

  if (!pass2EnvReady()) {
    return json(503, event, {
      error: 'integration_not_configured',
      detail:
        'Server missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MOBILIZE_ORGANIZATION_ID, or Mobilize API token.',
    })
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    console.error('mobilize-events admin client', e)
    return json(500, event, { error: 'server_misconfigured' })
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken)
  if (userErr || !userData.user) {
    return json(401, event, {
      error: 'invalid_session',
      detail: userErr?.message ?? 'Supabase session could not be validated.',
    })
  }
  const authUid = userData.user.id
  const { data: actorProfile } = await admin
    .from('campaign_profiles')
    .select('id')
    .eq('user_id', authUid)
    .maybeSingle()
  const publishedByProfileId = (actorProfile as { id?: string } | null)?.id ?? null

  const { row, sync, error: loadErr } = await loadEventAndSync(admin, id)
  if (loadErr === 'event_not_found' || !row) {
    return json(404, event, { error: 'event_not_found', eventId: id })
  }
  if (loadErr) {
    return json(500, event, { error: 'database_error' })
  }

  const eligibility = buildServerMobilizeEligibility(row)
  const publishOpts = {
    defaultContactEmail: process.env.MOBILIZE_DEFAULT_CONTACT_EMAIL ?? '',
    defaultTimezone: process.env.MOBILIZE_DEFAULT_TIMEZONE ?? 'America/Chicago',
  }

  if (action === 'refresh_remote') {
    const mid = sync?.mobilize_event_id
    if (!mid?.trim()) {
      return json(200, event, {
        ok: true,
        action: 'refresh_remote',
        eventId: id,
        linkStatus: 'not_linked',
        detail: 'No mobilize_event_id on file — publish first, then refresh pulls Mobilize metadata.',
      })
    }

    const token = getMobilizeToken()
    const orgId = getOrgIdNum()
    const getPath = `/organizations/${orgId}/events/${encodeURIComponent(mid.trim())}`
    const getRes = await mobilizeFetchJson('GET', getPath, token)

    if (!getRes.ok) {
      const msg = mobilizeErrorMessage(getRes.status, getRes.text)
      console.error('mobilize refresh_remote GET failed', msg)
      const critical = getRes.status === 404 || getRes.status === 401 || getRes.status === 403
      const upFail = await upsertSync(admin, {
        event_id: id,
        mobilize_event_id: sync!.mobilize_event_id,
        mobilize_public_url: sync!.mobilize_public_url,
        sync_state: critical ? 'sync_error' : sync!.sync_state,
        update_needed: sync!.update_needed,
        last_synced_at: sync!.last_synced_at,
        last_error: msg,
        sync_hash: sync!.sync_hash,
        tags_synced: sync!.tags_synced,
        published_by_user_id: sync!.published_by_user_id,
      })
      if (upFail.error) {
        return json(500, event, { error: 'db_persist_failed', detail: upFail.error, eventId: id })
      }
      if (critical) {
        await admin.from('campaign_events').update({ mobilize_publish_state: 'sync_error' }).eq('id', id)
      }
      return json(getRes.status >= 400 && getRes.status < 600 ? getRes.status : 502, event, {
        error: 'mobilize_refresh_failed',
        eventId: id,
        detail: msg,
      })
    }

    const parsed = parseMobilizeJson(getRes.text) as { data?: MobilizeEventResponse }
    const data = parsed.data ?? {}
    const urlOut = data.browser_url ?? sync!.mobilize_public_url ?? null
    const remoteModifiedAt =
      typeof data.modified_date === 'number'
        ? new Date(data.modified_date * 1000).toISOString()
        : null

    const hash = computeMobilizeSyncHash(row)
    const stored = sync!.sync_hash ?? null
    const drift = stored == null || hash !== stored

    const upOk = await upsertSync(admin, {
      event_id: id,
      mobilize_event_id: sync!.mobilize_event_id,
      mobilize_public_url: urlOut,
      sync_state: drift ? 'update_required' : 'published',
      update_needed: drift,
      last_synced_at: sync!.last_synced_at,
      last_error: null,
      sync_hash: stored,
      tags_synced: sync!.tags_synced,
      published_by_user_id: sync!.published_by_user_id,
    })
    if (upOk.error) {
      return json(500, event, { error: 'db_persist_failed', detail: upOk.error, eventId: id })
    }

    const { error: refEvErr } = await admin
      .from('campaign_events')
      .update({ mobilize_publish_state: drift ? 'update_required' : 'published' })
      .eq('id', id)
    if (refEvErr) {
      console.error('mobilize-events refresh_remote campaign_events', refEvErr.message)
      return json(500, event, {
        error: 'db_persist_failed',
        detail: refEvErr.message,
        eventId: id,
      })
    }

    return json(200, event, {
      ok: true,
      action: 'refresh_remote',
      eventId: id,
      linkStatus: 'linked',
      mobilizeEventId: data.id != null ? String(data.id) : mid.trim(),
      mobilizePublicUrl: urlOut,
      remoteModifiedAt,
      computedSyncHash: hash,
      storedSyncHash: stored,
      updateNeeded: drift,
      recoveredFromError: Boolean(sync?.last_error),
    })
  }

  if (action === 'check_sync') {
    const hash = computeMobilizeSyncHash(row)
    const stored = sync?.sync_hash ?? null
    const hasRemote = Boolean(sync?.mobilize_event_id)

    if (!hasRemote) {
      return json(200, event, {
        ok: true,
        action: 'check_sync',
        eventId: id,
        computedSyncHash: hash,
        storedSyncHash: stored,
        updateNeeded: false,
        hasRemoteMobilizeEvent: false,
        detail:
          'No mobilize_event_id on file — nothing remote to diff. Publish first, then check_sync compares row hash to last successful publish hash.',
      })
    }

    const drift = stored == null || hash !== stored

    const upHash = await upsertSync(admin, {
      event_id: id,
      mobilize_event_id: sync!.mobilize_event_id,
      mobilize_public_url: sync!.mobilize_public_url,
      sync_state: drift ? 'update_required' : 'published',
      update_needed: drift,
      last_synced_at: sync?.last_synced_at ?? null,
      last_error: null,
      sync_hash: stored,
      tags_synced: sync?.tags_synced ?? null,
      published_by_user_id: sync?.published_by_user_id ?? null,
    })
    if (upHash.error) {
      return json(500, event, { error: 'db_persist_failed', detail: upHash.error, eventId: id })
    }

    const { error: evErr } = await admin
      .from('campaign_events')
      .update({ mobilize_publish_state: drift ? 'update_required' : 'published' })
      .eq('id', id)
    if (evErr) {
      console.error('mobilize-events check_sync campaign_events', evErr.message)
      return json(500, event, { error: 'db_persist_failed', detail: evErr.message, eventId: id })
    }

    return json(200, event, {
      ok: true,
      action: 'check_sync',
      eventId: id,
      computedSyncHash: hash,
      storedSyncHash: stored,
      updateNeeded: drift,
      hasRemoteMobilizeEvent: true,
    })
  }

  if (!eligibility.isEligible) {
    return json(400, event, {
      error: 'not_eligible',
      eventId: id,
      blockingReasons: eligibility.blockingReasons,
    })
  }

  const token = getMobilizeToken()
  const orgId = getOrgIdNum()

  try {
    if (action === 'publish') {
      if (sync?.mobilize_event_id) {
        return json(409, event, {
          error: 'already_published',
          eventId: id,
          mobilizeEventId: sync.mobilize_event_id,
          detail: 'Event already has mobilize_event_id — use update.',
        })
      }

      const built = buildMobilizeCreateBody(row, publishOpts)
      if (built.error) {
        return json(400, event, { error: 'payload_error', detail: built.error, eventId: id })
      }

      const path = `/organizations/${orgId}/events`
      const res = await mobilizeFetchJson('POST', path, token, built.body)
      if (!res.ok) {
        const msg = mobilizeErrorMessage(res.status, res.text)
        console.error('mobilize publish failed', msg)
        const hash = computeMobilizeSyncHash(row)
        await upsertSync(admin, {
          event_id: id,
          mobilize_event_id: sync?.mobilize_event_id ?? null,
          mobilize_public_url: sync?.mobilize_public_url ?? null,
          sync_state: 'sync_error',
          update_needed: false,
          last_synced_at: sync?.last_synced_at ?? null,
          last_error: msg,
          sync_hash: sync?.sync_hash ?? hash,
          tags_synced: sync?.tags_synced ?? null,
          published_by_user_id: sync?.published_by_user_id ?? null,
        })
        await admin.from('campaign_events').update({ mobilize_publish_state: 'sync_error' }).eq('id', id)
        return json(res.status >= 400 && res.status < 600 ? res.status : 502, event, {
          error: 'mobilize_api_error',
          eventId: id,
          detail: msg,
        })
      }

      const parsed = parseMobilizeJson(res.text) as { data?: MobilizeEventResponse }
      const data = parsed.data
      const mid = data?.id != null ? String(data.id) : null
      const urlOut = data?.browser_url ?? null
      if (!mid) {
        const msg = 'Mobilize returned success but no event id in response data.'
        console.error(msg, res.text.slice(0, 300))
        return json(502, event, { error: 'mobilize_response_invalid', eventId: id, detail: msg })
      }

      const hash = computeMobilizeSyncHash(row)
      const nowIso = new Date().toISOString()
      const upOk = await upsertSync(admin, {
        event_id: id,
        mobilize_event_id: mid,
        mobilize_public_url: urlOut,
        sync_state: 'published',
        update_needed: false,
        last_synced_at: nowIso,
        last_error: null,
        sync_hash: hash,
        tags_synced: null,
        published_by_user_id: publishedByProfileId,
      })
      if (upOk.error) {
        return json(500, event, {
          error: 'db_persist_failed',
          detail: upOk.error,
          eventId: id,
          mobilizeEventId: mid,
          mobilizePublicUrl: urlOut,
          warning:
            'Mobilize created the event but CampaignOS could not persist campaign_event_mobilize_sync — reconcile manually.',
        })
      }
      const { error: pubEvErr } = await admin
        .from('campaign_events')
        .update({ mobilize_publish_state: 'published' })
        .eq('id', id)
      if (pubEvErr) {
        console.error('mobilize-events publish campaign_events', pubEvErr.message)
        return json(500, event, {
          error: 'db_persist_failed',
          detail: pubEvErr.message,
          eventId: id,
          mobilizeEventId: mid,
          mobilizePublicUrl: urlOut,
          warning:
            'Mobilize created the event and sync row was saved, but mobilize_publish_state could not be updated.',
        })
      }

      return json(200, event, {
        ok: true,
        action: 'publish',
        eventId: id,
        mobilizeEventId: mid,
        mobilizePublicUrl: urlOut,
        mobilizePublishState: 'published',
        syncHash: hash,
        updateNeeded: false,
        lastSyncedAt: nowIso,
        mobilizeTagsSynced: false,
      })
    }

    if (action === 'update') {
      const mid = sync?.mobilize_event_id
      if (!mid) {
        return json(400, event, {
          error: 'not_published',
          eventId: id,
          detail: 'No mobilize_event_id on file — publish first.',
        })
      }

      const getPath = `/organizations/${orgId}/events/${encodeURIComponent(mid)}`
      const getRes = await mobilizeFetchJson('GET', getPath, token)
      if (!getRes.ok) {
        const msg = mobilizeErrorMessage(getRes.status, getRes.text)
        console.error('mobilize get event failed', msg)
        return json(getRes.status === 404 ? 404 : 502, event, {
          error: 'mobilize_get_failed',
          eventId: id,
          detail: msg,
        })
      }
      const existingParsed = parseMobilizeJson(getRes.text) as { data?: MobilizeEventResponse }
      const existing = existingParsed.data ?? {}

      const built = buildMobilizeUpdateBody(row, existing, publishOpts)
      if (built.error) {
        return json(400, event, { error: 'payload_error', detail: built.error, eventId: id })
      }

      const putPath = `/organizations/${orgId}/events/${encodeURIComponent(mid)}`
      const putRes = await mobilizeFetchJson('PUT', putPath, token, built.body)
      if (!putRes.ok) {
        const msg = mobilizeErrorMessage(putRes.status, putRes.text)
        console.error('mobilize update failed', msg)
        await upsertSync(admin, {
          event_id: id,
          mobilize_event_id: mid,
          mobilize_public_url: sync?.mobilize_public_url ?? null,
          sync_state: 'sync_error',
          update_needed: true,
          last_synced_at: sync?.last_synced_at ?? null,
          last_error: msg,
          sync_hash: sync?.sync_hash ?? null,
          tags_synced: sync?.tags_synced ?? null,
          published_by_user_id: sync?.published_by_user_id ?? null,
        })
        await admin.from('campaign_events').update({ mobilize_publish_state: 'sync_error' }).eq('id', id)
        return json(putRes.status >= 400 && putRes.status < 600 ? putRes.status : 502, event, {
          error: 'mobilize_api_error',
          eventId: id,
          detail: msg,
        })
      }

      const outParsed = parseMobilizeJson(putRes.text) as { data?: MobilizeEventResponse }
      const data = outParsed.data
      const urlOut = data?.browser_url ?? sync?.mobilize_public_url ?? null
      const hash = computeMobilizeSyncHash(row)
      const nowIso = new Date().toISOString()
      const upUpd = await upsertSync(admin, {
        event_id: id,
        mobilize_event_id: mid,
        mobilize_public_url: urlOut,
        sync_state: 'published',
        update_needed: false,
        last_synced_at: nowIso,
        last_error: null,
        sync_hash: hash,
        tags_synced: sync?.tags_synced ?? null,
        published_by_user_id: publishedByProfileId,
      })
      if (upUpd.error) {
        return json(500, event, {
          error: 'db_persist_failed',
          detail: upUpd.error,
          eventId: id,
          mobilizeEventId: mid,
          mobilizePublicUrl: urlOut,
          warning:
            'Mobilize updated the event but CampaignOS could not persist campaign_event_mobilize_sync — reconcile manually.',
        })
      }
      const { error: updEvErr } = await admin
        .from('campaign_events')
        .update({ mobilize_publish_state: 'published' })
        .eq('id', id)
      if (updEvErr) {
        console.error('mobilize-events update campaign_events', updEvErr.message)
        return json(500, event, {
          error: 'db_persist_failed',
          detail: updEvErr.message,
          eventId: id,
          mobilizeEventId: mid,
          warning:
            'Mobilize updated the event and sync row was saved, but mobilize_publish_state could not be updated.',
        })
      }

      return json(200, event, {
        ok: true,
        action: 'update',
        eventId: id,
        mobilizeEventId: mid,
        mobilizePublicUrl: urlOut,
        mobilizePublishState: 'published',
        syncHash: hash,
        updateNeeded: false,
        lastSyncedAt: nowIso,
        mobilizeTagsSynced: Boolean(sync?.tags_synced?.length),
      })
    }
  } catch (e) {
    console.error('mobilize-events handler', e)
    return json(500, event, {
      error: 'internal_error',
      detail: e instanceof Error ? e.message : 'unknown_error',
    })
  }

  return json(400, event, { error: 'unknown_action', detail: String(action) })
}
