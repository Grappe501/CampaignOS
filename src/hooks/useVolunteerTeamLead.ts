import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  fetchAssignmentsForCampaign,
  fetchVolunteersForCampaign,
} from '../lib/volunteerCommandApi'
import type { VolunteerAssignment, VolunteerProfile } from '../lib/volunteerCommandDomain'
import { computeShiftCoverage } from '../lib/volunteerCommandCoverage'
import { fetchShiftsForCampaign, fetchShiftSlots } from '../lib/volunteerCommandApi'
import type { VolunteerShiftSlot } from '../lib/volunteerCommandDomain'

/**
 * Team lead scope: volunteers on the same Power5 team + supervisor_teams membership.
 */
export function useVolunteerTeamLead(profileId: string | undefined, campaignId = 'default') {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [myVolunteers, setMyVolunteers] = useState<VolunteerProfile[]>([])
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>([])
  const [shifts, setShifts] = useState<Awaited<ReturnType<typeof fetchShiftsForCampaign>>>([])
  const [slotsByShift, setSlotsByShift] = useState<Map<string, VolunteerShiftSlot[]>>(new Map())

  const load = useCallback(async () => {
    if (!profileId) {
      setMyVolunteers([])
      setAssignments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: teams, error: tErr } = await supabase
        .from('volunteer_supervisor_teams')
        .select('team_id')
        .eq('supervisor_profile_id', profileId)

      if (tErr) throw tErr
      const teamIds = (teams ?? []).map((r) => String((r as { team_id: string }).team_id))

      const { volunteers: all, error: vErr } = await fetchVolunteersForCampaign(campaignId)
      if (vErr) throw vErr

      const profileIds = all.map((v) => v.profileId)
      if (!profileIds.length || !teamIds.length) {
        setMyVolunteers([])
      } else {
        const { data: profs, error: pErr } = await supabase
          .from('campaign_profiles')
          .select('id, power5_home_team_id')
          .in('id', profileIds)

        if (pErr) throw pErr
        const teamSet = new Set(teamIds)
        const allowedProfileIds = new Set(
          (profs ?? [])
            .filter((p) => {
              const tid = (p as { power5_home_team_id?: string | null }).power5_home_team_id
              return tid != null && teamSet.has(String(tid))
            })
            .map((p) => String((p as { id: string }).id)),
        )
        setMyVolunteers(all.filter((v) => allowedProfileIds.has(v.profileId)))
      }

      const asgns = await fetchAssignmentsForCampaign(campaignId)
      setAssignments(asgns)

      const shiftList = await fetchShiftsForCampaign(campaignId)
      setShifts(shiftList)
      const slotMap = new Map<string, VolunteerShiftSlot[]>()
      for (const s of shiftList) {
        slotMap.set(s.id, await fetchShiftSlots(s.id))
      }
      setSlotsByShift(slotMap)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Team lead load failed'))
    } finally {
      setLoading(false)
    }
  }, [profileId, campaignId])

  useEffect(() => {
    void load()
  }, [load])

  const myTeamAssignments = useMemo(() => {
    const ids = new Set(myVolunteers.map((v) => v.id))
    return assignments.filter((a) => a.volunteerId && ids.has(a.volunteerId))
  }, [assignments, myVolunteers])

  const claimGaps = useMemo(
    () => assignments.filter((a) => a.status === 'open' && !a.volunteerId),
    [assignments],
  )

  const coverageRows = useMemo(
    () => computeShiftCoverage(shifts, slotsByShift, assignments),
    [shifts, slotsByShift, assignments],
  )

  const noShowRisks = useMemo(
    () =>
      assignments.filter(
        (a) =>
          a.volunteerId &&
          myVolunteers.some((v) => v.id === a.volunteerId) &&
          (a.status === 'missed' || a.noShow),
      ),
    [assignments, myVolunteers],
  )

  const readyForMore = useMemo(() => {
    return myVolunteers.filter(
      (v) =>
        (v.reliabilityScore ?? 0) >= 55 &&
        (v.onboardingStatus === 'active' || v.onboardingStatus === 'ready'),
    )
  }, [myVolunteers])

  return {
    loading,
    error,
    refetch: load,
    myVolunteers,
    assignments: myTeamAssignments,
    allAssignments: assignments,
    claimGaps,
    coverageRows,
    noShowRisks,
    readyForMore,
  }
}
