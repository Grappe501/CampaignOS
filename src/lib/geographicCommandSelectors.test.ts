import { describe, expect, it } from 'vitest'
import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { buildCountyCommandRollups, eventStartsInForwardWindow } from './geographicCommandSelectors'
import { rankGeographicInterventionCandidates } from './geographicCommandMetrics'

function baseRecord(partial: Partial<CampaignCalendarEventRecord>): CampaignCalendarEventRecord {
  const now = new Date('2026-06-01T12:00:00Z').getTime()
  return {
    event_id: partial.event_id ?? 'evt-test',
    title: partial.title ?? 'T',
    event_type: partial.event_type ?? 'canvass_launch',
    event_subtype: partial.event_subtype ?? null,
    stage_status: partial.stage_status ?? 'scheduled',
    start_at: partial.start_at ?? new Date(now + 86400000).toISOString(),
    end_at: partial.end_at ?? '',
    timezone: 'America/Chicago',
    venue_name: null,
    address_or_virtual: null,
    owner_user_id: null,
    owner_role: null,
    host_user_ids: [],
    county_id: partial.county_id ?? 'pulaski',
    precinct_id: partial.precinct_id ?? null,
    district_id: null,
    visibility_scope: 'public_visible',
    public_publish_state: null,
    mobilize_publish_state: partial.mobilize_publish_state ?? 'published',
    mobilize_event_id: null,
    mobilize_last_synced_at: null,
    mobilize_last_error: null,
    mobilize_public_url: null,
    mobilize_tags_synced: null,
    mobilize_sync_hash: null,
    mobilize_update_needed: null,
    staffing_state: partial.staffing_state ?? 'staffed',
    followup_state: partial.followup_state ?? null,
    finance_flag: false,
    candidate_flag: false,
    county_party_flag: false,
    notes: null,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    readiness_score: partial.readiness_score ?? 80,
    ...partial,
  }
}

describe('geographicCommandSelectors', () => {
  const nowMs = new Date('2026-06-01T12:00:00Z').getTime()

  it('eventStartsInForwardWindow respects canceled events', () => {
    const e = baseRecord({ stage_status: 'canceled', start_at: new Date(nowMs + 3600000).toISOString() })
    expect(eventStartsInForwardWindow(e, nowMs, 14)).toBe(false)
  })

  it('ranks counties by composite pressure', () => {
    const a = baseRecord({
      event_id: 'a',
      county_id: 'alpha',
      staffing_state: 'unstaffed',
      readiness_score: 30,
      mobilize_publish_state: 'eligible',
    })
    const b = baseRecord({
      event_id: 'b',
      county_id: 'beta',
      staffing_state: 'staffed',
      readiness_score: 90,
      start_at: new Date(nowMs + 2 * 86400000).toISOString(),
    })
    const rollups = buildCountyCommandRollups([a, b], nowMs, 14)
    const ranked = rankGeographicInterventionCandidates(rollups, 2)
    expect(ranked.length).toBe(2)
    expect(ranked[0].county_id).toBe('alpha')
  })
})
