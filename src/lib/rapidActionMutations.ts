/**
 * Rapid action execution — Supabase writes + readiness recompute + session audit.
 */

import { CAMPAIGN_EVENT_LIST_SELECT } from './campaignEventsColumns'
import { fetchCampaignEventById, approveCampaignEventRequestRpc, rejectCampaignEventRequestRpc } from './campaignEventsFromSupabase'
import { recomputeAndPersistEventReadiness } from './campaignEventReadinessPersistence'
import { isCampaignEventTypeKey } from './eventStaffingMatrix'
import { appendRapidActionAudit } from './rapidActionAudit'
import type { RapidActionType } from './rapidActionSchemas'
import { supabase } from './supabaseClient'

export type RapidActionMutationPayload = {
  staff_role_slug?: string | null
  assigned_display_name?: string | null
  /** When reassigning to another known profile */
  assigned_user_id?: string | null
  shift_label?: string | null
  /** Free text for notes-backed actions */
  body?: string | null
  /** Approve / reject */
  approval_notes?: string | null
  approval_conditions?: string | null
}

async function fetchRowForReadiness(eventId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('campaign_events')
    .select(CAMPAIGN_EVENT_LIST_SELECT)
    .eq('id', eventId)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as Record<string, unknown>
}

async function appendEventNote(eventId: string, line: string): Promise<{ error: Error | null }> {
  const { data, error } = await supabase.from('campaign_events').select('notes').eq('id', eventId).maybeSingle()
  if (error) return { error: new Error(error.message) }
  const prev = data && typeof (data as { notes?: string }).notes === 'string' ? String((data as { notes: string }).notes) : ''
  const stamp = new Date().toISOString()
  const next = `${prev}\n[RAPID_ACTION ${stamp}] ${line}`.trim()
  const { error: up } = await supabase.from('campaign_events').update({ notes: next }).eq('id', eventId)
  if (up) return { error: new Error(up.message) }
  return { error: null }
}

async function afterStaffingChange(eventId: string): Promise<void> {
  const row = await fetchRowForReadiness(eventId)
  if (!row) return
  const et = String(row.event_type ?? '')
  if (!isCampaignEventTypeKey(et)) return
  try {
    await recomputeAndPersistEventReadiness(eventId, { eventType: et, row })
  } catch {
    /* best-effort */
  }
}

export type RapidActionResult = { ok: boolean; message?: string; error?: string }

export async function executeRapidAction(input: {
  action: RapidActionType
  eventId: string | null
  approvalEventId?: string | null
  initiatedByProfileId: string | null
  payload?: RapidActionMutationPayload
}): Promise<RapidActionResult> {
  const { action, initiatedByProfileId } = input
  const eid = input.eventId ?? input.approvalEventId ?? null

  const auditOk = (summary: string, affected: { table: string; id?: string; event_id?: string }[]) => {
    appendRapidActionAudit({
      action_type: action,
      initiated_by: initiatedByProfileId,
      affected_records: affected,
      state_delta_summary: summary,
      ok: true,
    })
  }

  const auditFail = (err: string) => {
    appendRapidActionAudit({
      action_type: action,
      initiated_by: initiatedByProfileId,
      affected_records: [],
      state_delta_summary: null,
      ok: false,
      error_message: err,
    })
  }

  try {
    switch (action) {
      case 'reassign_volunteer_to_role': {
        if (!eid) return { ok: false, error: 'Missing event' }
        const slug = String(input.payload?.staff_role_slug ?? '').trim()
        const name = String(input.payload?.assigned_display_name ?? '').trim()
        if (!slug) return { ok: false, error: 'Role required' }
        const uid = input.payload?.assigned_user_id?.trim() || null
        const { data: rows, error: qErr } = await supabase
          .from('campaign_event_staffing_assignments')
          .select('id')
          .eq('event_id', eid)
          .eq('staff_role_slug', slug)
          .limit(1)
        if (qErr || !rows?.length) return { ok: false, error: qErr?.message ?? 'No row to update' }
        const id = String((rows[0] as { id: string }).id)
        const patch: Record<string, unknown> = {}
        if (name) patch.assigned_display_name = name
        if (uid !== undefined) patch.assigned_user_id = uid
        if (name || uid) patch.status = 'invited'
        const { error: uErr } = await supabase.from('campaign_event_staffing_assignments').update(patch).eq('id', id)
        if (uErr) return { ok: false, error: uErr.message }
        await afterStaffingChange(eid)
        auditOk('reassign staffing', [{ table: 'campaign_event_staffing_assignments', id, event_id: eid }])
        return { ok: true, message: 'Reassigned' }
      }

      case 'confirm_provisional_coverage': {
        if (!eid) return { ok: false, error: 'Missing event' }
        const slug = String(input.payload?.staff_role_slug ?? '').trim()
        if (!slug) return { ok: false, error: 'Role required' }
        const { error } = await supabase
          .from('campaign_event_staffing_assignments')
          .update({ status: 'confirmed' })
          .eq('event_id', eid)
          .eq('staff_role_slug', slug)
          .eq('status', 'invited')
        if (error) return { ok: false, error: error.message }
        await afterStaffingChange(eid)
        auditOk('confirm coverage', [{ table: 'campaign_event_staffing_assignments', event_id: eid }])
        return { ok: true, message: 'Confirmed' }
      }

      case 'assign_volunteer_to_role':
      case 'create_assignment': {
        if (!eid) return { ok: false, error: 'Missing event' }
        const slug = String(input.payload?.staff_role_slug ?? '').trim()
        const name = String(input.payload?.assigned_display_name ?? '').trim()
        if (!slug || !name) return { ok: false, error: 'Role and display name required' }
        const { error, data } = await supabase
          .from('campaign_event_staffing_assignments')
          .insert({
            event_id: eid,
            staff_role_slug: slug,
            assigned_display_name: name,
            assigned_user_id: null,
            status: 'invited',
          })
          .select('id')
          .maybeSingle()
        if (error) return { ok: false, error: error.message }
        await afterStaffingChange(eid)
        auditOk('insert staffing assignment', [
          { table: 'campaign_event_staffing_assignments', id: data ? String((data as { id: string }).id) : undefined, event_id: eid },
        ])
        return { ok: true, message: 'Assignment saved' }
      }

      case 'create_shift_slot': {
        if (!eid) return { ok: false, error: 'Missing event' }
        const slug = String(input.payload?.staff_role_slug ?? '').trim()
        const label = String(input.payload?.shift_label ?? input.payload?.body ?? '').trim()
        const name = String(input.payload?.assigned_display_name ?? 'Shift slot').trim()
        if (!slug || !label) return { ok: false, error: 'Role and shift label required' }
        const { error, data } = await supabase
          .from('campaign_event_staffing_assignments')
          .insert({
            event_id: eid,
            staff_role_slug: slug,
            assigned_display_name: name,
            shift_label: label,
            status: 'invited',
          })
          .select('id')
          .maybeSingle()
        if (error) return { ok: false, error: error.message }
        await afterStaffingChange(eid)
        auditOk('insert shift staffing row', [{ table: 'campaign_event_staffing_assignments', id: data ? String((data as { id: string }).id) : undefined, event_id: eid }])
        return { ok: true, message: 'Shift saved' }
      }

      case 'create_backup_staffing_role': {
        if (!eid) return { ok: false, error: 'Missing event' }
        const slug = String(input.payload?.staff_role_slug ?? '').trim()
        if (!slug) return { ok: false, error: 'Role required' }
        const { error, data } = await supabase
          .from('campaign_event_staffing_assignments')
          .insert({
            event_id: eid,
            staff_role_slug: slug,
            assigned_display_name: 'Backup (open)',
            status: 'invited',
          })
          .select('id')
          .maybeSingle()
        if (error) return { ok: false, error: error.message }
        await afterStaffingChange(eid)
        auditOk('backup staffing', [{ table: 'campaign_event_staffing_assignments', id: data ? String((data as { id: string }).id) : undefined, event_id: eid }])
        return { ok: true, message: 'Backup row added' }
      }

      case 'send_reminder':
      case 'resend_acknowledgment_request':
      case 'mark_issue_escalation':
      case 'request_changes':
      case 'add_communication_step':
      case 'mark_role_conditionally_covered':
      case 'create_note_risk_flag':
      case 'assign_issue_owner': {
        if (!eid) return { ok: false, error: 'Missing event' }
        const body =
          String(input.payload?.body ?? '').trim() ||
          `${action.replace(/_/g, ' ')} — operator intent`
        const { error } = await appendEventNote(eid, `${action}: ${body}`)
        if (error) return { ok: false, error: error.message }
        auditOk('notes append', [{ table: 'campaign_events', event_id: eid }])
        return { ok: true, message: 'Recorded' }
      }

      case 'generate_followup_task':
      case 'add_missing_asset_task':
      case 'duplicate_event_workflow_step': {
        if (!eid) return { ok: false, error: 'Missing event' }
        const title =
          String(input.payload?.body ?? '').trim() ||
          (action === 'add_missing_asset_task' ? 'Bring missing asset / collateral' : 'Follow-up task')
        const slug = `rapid_${Date.now().toString(36)}`
        const { error } = await supabase.from('campaign_event_task_instances').insert({
          event_id: eid,
          template_slug: slug,
          title:
            action === 'duplicate_event_workflow_step'
              ? `Duplicate: ${title}`
              : title,
          description: 'Created from Rapid Actions',
          stage_slug: 'ops',
          required: true,
          is_critical: false,
          owner_role: 'coordinator',
          status: 'pending',
        })
        if (error) return { ok: false, error: error.message }
        await afterStaffingChange(eid)
        auditOk('insert task', [{ table: 'campaign_event_task_instances', event_id: eid }])
        return { ok: true, message: 'Task created' }
      }

      case 'approve_request': {
        const aid = input.approvalEventId ?? eid
        if (!aid) return { ok: false, error: 'Missing approval event' }
        const { error } = await approveCampaignEventRequestRpc(
          aid,
          input.payload?.approval_notes ?? null,
          input.payload?.approval_conditions ?? null,
        )
        if (error) return { ok: false, error: error.message }
        await afterStaffingChange(aid)
        auditOk('approve request', [{ table: 'campaign_events', event_id: aid }])
        return { ok: true, message: 'Approved' }
      }

      case 'reject_request': {
        const aid = input.approvalEventId ?? eid
        if (!aid) return { ok: false, error: 'Missing approval event' }
        const { error } = await rejectCampaignEventRequestRpc(aid, input.payload?.approval_notes ?? null)
        if (error) return { ok: false, error: error.message }
        auditOk('reject request', [{ table: 'campaign_events', event_id: aid }])
        return { ok: true, message: 'Rejected' }
      }

      case 'convert_gap_to_marketplace_opportunity': {
        if (!eid) return { ok: false, error: 'Missing event' }
        const slug = String(input.payload?.staff_role_slug ?? '').trim()
        if (!slug) return { ok: false, error: 'Role required' }
        const { data: asg, error: insErr } = await supabase
          .from('campaign_event_staffing_assignments')
          .insert({
            event_id: eid,
            staff_role_slug: slug,
            assigned_display_name: 'Open (marketplace)',
            assigned_user_id: null,
            status: 'invited',
          })
          .select('id')
          .single()
        if (insErr || !asg) return { ok: false, error: insErr?.message ?? 'assignment insert failed' }
        const assignmentId = String((asg as { id: string }).id)
        const { event } = await fetchCampaignEventById(eid)
        const title = event ? `${event.title} — ${slug.replace(/_/g, ' ')}` : `Staffing — ${slug}`
        const { error: opErr } = await supabase.from('volunteer_opportunities').insert({
          campaign_id: event?.campaign_id ?? 'default',
          source_type: 'staffing_requirement',
          source_id: assignmentId,
          title,
          description: 'Coordinator published this staffing gap to the marketplace.',
          role_slug: null,
          event_id: eid,
          staffing_requirement_id: assignmentId,
          opportunity_type: 'staffing',
          category: 'field',
          commitment_type: 'task',
          quantity_open: 1,
          quantity_filled: 0,
          priority: 'high',
          status: 'open',
          visibility_scope: 'campaign',
        })
        if (opErr) {
          return { ok: false, error: opErr.message }
        }
        await afterStaffingChange(eid)
        auditOk('marketplace opportunity', [
          { table: 'volunteer_opportunities', id: assignmentId, event_id: eid },
        ])
        return { ok: true, message: 'Opportunity created' }
      }

      case 'regenerate_recommendations': {
        auditOk('client refresh only', [])
        return { ok: true, message: 'Refreshed' }
      }

      case 'fill_open_staffing_gap':
      case 'open_event_playbook':
      case 'launch_quick_outreach_flow':
      case 'navigate_staffing_section':
      case 'navigate_readiness_section': {
        auditOk('navigation-only', eid ? [{ table: 'campaign_events', event_id: eid }] : [])
        return { ok: true, message: 'OK' }
      }

      default: {
        auditFail('unsupported action')
        return { ok: false, error: 'Unsupported action' }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    auditFail(msg)
    return { ok: false, error: msg }
  }
}
