/**
 * Deterministic after-action scoring from operational row + field signals (advisory).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { EventIntelligenceEnrichment } from './eventIntelligenceJones'
import type {
  AfterActionCategoryKey,
  AfterActionCategoryScore,
  AfterActionScoreResult,
} from './eventIntelligenceContracts'

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function cat(
  key: AfterActionCategoryKey,
  label: string,
  score: number,
  confidence: number,
  notes: string[],
): AfterActionCategoryScore {
  return { key, label, score: clamp(Math.round(score), 0, 100), confidence: clamp(confidence, 0, 1), notes }
}

export function computeAfterActionScore(
  record: CampaignCalendarEventRecord,
  enrichment: EventIntelligenceEnrichment | null,
): AfterActionScoreResult {
  const isComplete = record.operational_status === 'completed'
  const attendance = enrichment?.attendanceCount ?? 0
  const pendingFu =
    enrichment?.followups.filter((f) => f.status === 'pending' || f.status === 'open' || f.status === 'in_progress')
      .length ?? 0
  const totalFu = enrichment?.followups.length ?? 0

  const readiness = record.readiness_score != null ? Number(record.readiness_score) : null
  const stageOk = record.stage_status && record.stage_status !== 'draft'

  const documentation_warnings: string[] = []
  if (isComplete && attendance === 0) {
    documentation_warnings.push('Event marked complete but no attendance rows — score downgraded.')
  }
  if (isComplete && totalFu > 0 && pendingFu / Math.max(1, totalFu) > 0.4) {
    documentation_warnings.push('Follow-up queue still heavily open post-completion.')
  }
  if (!record.notes?.trim() && isComplete) {
    documentation_warnings.push('No coordinator notes on record — capture lessons while memory is fresh.')
  }

  const planning = 55 + (stageOk ? 18 : 0) + (readiness != null ? readiness * 0.15 : 0)
  const staffing = 50 + (record.staffing_state === 'staffed' ? 28 : record.staffing_state === 'partially_staffed' ? 14 : 0)
  const communications = 48 + (record.public_title?.trim() ? 10 : 0) + (record.public_description?.trim() ? 8 : 0)
  const execution = isComplete ? 72 : 45
  const logistics = 50 + (record.venue_name || record.address_or_virtual ? 22 : 0)
  const followup = clamp(100 - pendingFu * 12 - (enrichment?.issueFlagsRaised ? 6 : 0), 25, 95)
  const impact = 45 + clamp((record.volunteer_outcome ?? 0) * 0.35, 0, 35) + (attendance > 0 ? 12 : 0)
  const mediaDocs =
    50 +
    (attendance > 0 ? 12 : 0) +
    (enrichment && enrichment.followups.length >= 3 ? 10 : 0) -
    (documentation_warnings.length ? 12 : 0)

  const categories: AfterActionCategoryScore[] = [
    cat('planning', 'Planning', planning, stageOk && readiness != null ? 0.75 : 0.45, [
      stageOk ? 'Lifecycle beyond draft' : 'Still in draft lifecycle',
    ]),
    cat('staffing', 'Staffing', staffing, record.staffing_state ? 0.7 : 0.35, [
      `Staffing state: ${record.staffing_state ?? 'unknown'}`,
    ]),
    cat('communications', 'Communications', communications, record.mobilize_publish_state === 'published' ? 0.8 : 0.45, [
      record.mobilize_publish_state ? `Mobilize: ${record.mobilize_publish_state}` : 'Mobilize state unknown',
    ]),
    cat('execution', 'Execution', execution, isComplete ? 0.85 : 0.4, [isComplete ? 'Marked complete' : 'Not marked complete']),
    cat('logistics', 'Logistics', logistics, record.venue_name || record.address_or_virtual ? 0.7 : 0.4, [
      record.venue_name ? 'Venue present' : 'Venue not set',
    ]),
    cat('followup', 'Follow-up', followup, totalFu > 0 ? 0.75 : 0.35, [`${pendingFu} follow-up items still open`]),
    cat('impact', 'Impact / turnout proxy', impact, attendance > 0 || record.volunteer_outcome != null ? 0.65 : 0.3, [
      `Attendance rows: ${attendance}`,
    ]),
    cat(
      'media_docs',
      'Media & documentation',
      mediaDocs,
      attendance > 0 && documentation_warnings.length === 0 ? 0.7 : 0.45,
      documentation_warnings,
    ),
  ]

  const completeness =
    categories.reduce((acc, c) => acc + c.confidence, 0) / Math.max(1, categories.length)
  const overall_score = clamp(
    Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length) -
      documentation_warnings.length * 4,
    0,
    100,
  )

  const strengths: string[] = []
  const failures: string[] = []
  if (staffing >= 75) strengths.push('Staffing posture looked healthy at close.')
  if (followup >= 75) strengths.push('Follow-up queue under control relative to peers.')
  if (planning < 62) failures.push('Planning evidence thin — tighten stage gates next time.')
  if (media_docs < 58) failures.push('Documentation / capture trailed execution — tighten media + signup discipline.')

  return {
    overall_score,
    completeness,
    categories,
    strengths,
    failures,
    missed_opportunities:
      attendance === 0 && isComplete ? ['No attendance captured — missed turnout proof.'] : [],
    follow_up_required: pendingFu > 0 ? [`${pendingFu} follow-ups still need owners or completion.`] : [],
    lessons_to_preserve: strengths.slice(0, 3),
    documentation_warnings,
  }
}
