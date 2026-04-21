/**
 * Shared contract types for similar-event intelligence, briefings, and after-action learning.
 * Single operational vocabulary for event_id-linked features (no DB migration required for v1).
 */

export type EventSimilarityTier =
  | 'strong'
  | 'moderate'
  | 'loose'
  | 'comparison_useful'
  | 'high_performer'
  | 'low_performer'

export type SimilarEventMatch = {
  similar_event_id: string
  title: string
  start_at: string
  /** 0–100 relative match strength (deterministic heuristic). */
  score: number
  tier: EventSimilarityTier
  /** Human-readable reasons (grounded in row fields only). */
  similarity_reasons: string[]
  /** Short outcome label for staffing / ops comparison. */
  operational_status: string | null
  /** When present on the peer row — for “what worked” hints. */
  volunteer_outcome_hint: number | null
}

export type AfterActionCategoryKey =
  | 'planning'
  | 'staffing'
  | 'communications'
  | 'execution'
  | 'logistics'
  | 'followup'
  | 'impact'
  | 'media_docs'

export type AfterActionCategoryScore = {
  key: AfterActionCategoryKey
  label: string
  score: number
  /** 0–1 how much real data backed this score. */
  confidence: number
  notes: string[]
}

export type AfterActionScoreResult = {
  overall_score: number
  /** 0–1 aggregate data completeness for scoring. */
  completeness: number
  categories: AfterActionCategoryScore[]
  strengths: string[]
  failures: string[]
  missed_opportunities: string[]
  follow_up_required: string[]
  lessons_to_preserve: string[]
  /** Warnings when score looks good but capture is thin. */
  documentation_warnings: string[]
}

export type OperatorBriefingMode =
  | 'quick'
  | 'full'
  | 'day_of'
  | 'approval_review'
  | 'communications'
  | 'staffing'
  | 'debrief_handoff'

export type OperatorBriefingPack = {
  event_id: string
  mode: OperatorBriefingMode
  title: string
  purpose_line: string
  top_risks: string[]
  next_actions: string[]
  staffing_line: string
  comms_line: string
  logistics_line: string
  similar_lessons: string[]
  key_people: string[]
  timeline_pressure: string[]
  decision_points: string[]
  /** Concise digest for Today Command / headers. */
  one_liner: string
}

export type BriefingDelta = {
  /** Stable labels describing what moved (deterministic copy, not LLM). */
  changes: string[]
  risks_improved: string[]
  risks_worsened: string[]
}

export type SerializedBriefingSnapshot = {
  v: 1
  event_id: string
  captured_at_ms: number
  readiness_score: number | null
  gap_count: number
  staffing_state: string | null
  stage_status: string | null
  operational_status: string | null
  mobilize_state: string | null
}

export type LearningCaptureDraft = {
  event_id: string
  updated_at: string
  what_worked: string
  what_failed: string
  nearly_failed: string
  repeat_next_time: string
  change_next_time: string
  was_missing: string
  who_should_be_added: string
  comms_notes: string
  assets_notes: string
  followup_notes: string
  area_notes: string
  freeform: string
}
