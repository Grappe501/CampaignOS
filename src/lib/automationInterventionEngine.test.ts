import { describe, expect, it } from 'vitest'
import { interventionsFromTriggers } from './automationInterventionEngine'
import type { AutomationTriggerFiring } from './automationDomain'

describe('automationInterventionEngine', () => {
  it('maps approval backlog to approval_request intervention', () => {
    const firing: AutomationTriggerFiring = {
      trigger_type: 'approval_queue_backlog',
      dedupe_key: 'x',
      severity: 'watch',
      confidence: 'high',
      title: 'Backlog',
      explanation: 'Test',
      owner_role_hint: 'event_coordinator',
      target_type: 'campaign',
      target_id: null,
    }
    const [rec] = interventionsFromTriggers([firing])
    expect(rec.intervention_kind).toBe('approval_request')
    expect(rec.execution_mode).toBe('requires_approval')
    expect(rec.route_path).toContain('events')
  })
})
