/**
 * Assembles and mutates the event communications workspace (deterministic core).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import { getCommsPlaybookSeed, buildPlanShellFromSeed } from './eventCommsPlaybooks'
import type {
  EventCommunicationPlan,
  EventCommunicationStep,
  EventCommunicationsWorkspace,
  CommsStepKind,
  CommsStepStatus,
} from './eventCommsModels'
import { recommendPressMediaTreatment } from './eventPressMediaDecision'
import { computeStepDueAtIso } from './eventCommsScheduling'

function stepTemplate(
  id: string,
  kind: CommsStepKind,
  label: string,
  channel: EventCommunicationStep['channel'],
  timing: string,
  owner: string,
): EventCommunicationStep {
  return {
    id,
    kind,
    label,
    channel,
    timing_hint: timing,
    owner_role: owner,
    status: 'pending',
    due_at: null,
    notes: '',
    linked_task_key: null,
  }
}

export function buildDefaultCommunicationSteps(eventType: CampaignEventTypeKey): EventCommunicationStep[] {
  void eventType // reserved for per-event-type step variants
  const owner = 'communications_lead'
  return [
    stepTemplate('st-ann', 'announcement_email', 'Announcement / save-the-date', 'email', '-21d', owner),
    stepTemplate('st-vol', 'volunteer_invite', 'Volunteer recruitment blast', 'email', '-14d', 'volunteer_coordinator'),
    stepTemplate('st-part', 'participant_reminder', 'Participant reminder', 'email', '-3d', owner),
    stepTemplate('st-int', 'internal_prep', 'Internal prep pack', 'email', '-5d', 'event_coordinator'),
    stepTemplate('st-dayb', 'day_before', 'Day-before reminder', 'sms', '-1d', owner),
    stepTemplate('st-dayo', 'day_of', 'Day-of push', 'sms', '0', owner),
    stepTemplate('st-thx', 'post_event_thanks', 'Thank-you send', 'email', '+1d', owner),
    stepTemplate('st-rec', 'recap_publish', 'Recap / amplification', 'social_facebook', '+2d', owner),
  ]
}

export function buildInitialCommunicationsWorkspace(
  record: CampaignCalendarEventRecord,
  effectiveType: CampaignEventTypeKey,
): EventCommunicationsWorkspace {
  const seed = getCommsPlaybookSeed(effectiveType)
  const shell = buildPlanShellFromSeed(record.event_id, record.event_type, seed)
  const rec = recommendPressMediaTreatment({
    record,
    eventType: effectiveType,
  })

  const plan: EventCommunicationPlan = {
    ...shell,
    steps: buildDefaultCommunicationSteps(effectiveType),
    press: {
      ...shell.press,
      target_level: rec.press_level,
    },
  }

  return {
    v: 1,
    event_id: record.event_id,
    updated_at: new Date().toISOString(),
    plan,
    drafts: [],
    media_library: [],
    audit: [
      {
        at: new Date().toISOString(),
        action: 'workspace_initialized',
        detail: `Playbook ${plan.playbook_id} · press hint ${rec.press_level}`,
      },
    ],
  }
}

/**
 * Recompute step due dates from `timing_hint` vs current `record.start_at`, and sync suggested press level.
 * Call after load and whenever the event start time changes so reminders do not orphan on stale dates.
 */
export function reconcileCommunicationsWorkspace(
  workspace: EventCommunicationsWorkspace,
  record: CampaignCalendarEventRecord,
  effectiveType: CampaignEventTypeKey,
): EventCommunicationsWorkspace {
  const rec = recommendPressMediaTreatment({ record, eventType: effectiveType })
  const startKey = record.start_at?.trim() ?? ''
  const startForCalc = startKey || null

  const steps = workspace.plan.steps.map((step) => ({
    ...step,
    due_at: computeStepDueAtIso(step.timing_hint, startForCalc),
  }))

  const nextPressLevel = rec.press_level
  const prevSnap = workspace.scheduling_meta?.last_reconciled_start_at ?? null
  const nextSnap = startKey || null
  const schedulingMetaChanged = prevSnap !== nextSnap

  let dueChanged = false
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].due_at !== workspace.plan.steps[i]?.due_at) {
      dueChanged = true
      break
    }
  }
  const pressChanged = workspace.plan.press.target_level !== nextPressLevel

  if (!schedulingMetaChanged && !dueChanged && !pressChanged) {
    return workspace
  }

  const audit = [...workspace.audit]
  const parts: string[] = []
  if (schedulingMetaChanged || dueChanged) parts.push(`schedule:${startKey || 'missing'}`)
  if (pressChanged) parts.push(`press:${nextPressLevel}`)
  if (parts.length) {
    audit.push({
      at: new Date().toISOString(),
      action: 'workspace_reconciled',
      detail: parts.join(' · '),
    })
  }

  return {
    ...workspace,
    updated_at: new Date().toISOString(),
    scheduling_meta: { last_reconciled_start_at: nextSnap },
    plan: {
      ...workspace.plan,
      steps,
      press: { ...workspace.plan.press, target_level: nextPressLevel },
    },
    audit: audit.slice(-80),
  }
}

export function updateStepStatus(
  workspace: EventCommunicationsWorkspace,
  stepId: string,
  status: CommsStepStatus,
  notes?: string,
): EventCommunicationsWorkspace {
  const steps = workspace.plan.steps.map((s) =>
    s.id === stepId
      ? {
          ...s,
          status,
          notes: notes !== undefined ? notes : s.notes,
        }
      : s,
  )
  return {
    ...workspace,
    updated_at: new Date().toISOString(),
    plan: { ...workspace.plan, steps },
    audit: [
      ...workspace.audit,
      { at: new Date().toISOString(), action: 'step_status', detail: `${stepId} → ${status}` },
    ].slice(-80),
  }
}

/** @deprecated Prefer `reconcileCommunicationsWorkspace` (includes press + scheduling). */
export function mergePressRecommendation(
  workspace: EventCommunicationsWorkspace,
  record: CampaignCalendarEventRecord,
  effectiveType: CampaignEventTypeKey,
): EventCommunicationsWorkspace {
  return reconcileCommunicationsWorkspace(workspace, record, effectiveType)
}
