import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  bucketCoordinatorAssignments,
  loadCoordinatorDeskData,
  parseInternOverview,
  recentCompletedAssignments,
  type CoordinatorDeskLoad,
} from '../lib/coordinatorDeskData'
export function useCoordinatorDesk(
  power5HomeTeamId: string | null | undefined,
) {
  const [load, setLoad] = useState<CoordinatorDeskLoad | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const primaryTeamId =
    power5HomeTeamId != null && String(power5HomeTeamId).trim() !== ''
      ? String(power5HomeTeamId).trim()
      : undefined

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadCoordinatorDeskData(primaryTeamId)
      setLoad(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load coordinator data')
      setLoad(null)
    } finally {
      setLoading(false)
    }
  }, [primaryTeamId])

  useEffect(() => {
    queueMicrotask(() => {
      void refresh()
    })
  }, [refresh])

  const internParsed = useMemo(
    () => parseInternOverview(load?.internRaw ?? null),
    [load?.internRaw],
  )

  const hasSupervisorScope = (load?.supervisedTeams.length ?? 0) > 0
  const activeAssignments = useMemo(
    () =>
      (load?.assignments ?? []).filter((a) => a.status !== 'completed' && a.status !== 'skipped'),
    [load?.assignments],
  )
  const blockedAssignments = useMemo(
    () => (load?.assignments ?? []).filter((a) => a.status === 'blocked'),
    [load?.assignments],
  )

  const assignmentBuckets = useMemo(
    () => bucketCoordinatorAssignments(load?.assignments ?? []),
    [load?.assignments],
  )

  const recentCompletions = useMemo(
    () => recentCompletedAssignments(load?.assignments ?? []),
    [load?.assignments],
  )

  return {
    loading,
    error,
    refresh,
    assignments: load?.assignments ?? [],
    activeAssignments,
    blockedAssignments,
    assignmentBuckets,
    recentCompletions,
    supervisedTeams: load?.supervisedTeams ?? [],
    activation: load?.activation ?? null,
    internParsed,
    primaryTeamIdUsed:
      primaryTeamId || load?.supervisedTeams[0]?.team_id || null,
    hasSupervisorScope,
  }
}
