/**
 * Derive reliability metrics from persisted assignments and upsert summaries + volunteer score.
 */

import { mapAssignment, mapVolunteer } from './volunteerCommandApi'
import { supabase } from './supabaseClient'
import type { ReliabilityCategory, VolunteerAssignment, VolunteerProfile } from './volunteerCommandDomain'
import { categorizeVolunteerReliability, volunteerToLeaderPipelineStage } from './volunteerCommandReliability'

function leadershipSignalsFrom(volunteer: VolunteerProfile, category: ReliabilityCategory): string[] {
  const signals: string[] = []
  const lp = volunteer.leadershipPotential ?? 0
  const rel = volunteer.reliabilityScore ?? 0
  if (lp >= 70 && category === 'high_reliability') signals.push('team_lead_ready')
  if (lp >= 55 && ['high_reliability', 'steady'].includes(category)) signals.push('emerging_leader')
  if (lp >= 50 && rel >= 50) signals.push('trainer_candidate')
  return signals
}

/**
 * Recompute metrics from DB assignments, upsert volunteer_reliability_summaries, and mirror score on volunteers row.
 */
export async function recomputeAndPersistVolunteerReliability(volunteerId: string): Promise<{
  error: Error | null
}> {
  const { data: volRow, error: vErr } = await supabase
    .from('volunteers')
    .select('*')
    .eq('id', volunteerId)
    .maybeSingle()

  if (vErr) return { error: new Error(vErr.message) }
  if (!volRow) return { error: new Error('Volunteer not found') }

  const volunteer = mapVolunteer(volRow as Record<string, unknown>)

  const { data: asgRows, error: aErr } = await supabase
    .from('volunteer_assignments')
    .select('*')
    .eq('volunteer_id', volunteerId)

  if (aErr) return { error: new Error(aErr.message) }
  const assignments: VolunteerAssignment[] = (asgRows ?? []).map((r) =>
    mapAssignment(r as Record<string, unknown>),
  )

  const mine = assignments.filter((a) => a.volunteerId === volunteerId)
  const total = mine.length
  const completed = mine.filter((a) => a.status === 'completed').length
  const missed = mine.filter((a) => a.status === 'missed' || a.noShow).length
  const completionRate = total ? completed / total : null
  const noShowRate = total ? missed / total : null

  let claimRate: number | null = null
  const claimed = mine.filter((a) => a.claimedAt != null).length
  if (total) claimRate = claimed / total

  const responseHours: number[] = []
  for (const a of mine) {
    if (a.claimedAt && a.assignedAt) {
      const ms = new Date(a.claimedAt).getTime() - new Date(a.assignedAt).getTime()
      if (ms >= 0) responseHours.push(ms / 3600000)
    }
  }
  const avgResponseHours =
    responseHours.length > 0
      ? responseHours.reduce((s, x) => s + x, 0) / responseHours.length
      : null

  const category = categorizeVolunteerReliability({ volunteer, assignments })
  const pipeline = volunteerToLeaderPipelineStage(volunteer)
  const signals = leadershipSignalsFrom(volunteer, category)

  const scorePct =
    total === 0
      ? null
      : Math.round(
          Math.max(
            0,
            Math.min(
              100,
              (completionRate ?? 0) * 55 + (1 - (noShowRate ?? 0)) * 35 + (claimRate ?? 0.5) * 10,
            ),
          ),
        )

  const now = new Date().toISOString()

  const { error: u1 } = await supabase.from('volunteer_reliability_summaries').upsert(
    {
      volunteer_id: volunteerId,
      assignment_claim_rate: claimRate,
      assignment_completion_rate: completionRate,
      no_show_rate: noShowRate,
      avg_response_hours: avgResponseHours,
      retention_score: completionRate,
      activity_recency_days: null,
      reliability_category: category,
      pipeline_stage: pipeline,
      leadership_signals: signals,
      last_computed_at: now,
      updated_at: now,
    },
    { onConflict: 'volunteer_id' },
  )

  if (u1) return { error: new Error(u1.message) }

  if (scorePct != null) {
    const { error: u2 } = await supabase
      .from('volunteers')
      .update({ reliability_score: scorePct, updated_at: now })
      .eq('id', volunteerId)
    if (u2) return { error: new Error(u2.message) }
  }

  return { error: null }
}
