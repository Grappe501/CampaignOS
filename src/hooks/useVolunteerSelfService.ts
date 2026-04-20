import { useCallback, useEffect, useState } from 'react'
import {
  claimAssignment,
  fetchAssignmentsForVolunteer,
  fetchOpenAssignments,
  fetchTrainingForVolunteer,
  fetchVolunteerByProfileId,
  updateAssignmentStatus,
  upsertVolunteerForProfile,
} from '../lib/volunteerCommandApi'
import { recomputeAndPersistVolunteerReliability } from '../lib/volunteerCommandReliabilityCompute'
import type { VolunteerAssignment, VolunteerProfile, VolunteerTrainingRecord } from '../lib/volunteerCommandDomain'

export function useVolunteerSelfService(profileId: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null)
  const [mine, setMine] = useState<VolunteerAssignment[]>([])
  const [openPool, setOpenPool] = useState<VolunteerAssignment[]>([])
  const [training, setTraining] = useState<VolunteerTrainingRecord[]>([])

  const load = useCallback(async () => {
    if (!profileId) {
      setVolunteer(null)
      setMine([])
      setOpenPool([])
      setTraining([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { volunteer: v, error: ve } = await fetchVolunteerByProfileId(profileId)
      if (ve) throw ve
      setVolunteer(v)
      if (v) {
        const [asg, tr, open] = await Promise.all([
          fetchAssignmentsForVolunteer(v.id),
          fetchTrainingForVolunteer(v.id),
          fetchOpenAssignments(v.campaignId),
        ])
        setMine(asg)
        setTraining(tr)
        setOpenPool(open)
      } else {
        const open = await fetchOpenAssignments('default')
        setOpenPool(open)
        setMine([])
        setTraining([])
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Load failed'))
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void load()
  }, [load])

  const ensureProfile = useCallback(async () => {
    if (!profileId) return { error: new Error('No profile') }
    const { volunteer: v, error: err } = await upsertVolunteerForProfile({ profileId })
    if (err) return { error: err }
    setVolunteer(v)
    await load()
    return { error: null }
  }, [profileId, load])

  const claim = useCallback(
    async (assignmentId: string) => {
      if (!volunteer) return { error: new Error('Create your volunteer profile first') }
      const { error: err } = await claimAssignment(assignmentId, volunteer.id)
      if (err) return { error: err }
      await recomputeAndPersistVolunteerReliability(volunteer.id)
      await load()
      return { error: null }
    },
    [volunteer, load],
  )

  const complete = useCallback(
    async (assignmentId: string, notes?: string) => {
      if (!volunteer) return { error: new Error('No volunteer profile') }
      const { error: err } = await updateAssignmentStatus(assignmentId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completionNotes: notes ?? null,
      })
      if (err) return { error: err }
      await recomputeAndPersistVolunteerReliability(volunteer.id)
      await load()
      return { error: null }
    },
    [load, volunteer],
  )

  const decline = useCallback(
    async (assignmentId: string, reason: string) => {
      if (!volunteer) return { error: new Error('No volunteer profile') }
      const { error: err } = await updateAssignmentStatus(assignmentId, {
        status: 'declined',
        declined: true,
        declineReason: reason,
      })
      if (err) return { error: err }
      await recomputeAndPersistVolunteerReliability(volunteer.id)
      await load()
      return { error: null }
    },
    [load, volunteer],
  )

  return {
    loading,
    error,
    refetch: load,
    volunteer,
    mine,
    openPool,
    training,
    ensureProfile,
    claim,
    complete,
    decline,
  }
}
