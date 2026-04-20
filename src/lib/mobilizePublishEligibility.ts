/**
 * Publish eligibility for Mobilize (pass 3) — pure checks on the shared event model.
 * Maps policy lines in MOBILIZE_PUBLISH_ELIGIBILITY_RULES to pass/fail; no API calls.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import {
  MOBILIZE_PUBLISHABLE_EVENT_TYPE_KEYS,
  MOBILIZE_PUBLISH_ELIGIBILITY_RULES,
} from './mobilizeIntegration'

const APPROVED_LIKE = new Set([
  'approved',
  'scheduled',
  'published_internal',
  'published_public',
])

const PUBLIC_VISIBILITY_FOR_MOBILIZE = new Set([
  'public_visible',
  'volunteer_visible',
  'field_team',
])

const BLOCKED_VISIBILITY_FOR_MOBILIZE = new Set([
  'internal_staff',
  'leadership_only',
  'finance_private',
])

export type MobilizeEligibilityInput = {
  event_type: string
  stage_status: string | null
  visibility_scope: string | null
  title: string | null
  start_at: string | null
  venue_name: string | null
  address_or_virtual: string | null
  staffing_state: string | null
}

export type MobilizeEligibilityCheck = {
  ruleIndex: number
  ruleLabel: (typeof MOBILIZE_PUBLISH_ELIGIBILITY_RULES)[number]
  pass: boolean
  detail: string | null
}

export type MobilizeEligibilityResult = {
  checks: MobilizeEligibilityCheck[]
  eligible: boolean
  /** Human-readable blockers when eligible is false. */
  blockers: string[]
}

export function mobilizeEligibilityInputFromRecord(
  row: CampaignCalendarEventRecord,
): MobilizeEligibilityInput {
  return {
    event_type: row.event_type,
    stage_status: row.stage_status,
    visibility_scope: row.visibility_scope,
    title: row.title,
    start_at: row.start_at,
    venue_name: row.venue_name,
    address_or_virtual: row.address_or_virtual,
    staffing_state: row.staffing_state,
  }
}

function isPublishableTypeKey(t: string): t is CampaignEventTypeKey {
  return (MOBILIZE_PUBLISHABLE_EVENT_TYPE_KEYS as readonly string[]).includes(t)
}

function hasVenueOrAddress(input: MobilizeEligibilityInput): boolean {
  const v = (input.venue_name ?? '').trim()
  const a = (input.address_or_virtual ?? '').trim()
  if (a.length > 0) return true
  if (v.length > 0 && v.toUpperCase() !== 'TBD') return true
  return false
}

function validStart(input: MobilizeEligibilityInput): boolean {
  if (!input.start_at) return false
  return !Number.isNaN(new Date(input.start_at).getTime())
}

/**
 * Evaluate all six publish rules. Eligible only when every check passes.
 */
export function evaluateMobilizePublishEligibility(
  input: MobilizeEligibilityInput,
): MobilizeEligibilityResult {
  const checks: MobilizeEligibilityCheck[] = []

  const approved =
    input.stage_status != null && APPROVED_LIKE.has(input.stage_status)
  checks.push({
    ruleIndex: 0,
    ruleLabel: MOBILIZE_PUBLISH_ELIGIBILITY_RULES[0],
    pass: approved,
    detail: approved ? null : `Current stage: ${input.stage_status ?? 'unknown'}`,
  })

  const titleOk = (input.title ?? '').trim().length > 0
  const fieldsOk = titleOk && validStart(input)
  checks.push({
    ruleIndex: 1,
    ruleLabel: MOBILIZE_PUBLISH_ELIGIBILITY_RULES[1],
    pass: fieldsOk,
    detail: fieldsOk ? null : 'Title and valid start time are required public fields.',
  })

  const vis = input.visibility_scope ?? ''
  const visibilityOk =
    !BLOCKED_VISIBILITY_FOR_MOBILIZE.has(vis) &&
    (PUBLIC_VISIBILITY_FOR_MOBILIZE.has(vis) || vis === 'county_specific' || vis === 'precinct_specific')
  checks.push({
    ruleIndex: 2,
    ruleLabel: MOBILIZE_PUBLISH_ELIGIBILITY_RULES[2],
    pass: visibilityOk,
    detail: visibilityOk ? null : `Visibility “${vis || 'unset'}” is not treated as public-promotable.`,
  })

  const venueOk = validStart(input) && hasVenueOrAddress(input)
  checks.push({
    ruleIndex: 3,
    ruleLabel: MOBILIZE_PUBLISH_ELIGIBILITY_RULES[3],
    pass: venueOk,
    detail: venueOk ? null : 'Venue or address and start time must be present.',
  })

  const typeOk = isPublishableTypeKey(input.event_type)
  checks.push({
    ruleIndex: 4,
    ruleLabel: MOBILIZE_PUBLISH_ELIGIBILITY_RULES[4],
    pass: typeOk,
    detail: typeOk ? null : `Event type “${input.event_type}” is not in the default publishable set.`,
  })

  const staff = input.staffing_state ?? ''
  const staffingOk = staff !== 'unstaffed' && staff !== 'at_risk'
  checks.push({
    ruleIndex: 5,
    ruleLabel: MOBILIZE_PUBLISH_ELIGIBILITY_RULES[5],
    pass: staffingOk,
    detail: staffingOk
      ? null
      : `Staffing state “${staff || 'unset'}” needs resolution before public promotion.`,
  })

  const blockers = checks.filter((c) => !c.pass).map((c) => c.ruleLabel)
  return {
    checks,
    eligible: blockers.length === 0,
    blockers,
  }
}
