/**
 * Config-based Mobilize tag / publish defaults by CampaignOS event type (blueprint 12).
 */

import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'

export type MobilizeTagMapping = {
  eventTypeSlug: CampaignEventTypeKey | string
  defaultMobilizeTags: string[]
  optionalMobilizeTags?: string[]
  publishableByDefault: boolean
}

export const MOBILIZE_TAG_MAPPINGS: readonly MobilizeTagMapping[] = [
  {
    eventTypeSlug: 'public_fair_festival',
    defaultMobilizeTags: ['community-event', 'volunteer', 'public'],
    optionalMobilizeTags: ['canvass', 'visibility'],
    publishableByDefault: true,
  },
  {
    eventTypeSlug: 'house_party_intro_candidate',
    defaultMobilizeTags: ['meet-the-candidate', 'community'],
    optionalMobilizeTags: ['house-party'],
    publishableByDefault: true,
  },
  {
    eventTypeSlug: 'campaign_rally',
    defaultMobilizeTags: ['rally', 'public', 'volunteer'],
    optionalMobilizeTags: ['visibility'],
    publishableByDefault: true,
  },
  {
    eventTypeSlug: 'county_party_meeting',
    defaultMobilizeTags: ['party-meeting', 'community'],
    optionalMobilizeTags: ['county'],
    publishableByDefault: true,
  },
  {
    eventTypeSlug: 'house_party_fundraising',
    defaultMobilizeTags: [],
    optionalMobilizeTags: ['fundraiser'],
    publishableByDefault: false,
  },
  {
    eventTypeSlug: 'lunch_meeting',
    defaultMobilizeTags: [],
    optionalMobilizeTags: ['stakeholder'],
    publishableByDefault: false,
  },
  {
    eventTypeSlug: 'coffee_meeting',
    defaultMobilizeTags: [],
    optionalMobilizeTags: ['volunteer', 'meetup'],
    publishableByDefault: false,
  },
]

export function getMobilizeTagMapping(
  eventTypeSlug: string,
): MobilizeTagMapping | undefined {
  return MOBILIZE_TAG_MAPPINGS.find((m) => m.eventTypeSlug === eventTypeSlug)
}

/** Default + optional tags when the row does not carry server-synced tag mirrors yet. */
export function resolveMobilizeTagsForEventType(eventTypeSlug: string): string[] {
  const m = getMobilizeTagMapping(eventTypeSlug)
  if (!m) return []
  const opt = m.optionalMobilizeTags ?? []
  return [...new Set([...m.defaultMobilizeTags, ...opt.slice(0, 2)])]
}
