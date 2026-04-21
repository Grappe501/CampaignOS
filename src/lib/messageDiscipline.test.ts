import { describe, expect, it } from 'vitest'
import { buildCampaignMessageFramework } from './messageFramework'
import { evaluateMessageDiscipline, explainDisciplineReport } from './messageDiscipline'

describe('evaluateMessageDiscipline', () => {
  const fw = buildCampaignMessageFramework()

  it('flags drift watchlist phrases', () => {
    const r = evaluateMessageDiscipline(
      'This race is rigged election territory and we need to lock her up',
      fw,
    )
    expect(r.drift_flags.length).toBeGreaterThan(0)
    expect(r.score_0_100).toBeLessThan(50)
  })

  it('rewards pillar anchors', () => {
    const r = evaluateMessageDiscipline(
      'Chris focuses on jobs, schools, and health care for Arkansas families — will you make a plan to vote?',
      fw,
      ['jobs_local_economy'],
    )
    expect(r.pillars_represented).toContain('jobs_local_economy')
    expect(r.missing_required_pillars.length).toBe(0)
  })

  it('explainDisciplineReport returns lines', () => {
    const r = evaluateMessageDiscipline('Short', fw)
    const lines = explainDisciplineReport(r)
    expect(lines.length).toBeGreaterThan(0)
  })
})
