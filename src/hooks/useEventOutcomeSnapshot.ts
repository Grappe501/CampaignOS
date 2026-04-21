import { useEffect, useState } from 'react'
import {
  fetchCampaignEventOutcome,
  fetchEventAttendanceAggregates,
  fetchEventFollowups,
  fetchEventLearningCaptureFromDb,
} from '../lib/campaignEventsFromSupabase'
import type { EventOutcomeSnapshotInput } from '../lib/eventOutcomeSelectors'
import {
  isLearningCaptureDraftFilled,
  learningDraftFromDbPayload,
} from '../lib/eventLearningCaptureStorage'

export function useEventOutcomeSnapshot(eventId: string | undefined): {
  snapshot: EventOutcomeSnapshotInput | null
  loading: boolean
  error: string | null
  reloadKey: number
  reload: () => void
} {
  const [snapshot, setSnapshot] = useState<EventOutcomeSnapshotInput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!eventId) {
      setSnapshot(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const [outcomeRow, agg, rawFollowups, learningRow] = await Promise.all([
          fetchCampaignEventOutcome(eventId),
          fetchEventAttendanceAggregates(eventId),
          fetchEventFollowups(eventId).catch(() => [] as Record<string, unknown>[]),
          fetchEventLearningCaptureFromDb(eventId).catch(() => null),
        ])
        if (cancelled) return
        const followups = (rawFollowups as { status?: string }[]).map((f) => ({
          status: String(f.status ?? 'pending'),
        }))
        const draftFromDb = learningRow
          ? learningDraftFromDbPayload(eventId, learningRow.payload)
          : null
        const learningCaptureFilled =
          Boolean(draftFromDb && isLearningCaptureDraftFilled(draftFromDb)) ||
          Boolean(
            learningRow?.payload &&
              typeof learningRow.payload === 'object' &&
              Object.keys(learningRow.payload as object).length > 0,
          )

        setSnapshot({
          outcomeRow,
          attendanceCheckinCount: agg.totalCount,
          followups,
          learningCaptureFilled,
        })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Outcome snapshot failed')
          setSnapshot(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId, reloadKey])

  return {
    snapshot,
    loading,
    error,
    reloadKey,
    reload: () => setReloadKey((k) => k + 1),
  }
}
