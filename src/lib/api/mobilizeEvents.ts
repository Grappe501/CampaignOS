/**
 * Client for Netlify `mobilize-events` function.
 * Sends only the user session bearer — never Mobilize secrets.
 */

import type { CampaignCalendarEventRecord } from '../campaignCalendarArchitecture'
import { getNetlifyFunctionsOrigin } from './agentJones'

export type MobilizeCapabilitiesResponse = {
  pass: number
  mutateOperationsImplemented: boolean
  mobilizeApiTokenConfigured: boolean
  supabaseAdminConfigured?: boolean
  mobilizeOrganizationIdConfigured?: boolean
  supportedActions?: string[]
  unsupportedActions?: Record<string, string>
  notes?: string[]
  message: string
}

export type MobilizeMutationSuccess = {
  ok: true
  action: 'publish' | 'update'
  eventId: string
  mobilizeEventId: string
  mobilizePublicUrl: string | null
  mobilizePublishState: string
  syncHash: string
  updateNeeded: boolean
  lastSyncedAt: string
  mobilizeTagsSynced: boolean
  warning?: string
}

export type MobilizeCheckSyncSuccess = {
  ok: true
  action: 'check_sync'
  eventId: string
  computedSyncHash: string
  storedSyncHash: string | null
  updateNeeded: boolean
  hasRemoteMobilizeEvent: boolean
  detail?: string
}

export type MobilizeRefreshRemoteResult =
  | {
      ok: true
      action: 'refresh_remote'
      eventId: string
      linkStatus: 'not_linked'
      detail?: string
    }
  | {
      ok: true
      action: 'refresh_remote'
      eventId: string
      linkStatus: 'linked'
      mobilizeEventId: string
      mobilizePublicUrl: string | null
      remoteModifiedAt: string | null
      computedSyncHash: string
      storedSyncHash: string | null
      updateNeeded: boolean
      recoveredFromError: boolean
    }

export type MobilizeErrorBody = {
  error: string
  detail?: string
  eventId?: string
  blockingReasons?: string[]
  mobilizeEventId?: string
  mobilizePublicUrl?: string
  warning?: string
}

export class MobilizeServerError extends Error {
  readonly status: number
  readonly body: MobilizeErrorBody

  constructor(status: number, body: MobilizeErrorBody) {
    super(body.detail ?? body.error ?? `mobilize-events ${status}`)
    this.name = 'MobilizeServerError'
    this.status = status
    this.body = body
  }
}

export function getMobilizeEventsEndpointUrl(): string {
  const origin = getNetlifyFunctionsOrigin()
  const path = '/.netlify/functions/mobilize-events'
  return origin ? `${origin}${path}` : path
}

export async function fetchMobilizeServerCapabilities(
  accessToken: string,
): Promise<MobilizeCapabilitiesResponse> {
  const url = getMobilizeEventsEndpointUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'capabilities' }),
  })
  const data = (await res.json()) as MobilizeCapabilitiesResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `mobilize-events ${res.status}`)
  }
  return data
}

export type MobilizePostAction = 'publish' | 'update' | 'check_sync' | 'refresh_remote'

export async function postMobilizeEventAction(
  accessToken: string,
  action: MobilizePostAction,
  eventId: string,
): Promise<MobilizeMutationSuccess | MobilizeCheckSyncSuccess | MobilizeRefreshRemoteResult> {
  const url = getMobilizeEventsEndpointUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action, eventId }),
  })
  const data = (await res.json()) as
    | MobilizeMutationSuccess
    | MobilizeCheckSyncSuccess
    | MobilizeRefreshRemoteResult
    | MobilizeErrorBody
  if (!res.ok) {
    throw new MobilizeServerError(res.status, data as MobilizeErrorBody)
  }
  if (typeof data === 'object' && data && 'ok' in data && data.ok) {
    return data as MobilizeMutationSuccess | MobilizeCheckSyncSuccess | MobilizeRefreshRemoteResult
  }
  throw new MobilizeServerError(res.status, { error: 'invalid_response', detail: JSON.stringify(data) })
}

/** Merge server mutation result into the coordinator desk event record shape (in-memory until Supabase load). */
export function applyMobilizeMutationToRecord(
  res: MobilizeMutationSuccess,
): Partial<CampaignCalendarEventRecord> {
  return {
    mobilize_event_id: res.mobilizeEventId,
    mobilize_public_url: res.mobilizePublicUrl,
    mobilize_publish_state: res.mobilizePublishState,
    mobilize_last_synced_at: res.lastSyncedAt,
    mobilize_last_error: null,
    mobilize_sync_hash: res.syncHash,
    mobilize_update_needed: res.updateNeeded,
    mobilize_tags_synced: res.mobilizeTagsSynced,
    mobilize_published_by_user_id: null,
  }
}

export function applyMobilizeCheckSyncToRecord(
  res: MobilizeCheckSyncSuccess,
): Partial<CampaignCalendarEventRecord> {
  if (!res.hasRemoteMobilizeEvent) {
    return { mobilize_update_needed: false }
  }
  return {
    mobilize_update_needed: res.updateNeeded,
    mobilize_publish_state: res.updateNeeded ? 'update_required' : 'published',
  }
}

export function applyMobilizeRefreshToRecord(
  res: MobilizeRefreshRemoteResult,
): Partial<CampaignCalendarEventRecord> {
  if (res.linkStatus === 'not_linked') return {}
  return {
    mobilize_public_url: res.mobilizePublicUrl,
    mobilize_last_error: null,
    mobilize_update_needed: res.updateNeeded,
    mobilize_publish_state: res.updateNeeded ? 'update_required' : 'published',
    mobilize_remote_modified_at: res.remoteModifiedAt,
  }
}
