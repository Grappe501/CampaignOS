/**
 * Persistence-backed volunteer hooks for operational dashboards and detail views.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  fetchAssignmentsForCampaign,
  fetchAssignmentsForVolunteer,
  fetchVolunteerById,
  fetchVolunteersForCampaign,
  fetchReliabilitySummaries,
  fetchShiftsForCampaign,
  fetchShiftSlots,
  fetchVolunteerRoleDefinitions,
  fetchVolunteerSkillsBatch,
} from '../lib/volunteerCommandApi'
import type {
  VolunteerAssignment,
  VolunteerProfile,
  VolunteerShift,
  VolunteerShiftSlot,
  VolunteerSkill,
} from '../lib/volunteerCommandDomain'
import { computeShiftCoverage } from '../lib/volunteerCommandCoverage'

export function useVolunteers(campaignId = 'default') {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchVolunteersForCampaign(campaignId)
      if (res.error) throw res.error
      setVolunteers(res.volunteers)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load volunteers'))
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, error, volunteers, refetch: load }
}

export function useVolunteerById(volunteerId: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null)
  const [skills, setSkills] = useState<VolunteerSkill[]>([])

  const load = useCallback(async () => {
    if (!volunteerId) {
      setVolunteer(null)
      setSkills([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { volunteer: v, error: ve } = await fetchVolunteerById(volunteerId)
      if (ve) throw ve
      setVolunteer(v)
      if (v) {
        const sm = await fetchVolunteerSkillsBatch([v.id])
        setSkills(sm.get(v.id) ?? [])
      } else {
        setSkills([])
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load volunteer'))
    } finally {
      setLoading(false)
    }
  }, [volunteerId])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, error, volunteer, skills, refetch: load }
}

export type VolunteerAssignmentFilters = {
  campaignId?: string
  volunteerId?: string | null
  status?: VolunteerAssignment['status']
}

export function useVolunteerAssignments(filters: VolunteerAssignmentFilters) {
  const campaignId = filters.campaignId ?? 'default'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let list: VolunteerAssignment[]
      if (filters.volunteerId) {
        list = await fetchAssignmentsForVolunteer(filters.volunteerId)
      } else {
        list = await fetchAssignmentsForCampaign(campaignId)
      }
      if (filters.status) {
        list = list.filter((a) => a.status === filters.status)
      }
      setAssignments(list)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load assignments'))
    } finally {
      setLoading(false)
    }
  }, [campaignId, filters.volunteerId, filters.status])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, error, assignments, refetch: load }
}

export function useVolunteerShifts(campaignId = 'default') {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [shifts, setShifts] = useState<VolunteerShift[]>([])
  const [slotsByShift, setSlotsByShift] = useState<Map<string, VolunteerShiftSlot[]>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const shiftList = await fetchShiftsForCampaign(campaignId)
      setShifts(shiftList)
      const slotMap = new Map<string, VolunteerShiftSlot[]>()
      for (const s of shiftList) {
        slotMap.set(s.id, await fetchShiftSlots(s.id))
      }
      setSlotsByShift(slotMap)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load shifts'))
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, error, shifts, slotsByShift, refetch: load }
}

export type VolunteerDashboardSnapshot = {
  volunteers: VolunteerProfile[]
  assignments: VolunteerAssignment[]
  shifts: VolunteerShift[]
  slotsByShift: Map<string, VolunteerShiftSlot[]>
  reliability: Awaited<ReturnType<typeof fetchReliabilitySummaries>>
  skillsByVolunteerId: Map<string, VolunteerSkill[]>
  roles: Awaited<ReturnType<typeof fetchVolunteerRoleDefinitions>>
  coverageRows: ReturnType<typeof computeShiftCoverage>
}

/** Aggregated snapshot for coordinator-style dashboards (single load pass). */
export function useVolunteerDashboardSnapshot(campaignId = 'default') {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [snapshot, setSnapshot] = useState<VolunteerDashboardSnapshot | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [volRes, asgns, shiftList, rel, roles] = await Promise.all([
        fetchVolunteersForCampaign(campaignId),
        fetchAssignmentsForCampaign(campaignId),
        fetchShiftsForCampaign(campaignId),
        fetchReliabilitySummaries(campaignId).catch(() => []),
        fetchVolunteerRoleDefinitions(),
      ])
      if (volRes.error) throw volRes.error

      const slotMap = new Map<string, VolunteerShiftSlot[]>()
      for (const s of shiftList) {
        slotMap.set(s.id, await fetchShiftSlots(s.id))
      }
      const ids = volRes.volunteers.map((v) => v.id)
      const skillsByVolunteerId = await fetchVolunteerSkillsBatch(ids)
      const coverageRows = computeShiftCoverage(shiftList, slotMap, asgns)

      setSnapshot({
        volunteers: volRes.volunteers,
        assignments: asgns,
        shifts: shiftList,
        slotsByShift: slotMap,
        reliability: rel,
        skillsByVolunteerId,
        roles,
        coverageRows,
      })
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load dashboard snapshot'))
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, error, snapshot, refetch: load }
}
