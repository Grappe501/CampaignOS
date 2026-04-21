/**
 * Retrieval — deterministic similar-event ranking (no client embeddings).
 * Low scores are filtered to avoid flooding the orchestration layer with weak peers.
 */

import type { CampaignCalendarEventRecord } from '../campaignCalendarArchitecture'
import type { EventSimilarityTier, SimilarEventMatch } from '../eventIntelligenceContracts'
import { rankSimilarEvents } from '../similarEventIntelligenceService'
import type { EventAiRetrievalMatch } from './eventAiOrchestrationSchemas'
import { fingerprintText } from './eventAiEmbeddings'
import type { EventAiRetrievalContextV1 } from './eventAiOrchestrationSchemas'

/** Peers below this are treated as noise for orchestration (still visible in full desk lists). */
export const EVENT_AI_RETRIEVAL_MIN_SCORE = 34

/** Stricter line for “high-confidence” precedent in mesh headlines. */
export const EVENT_AI_RETRIEVAL_STRONG_SCORE = 52

export function usefulBecauseFromMatch(
  tier: EventSimilarityTier,
  score: number,
): string {
  if (tier === 'low_performer')
    return 'Cautionary precedent — review what went wrong before repeating.'
  if (tier === 'high_performer')
    return 'Strong outcome signal in a comparable footprint — borrow sequencing with judgment.'
  if (score >= EVENT_AI_RETRIEVAL_STRONG_SCORE) return 'Solid heuristic match on type, place, or timing.'
  if (score >= EVENT_AI_RETRIEVAL_MIN_SCORE) return 'Moderate match — use for contrast or secondary lessons, not as proof.'
  return 'Loose similarity — not enough to treat as precedent without manual review.'
}

function toMeshMatch(m: SimilarEventMatch): EventAiRetrievalMatch {
  let kind: EventAiRetrievalMatch['match_kind'] = 'analog'
  if (m.tier === 'low_performer') kind = 'warning'
  else if (m.tier === 'high_performer') kind = 'success_pattern'
  else if (m.score < EVENT_AI_RETRIEVAL_MIN_SCORE) kind = 'caution'

  return {
    id: `sim_${m.similar_event_id}`,
    peer_event_id: m.similar_event_id,
    label: m.title || m.similar_event_id,
    match_kind: kind,
    score_0_100: m.score,
    why_matched: m.similarity_reasons.slice(0, 6),
    useful_because: usefulBecauseFromMatch(m.tier, m.score),
  }
}

export function buildEventAiRetrievalContext(
  current: CampaignCalendarEventRecord,
  pool: readonly CampaignCalendarEventRecord[],
  limit = 5,
): EventAiRetrievalContextV1 {
  const poolOk = pool.filter((p) => p.event_id !== current.event_id)
  if (poolOk.length === 0) {
    return {
      v: 1,
      generated_at_ms: Date.now(),
      source_fingerprint: fingerprintText(`${current.event_id}|empty_pool|${current.start_at}`),
      match_summaries: [],
      fallback_note:
        'No other program events in session — deterministic peers require a broader calendar pool.',
    }
  }

  const rankedRaw = rankSimilarEvents(current, pool, Math.max(limit * 2, 8))
  const ranked = rankedRaw
    .map(toMeshMatch)
    .filter((m) => m.score_0_100 >= EVENT_AI_RETRIEVAL_MIN_SCORE || m.match_kind === 'warning')
    .slice(0, limit)

  let fallback_note: string | null = null
  if (ranked.length === 0) {
    fallback_note =
      rankedRaw.length > 0
        ? 'Similar events exist but none met the quality threshold — treat peer suggestions as loose only.'
        : 'No ranked peers for this footprint — expand date range or compare manually in the event desk.'
  }

  const fp = fingerprintText(
    `${current.event_id}|${current.event_type}|${current.start_at}|${ranked.map((r) => r.peer_event_id).join(',')}|${fallback_note ?? 'ok'}`,
  )

  return {
    v: 1,
    generated_at_ms: Date.now(),
    source_fingerprint: fp,
    match_summaries: ranked,
    fallback_note,
  }
}
