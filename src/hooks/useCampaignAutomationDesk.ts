import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../lib/campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from '../lib/eventStaffingMatrix'
import type { AutomationActionRow } from '../lib/automationDomain'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import { fetchOpenAutomationActions } from '../lib/campaignAutomationDb'
import { syncAutomationLayer } from '../lib/campaignAutomationSync'

function eventIdsKey(events: readonly CampaignCalendarEventRecord[]): string {
  return JSON.stringify([...new Set(events.map((e) => e.event_id))].filter(Boolean).sort())
}

function staffingSignature(assignmentMap: Map<string, StaffingAssignmentLike[]>): string {
  let rows = 0
  for (const v of assignmentMap.values()) rows += v.length
  return `${assignmentMap.size}:${rows}`
}

export function useCampaignAutomationDesk(input: {
  campaignId: string
  events: readonly CampaignCalendarEventRecord[]
  assignmentMap: Map<string, StaffingAssignmentLike[]>
}) {
  const [rows, setRows] = useState<AutomationActionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const eventKey = useMemo(() => eventIdsKey(input.events), [input.events])
  const staffingKey = useMemo(() => staffingSignature(input.assignmentMap), [input.assignmentMap])

  const refresh = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setRows([])
      setLastError(null)
      return
    }
    setLoading(true)
    const r = await fetchOpenAutomationActions(input.campaignId)
    setLoading(false)
    if (r.ok) {
      setRows(r.rows)
      setLastError(null)
    } else {
      setLastError(r.error)
    }
  }, [input.campaignId])

  // Sync when campaign id or event/staffing signatures change (avoids unstable Map identity loops).
  useEffect(() => {
    if (isDevAuthBypassEnabled()) {
      setRows([])
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const sync = await syncAutomationLayer({
        campaignId: input.campaignId,
        nowMs: Date.now(),
        events: input.events,
        assignmentMap: input.assignmentMap,
      })
      const r = await fetchOpenAutomationActions(input.campaignId)
      if (cancelled) return
      setLoading(false)
      if (sync.errors.length) {
        setLastError(sync.errors[0] ?? null)
      } else {
        setLastError(null)
      }
      if (r.ok) setRows(r.rows)
    })()
    return () => {
      cancelled = true
    }
  }, [input.campaignId, eventKey, staffingKey, input.events, input.assignmentMap])

  return { rows, loading, lastError, refresh }
}
