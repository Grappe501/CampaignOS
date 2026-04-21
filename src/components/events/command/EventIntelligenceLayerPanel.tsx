import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import {
  fetchCampaignEventOutcome,
  fetchEventAttendanceAggregates,
  fetchEventFollowups,
  fetchEventLearningCaptureFromDb,
  fetchRecentEventHistoryForArea,
  upsertEventLearningCaptureDb,
} from '../../../lib/campaignEventsFromSupabase'
import type { EventIntelligenceEnrichment } from '../../../lib/eventIntelligenceJones'
import { rankSimilarEvents } from '../../../lib/similarEventIntelligenceService'
import { computeAfterActionScore } from '../../../lib/eventAfterActionEngine'
import {
  buildOperatorBriefingPack,
  buildSerializedBriefingSnapshot,
  buildBriefingDelta,
} from '../../../lib/eventBriefingAssembly'
import type { OperatorBriefingMode } from '../../../lib/eventIntelligenceContracts'
import {
  buildAgentJonesEventIntelligenceLayer,
  type AgentJonesEventIntelligenceLayer,
} from '../../../lib/agentJonesEventIntelligenceBridge'
import { buildAgentJonesFieldExecutionSnapshot } from '../../../lib/eventDayOfAgentBridge'
import { EVENT_DAY_OF_WORKSPACE_SAVED } from '../../../lib/eventDayOfLocalStorage'
import { collectOperationsGapsForEvent } from '../../../lib/campaignEventCoordinatorOperations'
import type { StaffingAssignmentLike } from '../../../lib/eventStaffingMatrix'
import {
  isLearningCaptureDraftFilled,
  learningDraftFromDbPayload,
  learningDraftToPayload,
  loadLearningCapture,
  saveLearningCapture,
} from '../../../lib/eventLearningCaptureStorage'
import { buildAgentJonesEventOutcomeLoopSnapshot } from '../../../lib/eventOutcomeMetrics'
import type { CampaignEventOutcomeRow } from '../../../lib/eventOutcomeDomain'
import { loadBriefingSnapshot, saveBriefingSnapshot } from '../../../lib/eventBriefingSnapshotStorage'
import { campaignEventRecordPath } from '../../../lib/campaignEventSystem'

type Props = {
  record: CampaignCalendarEventRecord
  effectiveType: CampaignEventTypeKey
  staffingAssignments: readonly StaffingAssignmentLike[]
  campaignEvents: readonly CampaignCalendarEventRecord[]
  assignmentMap: Map<string, StaffingAssignmentLike[]>
  onAgentJonesLayer: (layer: AgentJonesEventIntelligenceLayer | null) => void
}

export default function EventIntelligenceLayerPanel({
  record,
  effectiveType,
  staffingAssignments,
  campaignEvents,
  assignmentMap,
  onAgentJonesLayer,
}: Props) {
  const layerCbRef = useRef(onAgentJonesLayer)
  useEffect(() => {
    layerCbRef.current = onAgentJonesLayer
  }, [onAgentJonesLayer])

  const [enrichment, setEnrichment] = useState<EventIntelligenceEnrichment | null>(null)
  const [outcomeRow, setOutcomeRow] = useState<CampaignEventOutcomeRow | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [briefMode, setBriefMode] = useState<OperatorBriefingMode>('full')
  const [asOfMs, setAsOfMs] = useState(() => Date.now())
  const [fieldWorkspaceTick, setFieldWorkspaceTick] = useState(0)

  useEffect(() => {
    const id = record.event_id
    const onSaved = (e: Event) => {
      const d = (e as CustomEvent<{ eventId?: string }>).detail
      if (d?.eventId === id) {
        setFieldWorkspaceTick((n) => n + 1)
        setAsOfMs(Date.now())
      }
    }
    window.addEventListener(EVENT_DAY_OF_WORKSPACE_SAVED, onSaved)
    return () => window.removeEventListener(EVENT_DAY_OF_WORKSPACE_SAVED, onSaved)
  }, [record.event_id])

  const [learning, setLearning] = useState(() => loadLearningCapture(record.event_id))

  useEffect(() => {
    setLearning(loadLearningCapture(record.event_id))
  }, [record.event_id])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const row = await fetchEventLearningCaptureFromDb(record.event_id)
      if (cancelled) return
      const d = row ? learningDraftFromDbPayload(record.event_id, row.payload) : null
      if (d) setLearning(d)
    })()
    return () => {
      cancelled = true
    }
  }, [record.event_id])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [agg, rawFollowups, recentAreaEvents, outcome] = await Promise.all([
          fetchEventAttendanceAggregates(record.event_id),
          fetchEventFollowups(record.event_id).catch(() => [] as Record<string, unknown>[]),
          fetchRecentEventHistoryForArea(record.county_id, record.precinct_id, record.event_id, 5),
          fetchCampaignEventOutcome(record.event_id),
        ])
        if (cancelled) return
        const followups = (rawFollowups as { followup_type?: string; status?: string; due_at?: string | null }[]).map(
          (f) => ({
            followupType: String(f.followup_type ?? 'unknown'),
            status: String(f.status ?? 'pending'),
            dueAt: f.due_at != null ? String(f.due_at) : null,
          }),
        )
        setOutcomeRow(outcome)
        setEnrichment({
          attendanceCount: agg.totalCount,
          followups,
          issueFlagsRaised: agg.issueFlagsRaised,
          volunteerInterestFlags: agg.volunteerInterestFlags,
          recentAreaEvents: [...recentAreaEvents],
        })
        setLoadErr(null)
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : 'Context load failed')
          setEnrichment(null)
          setOutcomeRow(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [record.event_id, record.county_id, record.precinct_id])

  const similar = useMemo(
    () => rankSimilarEvents(record, campaignEvents, 6),
    [record, campaignEvents],
  )

  const gaps = useMemo(
    () => collectOperationsGapsForEvent(record, { staffingAssignments }),
    [record, staffingAssignments],
  )

  const afterAction = useMemo(
    () => (enrichment ? computeAfterActionScore(record, enrichment) : null),
    [record, enrichment],
  )

  const briefingPack = useMemo(() => {
    return buildOperatorBriefingPack({
      record,
      effectiveType,
      mode: briefMode,
      staffingAssignments,
      campaignEvents,
      assignmentMap,
      similar,
      afterAction,
      asOfMs,
    })
  }, [record, effectiveType, briefMode, staffingAssignments, campaignEvents, assignmentMap, similar, afterAction, asOfMs])

  const snap = useMemo(() => buildSerializedBriefingSnapshot(record, gaps), [record, gaps])
  const prevSnapMemo = useMemo(() => loadBriefingSnapshot(record.event_id), [record.event_id])
  const delta = useMemo(() => buildBriefingDelta(prevSnapMemo, snap), [prevSnapMemo, snap])

  const fieldExecution = useMemo(() => {
    void fieldWorkspaceTick
    return buildAgentJonesFieldExecutionSnapshot(record, staffingAssignments, asOfMs)
  }, [record, staffingAssignments, asOfMs, fieldWorkspaceTick])

  const outcomeLoop = useMemo(() => {
    if (!enrichment) return null
    return buildAgentJonesEventOutcomeLoopSnapshot({
      record,
      outcomeRow,
      attendanceCheckinCount: enrichment.attendanceCount,
      volunteerInterestFromCheckin: enrichment.volunteerInterestFlags,
      followups: enrichment.followups.map((f) => ({ status: f.status })),
      learningCaptureFilled: isLearningCaptureDraftFilled(learning),
      nowMs: asOfMs,
    })
  }, [enrichment, record, outcomeRow, learning, asOfMs])

  useEffect(() => {
    const layer = buildAgentJonesEventIntelligenceLayer({
      pack: briefingPack,
      delta,
      afterAction,
      recordTitle: record.title,
      fieldExecution,
      outcomeLoop,
    })
    layerCbRef.current(layer)
  }, [briefingPack, delta, afterAction, record.title, fieldExecution, outcomeLoop])

  useEffect(
    () => () => {
      layerCbRef.current(null)
    },
    [],
  )

  const handleSaveLearning = () => {
    saveLearningCapture(learning)
    void upsertEventLearningCaptureDb(record.event_id, learningDraftToPayload(learning)).then(({ error }) => {
      if (error) setLoadErr(`Learning save: ${error.message}`)
    })
  }

  const handleMarkBriefingSeen = () => {
    saveBriefingSnapshot(snap)
  }

  return (
    <section
      className="event-coordinator-desk__section event-intelligence-layer"
      id="event-intelligence-layer"
      aria-labelledby="event-intelligence-heading"
    >
      <h2 id="event-intelligence-heading" className="event-coordinator-desk__h2">
        Event intelligence layer
      </h2>
      <p className="event-coordinator-desk__meta" style={{ marginBottom: 12 }}>
        Similar events, briefings, after-action scoring, and learning capture share one operational snapshot. Scoring is
        advisory. Learning capture saves to Supabase only when you click save (editors); nothing here auto-closes tasks or
        mutates outcomes without your action.
      </p>
      {loadErr ? (
        <p className="event-coordinator-desk__placeholder" role="alert">
          Partial context: {loadErr}
        </p>
      ) : null}

      <div className="event-intelligence-layer__grid">
        <div className="event-intelligence-layer__card">
          <h3 className="event-panel__h3">Similar event intelligence</h3>
          {similar.length === 0 ? (
            <p className="event-panel__body">No strong analogs in this campaign calendar yet — widen geography or complete more events.</p>
          ) : (
            <ul className="event-panel__list">
              {similar.map((m) => (
                <li key={m.similar_event_id}>
                  <strong>{m.title}</strong> — {m.tier.replace(/_/g, ' ')} ({m.score})
                  <div className="event-coordinator-desk__meta">{m.similarity_reasons.slice(0, 3).join(' · ')}</div>
                  <Link className="event-coordinator-desk__link" to={campaignEventRecordPath(m.similar_event_id)}>
                    Open peer event
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="event-intelligence-layer__card">
          <h3 className="event-panel__h3">Operator briefing</h3>
          <div className="event-intelligence-layer__modes" style={{ marginBottom: 10 }}>
            {(['quick', 'full', 'day_of', 'approval_review', 'staffing'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={briefMode === m ? 'seg-cal__chip seg-cal__chip--active' : 'seg-cal__chip'}
                onClick={() => setBriefMode(m)}
              >
                {m.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <p className="event-panel__body" style={{ fontWeight: 600 }}>
            {briefingPack.one_liner}
          </p>
          <ul className="event-panel__list">
            {briefingPack.top_risks.map((r) => (
              <li key={r}>
                <strong>Risk:</strong> {r}
              </li>
            ))}
          </ul>
          <ul className="event-panel__list">
            {briefingPack.next_actions.map((a) => (
              <li key={a}>
                <strong>Next:</strong> {a}
              </li>
            ))}
          </ul>
          <details className="event-coordinator-desk__details">
            <summary>Delta since last briefing snapshot</summary>
            <ul className="event-panel__list">
              {[...delta.changes, ...delta.risks_improved, ...delta.risks_worsened].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <button type="button" className="event-coordinator-desk__btn" onClick={handleMarkBriefingSeen}>
              Save snapshot for future deltas
            </button>
          </details>
        </div>

        <div className="event-intelligence-layer__card">
          <h3 className="event-panel__h3">After-action score</h3>
          {afterAction ? (
            <>
              <p className="event-panel__body">
                Overall <strong>{afterAction.overall_score}</strong> / 100 — data completeness{' '}
                {Math.round(afterAction.completeness * 100)}%
              </p>
              {afterAction.documentation_warnings.length ? (
                <ul className="event-panel__list">
                  {afterAction.documentation_warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
              <details className="event-coordinator-desk__details">
                <summary>Category breakdown</summary>
                <ul className="event-panel__list">
                  {afterAction.categories.map((c) => (
                    <li key={c.key}>
                      {c.label}: {c.score} ({Math.round(c.confidence * 100)}% confidence)
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <p className="event-panel__body">Loading scoring inputs…</p>
          )}
        </div>

        <div className="event-intelligence-layer__card">
          <h3 className="event-panel__h3">Learning capture</h3>
          <p className="event-coordinator-desk__meta">
            Saves to this browser and <code>campaign_event_learning_capture</code> (editors). Advisory only — does not
            auto-close tasks.
          </p>
          {(
            [
              ['what_worked', 'What worked'],
              ['what_failed', 'What failed'],
              ['nearly_failed', 'What nearly failed'],
              ['repeat_next_time', 'Repeat next time'],
              ['change_next_time', 'Change next time'],
              ['was_missing', 'What was missing'],
              ['who_should_be_added', 'Who should be added'],
              ['comms_notes', 'Communications'],
              ['assets_notes', 'Assets / media'],
              ['followup_notes', 'Follow-up'],
              ['area_notes', 'Notes for this area / type'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="event-intelligence-layer__field">
              <span>{label}</span>
              <textarea
                value={learning[key as keyof typeof learning] as string}
                onChange={(e) => setLearning((prev) => ({ ...prev, [key]: e.target.value }))}
                rows={2}
              />
            </label>
          ))}
          <label className="event-intelligence-layer__field">
            <span>Freeform</span>
            <textarea
              value={learning.freeform}
              onChange={(e) => setLearning((prev) => ({ ...prev, freeform: e.target.value }))}
              rows={3}
            />
          </label>
          <button type="button" className="event-coordinator-desk__btn" onClick={handleSaveLearning}>
            Save learning draft
          </button>
        </div>
      </div>
    </section>
  )
}
