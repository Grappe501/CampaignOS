import { useCallback, useEffect, useMemo, useState } from 'react'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import {
  fetchGotvAssignmentsForShifts,
  fetchGotvPollingPlaces,
  fetchGotvShiftsForSites,
  fetchOpenGotvIncidents,
} from '../lib/gotvDb'
import { resolveGotvTurnoutPhase } from '../lib/gotvCountdownEngine'
import { activeSites, assignmentsByShiftIdMap, shiftsBySiteIdMap } from '../lib/gotvCoverageService'
import { computeGotvSiteReadiness } from '../lib/gotvReadiness'
import { buildGotvSiteRollups, type GotvSiteRollup } from '../lib/gotvMetrics'
import { buildGotvProgramAnalytics } from '../lib/gotvAnalytics'
import type { GotvIncidentRow, GotvPollingPlaceRow, GotvSiteAssignmentRow, GotvSiteShiftRow } from '../lib/gotvDomain'
import type { GotvSiteReadiness } from '../lib/gotvReadiness'
import { buildGotvInterventionHints } from '../lib/gotvInterventions'

export function useGotvCommandLayer(campaignId: string) {
  const [sites, setSites] = useState<GotvPollingPlaceRow[]>([])
  const [shifts, setShifts] = useState<GotvSiteShiftRow[]>([])
  const [assignments, setAssignments] = useState<GotvSiteAssignmentRow[]>([])
  const [incidents, setIncidents] = useState<GotvIncidentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setSites([])
      setShifts([])
      setAssignments([])
      setIncidents([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const pl = await fetchGotvPollingPlaces(campaignId)
      const act = activeSites(pl)
      const sh = await fetchGotvShiftsForSites(act.map((s) => s.id))
      const asg = await fetchGotvAssignmentsForShifts(sh.map((x) => x.id))
      const inc = await fetchOpenGotvIncidents(campaignId)
      setSites(act)
      setShifts(sh)
      setAssignments(asg)
      setIncidents(inc)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'GOTV load failed')
      setSites([])
      setShifts([])
      setAssignments([])
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 120_000)
    return () => window.clearInterval(id)
  }, [])

  const phaseResolution = useMemo(() => resolveGotvTurnoutPhase(nowMs), [nowMs])

  const readinessBySite = useMemo(() => {
    const shiftMap = shiftsBySiteIdMap(shifts)
    const asgMap = assignmentsByShiftIdMap(assignments)
    const m = new Map<string, GotvSiteReadiness>()
    for (const site of sites) {
      const siteShifts = shiftMap.get(site.id) ?? []
      const perShiftAsg = new Map<string, GotvSiteAssignmentRow[]>()
      for (const sh of siteShifts) {
        perShiftAsg.set(sh.id, asgMap.get(sh.id) ?? [])
      }
      const r = computeGotvSiteReadiness({
        site,
        shifts: siteShifts,
        assignmentsByShiftId: perShiftAsg,
        openIncidents: incidents,
        phase: phaseResolution.phase,
        phaseUrgency: phaseResolution.urgency_multiplier,
      })
      m.set(site.id, r)
    }
    return m
  }, [sites, shifts, assignments, incidents, phaseResolution])

  const rollups: GotvSiteRollup[] = useMemo(() => {
    return buildGotvSiteRollups(
      sites.map((s) => ({
        id: s.id,
        label: s.label,
        county_id: s.county_id,
        site_kind: s.site_kind,
      })),
      readinessBySite,
    )
  }, [sites, readinessBySite])

  const analytics = useMemo(
    () => buildGotvProgramAnalytics(rollups, phaseResolution.phase),
    [rollups, phaseResolution.phase],
  )

  const interventionHints = useMemo(
    () => buildGotvInterventionHints(rollups, phaseResolution.phase),
    [rollups, phaseResolution.phase],
  )

  return {
    sites,
    shifts,
    assignments,
    incidents,
    loading,
    error,
    refresh,
    phaseResolution,
    readinessBySite,
    rollups,
    analytics,
    interventionHints,
  }
}
