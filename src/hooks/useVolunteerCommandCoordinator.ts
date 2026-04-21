import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeShiftCoverage } from '../lib/volunteerCommandCoverage'
import {
  fetchAssignmentsForCampaign,
  fetchOpenAssignments,
  fetchReliabilitySummaries,
  fetchReminderQueuePending,
  fetchPendingAssignmentRemindersForCampaign,
  fetchShiftsForCampaign,
  fetchShiftSlots,
  fetchVolunteerRoleDefinitions,
  fetchVolunteerSkillsBatch,
  fetchVolunteersForCampaign,
} from '../lib/volunteerCommandApi'
import type {
  VolunteerAssignmentReminder,
  VolunteerProfile,
  VolunteerSkill,
  VolunteerShiftSlot,
} from '../lib/volunteerCommandDomain'
import { categorizeVolunteerReliability, volunteerToLeaderPipelineStage } from '../lib/volunteerCommandReliability'
import { summarizeReminderBacklog } from '../lib/volunteerCommandReminders'
import {
  recommendVolunteersForRole,
  type RecommendationContext,
} from '../lib/volunteerCommandRecommendations'
import { buildAgentJonesVolunteerThroughputContext } from '../lib/volunteerThroughputMetrics'

/** When `enabled` is false, no network load (use on non-coordinator routes sharing Agent Jones). */
export function useVolunteerCommandCoordinator(campaignId = 'default', enabled = true) {
  const [loading, setLoading] = useState(() => enabled)
  const [error, setError] = useState<Error | null>(null)
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([])
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof fetchAssignmentsForCampaign>>>([])
  const [shifts, setShifts] = useState<Awaited<ReturnType<typeof fetchShiftsForCampaign>>>([])
  const [slotsByShift, setSlotsByShift] = useState<Map<string, VolunteerShiftSlot[]>>(new Map())
  const [roles, setRoles] = useState<Awaited<ReturnType<typeof fetchVolunteerRoleDefinitions>>>([])
  const [reliability, setReliability] = useState<Awaited<ReturnType<typeof fetchReliabilitySummaries>>>([])
  const [reminders, setReminders] = useState<Awaited<ReturnType<typeof fetchReminderQueuePending>>>([])
  const [assignmentReminders, setAssignmentReminders] = useState<VolunteerAssignmentReminder[]>([])
  const [skillsByVolunteerId, setSkillsByVolunteerId] = useState<Map<string, VolunteerSkill[]>>(new Map())

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const [volRes, roleList, asgns, shiftList, rel, rem, asgRem] = await Promise.all([
        fetchVolunteersForCampaign(campaignId),
        fetchVolunteerRoleDefinitions(),
        fetchAssignmentsForCampaign(campaignId),
        fetchShiftsForCampaign(campaignId),
        fetchReliabilitySummaries(campaignId).catch(() => []),
        fetchReminderQueuePending().catch(() => []),
        fetchPendingAssignmentRemindersForCampaign(campaignId).catch(() => []),
      ])

      if (volRes.error) throw volRes.error
      setVolunteers(volRes.volunteers)
      setAssignments(asgns)
      setRoles(roleList)
      setShifts(shiftList)
      setReliability(rel)
      setReminders(rem)
      setAssignmentReminders(asgRem)

      await fetchOpenAssignments(campaignId).catch(() => [])

      const slotMap = new Map<string, VolunteerShiftSlot[]>()
      for (const s of shiftList) {
        const slots = await fetchShiftSlots(s.id)
        slotMap.set(s.id, slots)
      }
      setSlotsByShift(slotMap)

      const ids = volRes.volunteers.map((v) => v.id)
      setSkillsByVolunteerId(await fetchVolunteerSkillsBatch(ids))
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load volunteer command data'))
    } finally {
      setLoading(false)
    }
  }, [campaignId, enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    void load()
  }, [load, enabled])

  const coverageRows = useMemo(
    () => (enabled ? computeShiftCoverage(shifts, slotsByShift, assignments) : []),
    [enabled, shifts, slotsByShift, assignments],
  )

  const funnel = useMemo(() => {
    const by = (st: VolunteerProfile['onboardingStatus']) =>
      volunteers.filter((v) => v.onboardingStatus === st).length
    return {
      new: by('new'),
      contacted: by('contacted'),
      onboarding: by('onboarding'),
      ready: by('ready'),
      active: by('active'),
      paused: by('paused'),
    }
  }, [volunteers])

  const unfilledOpen = useMemo(
    () => assignments.filter((a) => a.status === 'open' && !a.volunteerId),
    [assignments],
  )

  const emergingLeaders = useMemo(() => {
    return volunteers
      .filter((v) => (v.leadershipPotential ?? 0) >= 60 && (v.reliabilityScore ?? 0) >= 55)
      .slice(0, 12)
  }, [volunteers])

  const recommendationContext: RecommendationContext | null = useMemo(() => {
    if (!roles.length || !volunteers.length) return null
    return {
      roles,
      volunteers,
      skillsByVolunteerId,
      trainingByVolunteerId: new Map(),
      assignments,
    }
  }, [roles, volunteers, skillsByVolunteerId, assignments])

  const reliabilityPreview = useMemo(() => {
    return volunteers.map((v) => ({
      volunteer: v,
      category: categorizeVolunteerReliability({ volunteer: v, assignments }),
      pipeline: volunteerToLeaderPipelineStage(v),
    }))
  }, [volunteers, assignments])

  const reminderSummary = useMemo(() => summarizeReminderBacklog(reminders), [reminders])

  const agentJonesVolunteerThroughput = useMemo(
    () =>
      !enabled
        ? null
        : buildAgentJonesVolunteerThroughputContext({
            campaignId,
            volunteers,
            assignments,
            reliability,
            reminders,
            assignmentReminders,
            coverageRows,
          }),
    [
      enabled,
      campaignId,
      volunteers,
      assignments,
      reliability,
      reminders,
      assignmentReminders,
      coverageRows,
    ],
  )

  return {
    loading,
    error,
    refetch: load,
    volunteers,
    assignments,
    shifts,
    slotsByShift,
    roles,
    reliability,
    reminders,
    assignmentReminders,
    coverageRows,
    funnel,
    unfilledOpen,
    emergingLeaders,
    recommendationContext,
    recommendForRole: (roleSlug: string) =>
      recommendationContext
        ? recommendVolunteersForRole(roleSlug, recommendationContext, 10)
        : [],
    reliabilityPreview,
    reminderSummary,
    agentJonesVolunteerThroughput,
  }
}
