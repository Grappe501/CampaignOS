import { describe, expect, it } from 'vitest'
import { computeGotvSiteReadiness } from './gotvReadiness'
import type { GotvPollingPlaceRow, GotvSiteShiftRow } from './gotvDomain'

function site(p: Partial<GotvPollingPlaceRow>): GotvPollingPlaceRow {
  return {
    id: p.id ?? 's1',
    campaign_id: 'default',
    site_kind: p.site_kind ?? 'polling_place',
    label: p.label ?? 'Test site',
    address_line: null,
    county_id: p.county_id ?? 'c1',
    precinct_id: null,
    city: null,
    zone_key: null,
    importance: p.importance ?? 50,
    status: 'active',
    metadata: {},
    created_at: '',
    updated_at: '',
  }
}

describe('gotvReadiness', () => {
  it('penalizes missing captain when captain shift exists', () => {
    const shifts: GotvSiteShiftRow[] = [
      {
        id: 'sh1',
        site_id: 's1',
        role_slug: 'captain',
        shift_start: new Date().toISOString(),
        shift_end: new Date(Date.now() + 3600000).toISOString(),
        slots_needed: 1,
        notes: null,
        status: 'open',
        created_at: '',
        updated_at: '',
      },
    ]
    const r = computeGotvSiteReadiness({
      site: site({ id: 's1' }),
      shifts,
      assignmentsByShiftId: new Map(),
      openIncidents: [],
      phase: 'election_day',
      phaseUrgency: 1,
    })
    expect(r.captain_assigned).toBe(false)
    expect(r.score_0_100).toBeLessThan(85)
    expect(r.primary_reasons.some((x) => x.includes('Captain'))).toBe(true)
  })
})
