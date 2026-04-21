import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import {
  buildInitialCommunicationsWorkspace,
  reconcileCommunicationsWorkspace,
  updateStepStatus,
} from '../../../lib/eventCommunicationsPipeline'
import type { EventCommunicationsWorkspace, EventContentDraft, CommsStepStatus } from '../../../lib/eventCommsModels'
import { EVENT_COMMS_AI_MODES } from '../../../lib/eventCommsModels'
import {
  loadCommunicationsWorkspace,
  saveCommunicationsWorkspace,
  upsertDraft,
  upsertMedia,
} from '../../../lib/eventCommsLocalStorage'
import { recommendPressMediaTreatment } from '../../../lib/eventPressMediaDecision'
import { requestEventCommsDraft, type EventCommsDraftMode } from '../../../lib/api/eventCommsDraft'
import { describeMediaCapture } from '../../../lib/eventMediaCapturePlan'
import { describeTimingVsEventStart } from '../../../lib/eventCommsScheduling'
import { buildDeterministicCommsDraft } from '../../../lib/eventCommsDeterministicDrafts'
import {
  canMutateEventCommunications,
  canRequestCommsAiDrafts,
} from '../../../lib/eventCommsPermissions'
import { evaluatePostEventCommsRisk } from '../../../lib/eventCommsPostEventSignals'
import type { CampaignProfile } from '../../../hooks/useProfile'

type Props = {
  record: CampaignCalendarEventRecord
  effectiveType: CampaignEventTypeKey
  profile?: CampaignProfile | null
}

function draftFromApi(mode: EventCommsDraftMode, title: string, body: string): EventContentDraft {
  const now = new Date().toISOString()
  return {
    id: `draft-${mode}-${Date.now()}`,
    kind: mode,
    title,
    body,
    created_at: now,
    updated_at: now,
    version: 1,
    ai_generated: true,
    reviewed: false,
  }
}

const DraftCard = memo(function DraftCard({
  d,
  onMarkReviewed,
  canEdit,
}: {
  d: EventContentDraft
  onMarkReviewed: (id: string) => void
  canEdit: boolean
}) {
  return (
    <div className="event-comms-center__draft-card">
      <p className="event-panel__body">
        <span className={`event-comms-center__badge event-comms-center__badge--${d.reviewed ? 'ok' : 'risk'}`}>
          {d.reviewed ? 'Reviewed' : 'Needs review'}
        </span>{' '}
        <strong>{d.title}</strong> · {d.kind.replace(/_/g, ' ')} · {d.ai_generated ? 'AI-assisted' : 'Manual template'}
      </p>
      <pre className="event-comms-center__draft-body">{d.body}</pre>
      {!d.reviewed && canEdit ? (
        <button type="button" className="event-coordinator-desk__btn" onClick={() => onMarkReviewed(d.id)}>
          Mark reviewed
        </button>
      ) : null}
    </div>
  )
})

export default function EventCommunicationsCenterPanel({ record, effectiveType, profile = null }: Props) {
  const [ws, setWs] = useState<EventCommunicationsWorkspace | null>(null)
  const [draftErr, setDraftErr] = useState<string | null>(null)
  const [draftBusy, setDraftBusy] = useState<EventCommsDraftMode | null>(null)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const canMutate = useMemo(() => canMutateEventCommunications(profile), [profile])
  const canAi = useMemo(() => canRequestCommsAiDrafts(profile), [profile])

  useEffect(() => {
    const existing = loadCommunicationsWorkspace(record.event_id)
    const base = existing ?? buildInitialCommunicationsWorkspace(record, effectiveType)
    setWs(reconcileCommunicationsWorkspace(base, record, effectiveType))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when identity or schedule changes
  }, [record.event_id, record.start_at, effectiveType])

  const pressRec = useMemo(
    () => recommendPressMediaTreatment({ record, eventType: effectiveType }),
    [record, effectiveType],
  )

  const postEventRisk = useMemo(
    () => (ws ? evaluatePostEventCommsRisk(record, ws) : { level: 'ok' as const, messages: [] }),
    [record, ws],
  )

  const onStepStatus = useCallback(
    (stepId: string, status: CommsStepStatus) => {
      if (!canMutate) return
      setWs((prev) => {
        if (!prev) return prev
        const next = updateStepStatus(prev, stepId, status)
        saveCommunicationsWorkspace(next)
        return next
      })
    },
    [canMutate],
  )

  const onGenerate = async (mode: EventCommsDraftMode) => {
    if (!canAi) {
      setDraftErr('Your role cannot request server-side drafts. Use manual templates or ask a coordinator.')
      return
    }
    setDraftErr(null)
    setDraftBusy(mode)
    try {
      const res = await requestEventCommsDraft({
        mode,
        event: {
          event_id: record.event_id,
          title: record.title,
          event_type: record.event_type,
          start_at: record.start_at,
          end_at: record.end_at,
          timezone: record.timezone,
          venue_name: record.venue_name,
          address_or_virtual: record.address_or_virtual,
          postal_code: record.postal_code ?? null,
          county_id: record.county_id,
          visibility_scope: record.visibility_scope,
          stage_status: record.stage_status,
          public_title: record.public_title ?? null,
          public_description: record.public_description ?? null,
          notes: record.notes,
          event_objective: record.event_objective ?? null,
          operational_status: record.operational_status ?? null,
        },
        press_context: pressRec.recommendation_reason,
      })
      setWs((prev) => {
        if (!prev) return prev
        const d = draftFromApi(mode, res.title, res.body)
        const next = upsertDraft(prev, d)
        saveCommunicationsWorkspace(next)
        return next
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Draft failed'
      setDraftErr(`${msg} A structured offline template was added — edit before any send.`)
      setWs((prev) => {
        if (!prev) return prev
        const fallback = buildDeterministicCommsDraft(mode, record, pressRec)
        const next = upsertDraft(prev, fallback)
        saveCommunicationsWorkspace(next)
        return next
      })
    } finally {
      setDraftBusy(null)
    }
  }

  const markReviewed = useCallback(
    (id: string) => {
      if (!canMutate) return
      setWs((prev) => {
        if (!prev) return prev
        const drafts = prev.drafts.map((d) =>
          d.id === id ? { ...d, reviewed: true, updated_at: new Date().toISOString() } : d,
        )
        const next = {
          ...prev,
          drafts,
          audit: [...prev.audit, { at: new Date().toISOString(), action: 'draft_reviewed', detail: id }].slice(-80),
        }
        saveCommunicationsWorkspace(next)
        return next
      })
    },
    [canMutate],
  )

  const onManualTemplate = (mode: EventCommsDraftMode) => {
    if (!canMutate) return
    setWs((prev) => {
      if (!prev) return prev
      const fallback = buildDeterministicCommsDraft(mode, record, pressRec)
      const next = upsertDraft(prev, fallback)
      saveCommunicationsWorkspace(next)
      return next
    })
    setDraftErr(null)
  }

  const onMediaFile = (file: File | null) => {
    if (!file || !canMutate) return
    setUploadErr(null)
    if (file.size > 2_500_000) {
      setUploadErr('File too large for local preview (max ~2.5MB). Try a smaller image or compress.')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setUploadErr('Could not read this file — try another format or smaller file.')
    reader.onload = () => {
      const storage_ref = typeof reader.result === 'string' ? reader.result : ''
      const row = {
        id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        event_id: record.event_id,
        media_type: file.type.startsWith('video') ? ('video' as const) : ('photo' as const),
        category: 'uploaded',
        caption: file.name,
        tags: [] as string[],
        recap_suitable: true,
        press_suitable: false,
        social_suitable: true,
        uploaded_at: new Date().toISOString(),
        storage_ref,
      }
      setWs((prev) => {
        if (!prev) return prev
        const next = upsertMedia(prev, row)
        saveCommunicationsWorkspace(next)
        return next
      })
      setDraftErr(null)
    }
    reader.readAsDataURL(file)
  }

  const captureLines = useMemo(
    () => (ws ? describeMediaCapture(ws.plan.media_capture) : []),
    [ws],
  )

  const sortedDrafts = useMemo(() => {
    if (!ws) return []
    return [...ws.drafts].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
  }, [ws])

  if (!ws) {
    return (
      <section className="event-coordinator-desk__section event-comms-center" id="event-record-communications">
        <p className="event-coordinator-desk__meta" role="status">
          Loading communications workspace…
        </p>
      </section>
    )
  }

  const startMissing = !record.start_at?.trim()
  const pressIntentionalNone = pressRec.press_level === 'none'

  return (
    <section
      className="event-coordinator-desk__section event-comms-center"
      id="event-record-communications"
      aria-labelledby="event-comms-heading"
    >
      <h2 id="event-comms-heading" className="event-coordinator-desk__h2">
        Communications · media · press · post-event
      </h2>

      {!canMutate ? (
        <p className="seg-cal__banner" role="status">
          View-only: coordinator or campaign roles can edit steps, drafts, and uploads.
        </p>
      ) : null}

      {startMissing ? (
        <p className="seg-cal__banner" role="alert">
          <strong>Set a start date and time</strong> on the event so communication step due dates and press timing can
          compute.
        </p>
      ) : null}

      {postEventRisk.level !== 'ok' ? (
        <div
          className={
            postEventRisk.level === 'high' ? 'seg-cal__banner' : 'event-comms-center__notice'
          }
          role="status"
        >
          <strong>Post-event documentation</strong>
          <ul className="event-comms-center__risk-list">
            {postEventRisk.messages.map((m, i) => (
              <li key={`post-event-risk-${i}`}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="event-coordinator-desk__meta">
        Playbook <strong>{ws.plan.playbook_id}</strong> — drafts are <strong>review-only</strong>; nothing sends
        automatically. Storage: <strong>browser local</strong> until campaign sync ships. AI runs server-side only.
      </p>

      <div className="event-comms-center__toolbar">
        {canMutate ? (
          <button
            type="button"
            className="event-coordinator-desk__btn"
            onClick={() => {
              setWs((prev) => {
                if (!prev) return prev
                saveCommunicationsWorkspace(prev)
                return prev
              })
            }}
          >
            Save workspace
          </button>
        ) : null}
      </div>

      <div className="event-intelligence-layer__grid">
        <div className="event-intelligence-layer__card">
          <h3 className="event-panel__h3">Overview</h3>
          <p className="event-panel__body">
            <strong>Announcement:</strong> {ws.plan.announcement_cadence}
          </p>
          <p className="event-panel__body">
            <strong>Volunteers:</strong> {ws.plan.volunteer_cadence}
          </p>
          <p className="event-panel__body">
            <strong>Attendees:</strong> {ws.plan.attendee_reminder_cadence}
          </p>
          <p className="event-panel__body">
            <strong>Internal:</strong> {ws.plan.internal_cadence}
          </p>
        </div>

        <div className="event-intelligence-layer__card">
          <h3 className="event-panel__h3">Press / media decision</h3>
          {pressIntentionalNone ? (
            <p className="event-panel__body">
              <span className="event-comms-center__badge event-comms-center__badge--muted">Intentional minimum</span>{' '}
              No formal wire/track package recommended from current visibility — use owned channels unless strategy
              changes.
            </p>
          ) : null}
          <p className="event-panel__body">
            <strong>Recommended level:</strong> {pressRec.press_level.replace(/_/g, ' ')} ({pressRec.priority})
          </p>
          <p className="event-panel__body">{pressRec.recommendation_reason}</p>
          <p className="event-panel__body">
            <strong>Next:</strong> {pressRec.suggested_next_step}
          </p>
        </div>

        <div className="event-intelligence-layer__card">
          <h3 className="event-panel__h3">Delivery (staging)</h3>
          <p className="event-panel__body">
            SendGrid/Twilio sends are gated. Track step status here; wire delivery after permission review. Stub:{' '}
            <code>/.netlify/functions/comms-delivery-stub</code>
          </p>
        </div>
      </div>

      <h3 className="event-panel__h3 event-comms-center__h3">Communication steps</h3>
      <p className="event-coordinator-desk__meta">
        Due dates follow the event start; they refresh when the schedule changes.
      </p>
      <ul className="event-comms-center__step-list">
        {ws.plan.steps.map((s) => (
          <li key={s.id} className="event-comms-center__step">
            <div className="event-comms-center__step-head">
              <strong>{s.label}</strong>
              <span className="event-comms-center__badge">{s.channel.replace(/_/g, ' ')}</span>
            </div>
            <p className="subtitle" style={{ margin: '0.25rem 0' }}>
              Target offset: <code>{s.timing_hint}</code> · Computed:{' '}
              {describeTimingVsEventStart(s.timing_hint, record.start_at)}
            </p>
            <label className="subtitle">
              Status{' '}
              <select
                className="btn-touch"
                value={s.status}
                disabled={!canMutate}
                onChange={(e) => onStepStatus(s.id, e.target.value as CommsStepStatus)}
              >
                <option value="pending">pending</option>
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="sent">sent</option>
                <option value="failed">failed</option>
                <option value="acknowledged">acknowledged</option>
                <option value="skipped">skipped</option>
                <option value="blocked_permissions">blocked_permissions</option>
              </select>
            </label>
          </li>
        ))}
      </ul>

      <h3 className="event-panel__h3 event-comms-center__h3">AI drafts</h3>
      {draftErr ? (
        <p className="event-coordinator-desk__placeholder" role="alert">
          {draftErr}
        </p>
      ) : null}
      <div className="event-comms-center__modes">
        {EVENT_COMMS_AI_MODES.map((m) => (
          <div key={m} className="event-comms-center__mode-row">
            <button
              type="button"
              className="seg-cal__chip"
              disabled={draftBusy !== null || !canAi}
              onClick={() => void onGenerate(m)}
              title={!canAi ? 'Coordinator role required for server drafts' : undefined}
            >
              {draftBusy === m ? '…' : m.replace(/_/g, ' ')}
            </button>
            {canMutate ? (
              <button type="button" className="event-comms-center__ghost-btn" onClick={() => onManualTemplate(m)}>
                Manual template
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {sortedDrafts.length ? (
        <details open className="event-coordinator-desk__details event-comms-center__drafts">
          <summary>Draft library ({sortedDrafts.length})</summary>
          {sortedDrafts.map((d) => (
            <DraftCard key={d.id} d={d} onMarkReviewed={markReviewed} canEdit={canMutate} />
          ))}
        </details>
      ) : (
        <p className="event-coordinator-desk__placeholder" role="status">
          No drafts yet — generate from the buttons above or add manual templates. Nothing publishes automatically.
        </p>
      )}

      <h3 className="event-panel__h3 event-comms-center__h3">Social plan</h3>
      {ws.plan.social_plan.length ? (
        <ul className="event-panel__list">
          {ws.plan.social_plan.map((s) => (
            <li key={s.id}>
              <strong>{s.headline}</strong> — {s.channel.replace(/_/g, ' ')} · {s.purpose} ·{' '}
              {s.publish_timing ?? 'TBD'}
              <div className="subtitle">{s.body_prompt}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="event-coordinator-desk__placeholder">No social slots on this playbook.</p>
      )}

      <h3 className="event-panel__h3 event-comms-center__h3">Graphics / creative</h3>
      {ws.plan.graphics_requests.length ? (
        <ul className="event-panel__list">
          {ws.plan.graphics_requests.map((g) => (
            <li key={g.id}>
              <span className="event-comms-center__badge">{g.status}</span> <strong>{g.title}</strong> (
              {g.asset_type.replace(/_/g, ' ')})
              <div className="subtitle">{g.brief}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="event-coordinator-desk__placeholder">No creative requests queued for this event type.</p>
      )}

      <h3 className="event-panel__h3 event-comms-center__h3">Live coverage + day-of</h3>
      <ul className="event-panel__list">
        {captureLines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>

      <h3 className="event-panel__h3 event-comms-center__h3">Post-event pipeline</h3>
      <p className="event-panel__body">
        Recap: <strong>{ws.plan.post_event.recap_status.replace(/_/g, ' ')}</strong> · Gallery:{' '}
        <strong>{ws.plan.post_event.gallery_status}</strong> · Thank-you status:{' '}
        <strong>{ws.plan.post_event.thank_you_status}</strong> · Press follow-up:{' '}
        {ws.plan.post_event.press_followup ? 'yes' : 'no'}
      </p>

      <h3 className="event-panel__h3 event-comms-center__h3">Media library (local previews)</h3>
      {canMutate ? (
        <>
          <input
            type="file"
            accept="image/*,video/*"
            aria-label="Upload photo or short clip"
            onChange={(e) => onMediaFile(e.target.files?.[0] ?? null)}
          />
          {uploadErr ? (
            <p className="event-coordinator-desk__placeholder" role="alert">
              {uploadErr}
            </p>
          ) : null}
        </>
      ) : (
        <p className="event-coordinator-desk__placeholder">Uploads require edit access.</p>
      )}
      {ws.media_library.length ? (
        <ul className="event-comms-center__media-list">
          {ws.media_library.map((m) => (
            <li key={m.id} className="event-comms-center__media-item">
              <span className="event-comms-center__badge">{m.media_type}</span> {m.caption}
              {m.storage_ref.startsWith('data:image') ? (
                <img src={m.storage_ref} alt="" className="event-comms-center__thumb" />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="event-panel__body">No media yet — add assets for recap, social proof, and internal documentation.</p>
      )}
    </section>
  )
}
