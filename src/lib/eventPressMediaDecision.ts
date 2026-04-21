/**
 * Deterministic press / media treatment level from event truth (+ similar intel optional).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import type { PressMediaRecommendation } from './eventCommsModels'
import { isEventCompleteForComms } from './eventCommsLifecycle'

function isPublicVisibility(v: string | null | undefined): boolean {
  const s = String(v ?? '').toLowerCase()
  return s.includes('public') || s.includes('volunteer_visible')
}

export function recommendPressMediaTreatment(input: {
  record: CampaignCalendarEventRecord
  eventType: CampaignEventTypeKey
  similarCompletedPressHeavy?: boolean
}): PressMediaRecommendation {
  const { record, eventType, similarCompletedPressHeavy } = input
  const pub = isPublicVisibility(record.visibility_scope)
  const strategic =
    record.candidate_flag ||
    record.finance_flag ||
    eventType === 'campaign_rally' ||
    eventType === 'early_vote_rally' ||
    eventType === 'public_fair_festival'

  let press_level: PressMediaRecommendation['press_level'] = 'none'
  let priority: PressMediaRecommendation['priority'] = 'low'
  const reasons: string[] = []

  if (!record.start_at?.trim()) {
    reasons.push('Add a confirmed start time so media windows and advisories can be planned.')
  }
  if (record.event_objective?.trim()) {
    reasons.push(`Objective on file: ${record.event_objective.trim().slice(0, 160)}`)
  }
  if (record.venue_name?.trim() || record.address_or_virtual?.trim()) {
    const loc = [record.venue_name, record.address_or_virtual].filter(Boolean).join(' · ')
    reasons.push(`Location context: ${loc.slice(0, 200)}`)
  }

  if (!pub && record.stage_status !== 'approved') {
    reasons.push('Visibility is not broad public — keep earned media minimal unless leadership expands scope.')
  }
  if (strategic && pub) {
    press_level = 'full_package'
    priority = 'high'
    reasons.push('Public + strategic markers — plan advisory, release, and social proof.')
  } else if (pub && (eventType === 'community_listening_session' || eventType === 'county_party_meeting')) {
    press_level = 'advisory'
    priority = 'medium'
    reasons.push('Community-facing — local advisory and targeted pitches.')
  } else if (pub) {
    press_level = 'local'
    priority = 'medium'
    reasons.push('Public event — local digital promotion and targeted outreach.')
  } else {
    press_level = 'none'
    reasons.push('Restricted visibility — skip formal wire/track press unless strategy expands.')
  }

  if (similarCompletedPressHeavy) {
    reasons.push('Similar events in this program used strengthened press — match or exceed that bar.')
    if (press_level === 'none') press_level = 'local'
  }

  if (isEventCompleteForComms(record)) {
    reasons.push('Event marked complete — pivot to recap + press follow-up if applicable.')
  }

  const suggested_next_step =
    press_level === 'full_package'
      ? 'Draft media advisory + press release; align with comms lead before external send.'
      : press_level === 'advisory'
        ? 'Prepare media advisory + reporter shortlist; skip full release unless earned interest.'
        : press_level === 'local'
          ? 'Digital promo package + optional local blogger outreach.'
          : 'Keep communications on owned channels unless strategy changes.'

  return {
    press_level,
    priority,
    owner_role: 'communications_lead',
    recommendation_reason: reasons.join(' '),
    suggested_next_step,
  }
}
