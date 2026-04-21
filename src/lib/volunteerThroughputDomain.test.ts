import { describe, expect, it } from 'vitest'
import {
  canTransitionThroughput,
  mapAssignmentToThroughputStage,
  mapOnboardingToThroughputStage,
} from './volunteerThroughputDomain'

describe('volunteerThroughputDomain', () => {
  it('maps onboarding to stable stages', () => {
    expect(mapOnboardingToThroughputStage('new', 'active')).toBe('discovered')
    expect(mapOnboardingToThroughputStage('ready', 'active')).toBe('eligible')
    expect(mapOnboardingToThroughputStage('active', 'paused')).toBe('cooling_off')
  })

  it('maps assignment terminal states', () => {
    expect(mapAssignmentToThroughputStage('completed', {})).toBe('completed')
    expect(mapAssignmentToThroughputStage('missed', { noShow: true })).toBe('no_show')
    expect(mapAssignmentToThroughputStage('open', {})).toBe('eligible')
  })

  it('allows idempotent transitions', () => {
    expect(canTransitionThroughput('eligible', 'eligible')).toBe(true)
    expect(canTransitionThroughput('eligible', 'assigned')).toBe(true)
    expect(canTransitionThroughput('completed', 'discovered')).toBe(false)
  })
})
