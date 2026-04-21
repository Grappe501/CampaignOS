import { describe, expect, it } from 'vitest'
import { buildCampaignMessageFramework } from './messageFramework'
import {
  rankTalkingPointsForContext,
  selectScriptsForContext,
  buildFrameworkExcerptForDraft,
} from './messageTargeting'

describe('messageTargeting', () => {
  const fw = buildCampaignMessageFramework()

  it('ranks turnout segment toward democracy pillar', () => {
    const ranked = rankTalkingPointsForContext(fw, { segment: 'turnout' })
    expect(ranked[0]?.point.pillar_key).toBe('democracy_for_people')
  })

  it('selects phone scripts for phone_bank event', () => {
    const scripts = selectScriptsForContext(fw, { event_type: 'phone_bank' })
    expect(scripts.some((s) => s.channel === 'phone')).toBe(true)
  })

  it('buildFrameworkExcerptForDraft stays JSON-serializable', () => {
    const ex = buildFrameworkExcerptForDraft(fw, { segment: 'persuadable', channel: 'canvass' })
    expect(typeof ex.version).toBe('string')
    expect(Array.isArray(ex.targeted_talking_points)).toBe(true)
  })
})
