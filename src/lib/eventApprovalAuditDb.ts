/**
 * Append-only approval audit trail (client-insert after coordinator actions).
 */

import { supabase } from './supabaseClient'

export type ApprovalAuditAction =
  | 'request_submitted'
  | 'note_added'
  | 'approved'
  | 'approved_with_conditions'
  | 'rejected'
  | 'revision_requested'
  | 'under_review'

export async function insertCampaignEventApprovalAudit(input: {
  eventId: string
  action: ApprovalAuditAction
  notes?: string | null
  metadata?: Record<string, unknown>
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('campaign_event_approval_audit').insert({
    event_id: input.eventId,
    actor_profile_id: null,
    action: input.action,
    notes: input.notes ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function fetchApprovalAuditLog(eventId: string): Promise<
  Array<{
    id: string
    action: string
    notes: string | null
    created_at: string
    metadata: Record<string, unknown>
  }>
> {
  const { data, error } = await supabase
    .from('campaign_event_approval_audit')
    .select('id,action,notes,created_at,metadata')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error || !data?.length) return []
  return data as Array<{
    id: string
    action: string
    notes: string | null
    created_at: string
    metadata: Record<string, unknown>
  }>
}
