import { describe, expect, it } from 'vitest'
import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { evaluateAutomationTriggers } from './automationRulesEngine'

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
    operational_status: partial.operational_status ?? null,
    approval_required: partial.approval_required ?? null,
    submitted_for_review_at: partial.submitted_for_review_at ?? null,
    last_operational_touch_at: partial.last_operational_touch_at ?? null,
    ...partial,
  }
}

describe('automationRulesEngine', () => {
  const nowMs = new Date('2026-06-01T12:00:00Z').getTime()

  it('returns empty when no events and empty maps', () => {
    const out = evaluateAutomationTriggers({
      nowMs,
      events: [],
      assignmentMap: new Map(),
      loadMap: new Map(),
    })
    expect(out).toEqual([])
  })

  it('emits approval_queue_backlog when three or more pending approvals', () => {
    const events = [1, 2, 3].map((i) =>
      baseRecord({
        event_id: `00000000-0000-4000-8000-${String(1000 + i).padStart(12, '0')}`,
        approval_required: true,
        operational_status: 'approval_needed',
      }),
    )
    const out = evaluateAutomationTriggers({
      nowMs,
      events,
      assignmentMap: new Map(),
      loadMap: new Map(),
    })
    const approval = out.find((x) => x.trigger_type === 'approval_queue_backlog')
    expect(approval).toBeDefined()
    expect(approval?.severity).toBe('watch')
  })
})
