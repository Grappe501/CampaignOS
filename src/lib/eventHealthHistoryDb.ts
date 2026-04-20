/**
 * Persistence for event health history snapshots (Supabase).
 */

import { supabase } from './supabaseClient'
import type { EventHealthScoreV2Result } from './eventHealthScoreV2'

export type EventHealthHistoryRow = {
  id: string
  event_id: string
  current_score: number
  prior_score: number | null
  score_change: number | null
  health_status: string
  trend: string | null
  created_at: string
}

export async function fetchLatestHealthScoreForEvent(eventId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('event_health_score_history')
    .select('current_score')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const n = Number((data as { current_score?: number }).current_score)
  return Number.isNaN(n) ? null : n
}

/** One prior score per event id (latest snapshot before “now”). */
export async function fetchLatestHealthScoresForEvents(
  eventIds: readonly string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!eventIds.length) return out

  const chunkSize = 80
  for (let i = 0; i < eventIds.length; i += chunkSize) {
    const chunk = [...eventIds.slice(i, i + chunkSize)]
    const { data, error } = await supabase
      .from('event_health_score_history')
      .select('event_id,current_score,created_at')
      .in('event_id', chunk)

    if (error || !data?.length) continue

    const best = new Map<string, { score: number; t: number }>()
    for (const row of data as { event_id: string; current_score: number; created_at: string }[]) {
      const t = new Date(row.created_at).getTime()
      const cur = best.get(row.event_id)
      if (!cur || t > cur.t) best.set(row.event_id, { score: Number(row.current_score), t })
    }
    for (const [eid, v] of best) out.set(eid, v.score)
  }
  return out
}

export async function insertEventHealthHistorySnapshot(input: {
  eventId: string
  result: EventHealthScoreV2Result
  changedFactors?: readonly string[]
}): Promise<{ error: Error | null }> {
  const r = input.result
  const { error } = await supabase.from('event_health_score_history').insert({
    event_id: input.eventId,
    current_score: r.current_score,
    prior_score: r.prior_score,
    score_change: r.score_change,
    health_status: r.health_status,
    trend: r.trend,
    components: {
      score_components: r.score_components,
      recommended_actions: r.recommended_actions.slice(0, 8),
    },
    reason_codes: r.reason_codes,
    changed_factors: [...(input.changedFactors ?? [])],
  })

  if (error) return { error: new Error(error.message) }
  return { error: null }
}
