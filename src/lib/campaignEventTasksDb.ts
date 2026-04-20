/**
 * Persisted workflow tasks (`campaign_event_task_instances`).
 */

import { supabase } from './supabaseClient'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import { buildEventTaskInstances, type EventTaskInstance } from './eventTaskTemplateConfig'

export type DbEventTaskRow = {
  id: string
  event_id: string
  template_slug: string
  title: string
  stage_slug: string
  required: boolean
  is_critical: boolean
  owner_role: string
  status: string
  due_at: string | null
  dependency_slugs: string[] | null
}

function mapDbToInstance(row: Record<string, unknown>): DbEventTaskRow {
  const deps = row.dependency_slugs
  return {
    id: String(row.id ?? ''),
    event_id: String(row.event_id ?? ''),
    template_slug: String(row.template_slug ?? ''),
    title: String(row.title ?? ''),
    stage_slug: String(row.stage_slug ?? ''),
    required: Boolean(row.required),
    is_critical: row.is_critical !== false,
    owner_role: String(row.owner_role ?? ''),
    status: String(row.status ?? 'pending'),
    due_at: row.due_at != null ? String(row.due_at) : null,
    dependency_slugs: Array.isArray(deps) ? deps.map(String) : null,
  }
}

export async function fetchEventTaskRows(eventId: string): Promise<DbEventTaskRow[]> {
  const { data, error } = await supabase
    .from('campaign_event_task_instances')
    .select(
      'id,event_id,template_slug,title,stage_slug,required,is_critical,owner_role,status,due_at,dependency_slugs',
    )
    .eq('event_id', eventId)
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []).map((r) => mapDbToInstance(r as Record<string, unknown>))
}

export async function seedEventTasksIfEmpty(
  eventId: string,
  eventType: CampaignEventTypeKey,
  startAtIso: string,
): Promise<DbEventTaskRow[]> {
  const existing = await fetchEventTaskRows(eventId)
  if (existing.length > 0) return existing

  const templates = buildEventTaskInstances({
    event_id: eventId,
    start_at: startAtIso,
    event_type: eventType,
  })

  const rows = templates.map((t: EventTaskInstance) => ({
    event_id: eventId,
    template_slug: t.templateSlug,
    title: t.title,
    description: null,
    stage_slug: t.stage,
    required: t.required,
    is_critical: t.required,
    owner_role: t.ownerRole,
    assigned_user_id: null,
    status: 'pending',
    due_at: t.dueAtIso,
    dependency_slugs: t.dependencySlugs?.length ? t.dependencySlugs : null,
    completion_rule: t.completionRule ?? 'manual',
    completion_field_key: null,
    escalation_after_hours: t.escalationAfterHours ?? null,
    notes: null,
  }))

  const { data, error } = await supabase.from('campaign_event_task_instances').insert(rows).select(
    'id,event_id,template_slug,title,stage_slug,required,is_critical,owner_role,status,due_at,dependency_slugs',
  )

  if (error) throw error
  return (data ?? []).map((r) => mapDbToInstance(r as Record<string, unknown>))
}

export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'skipped',
  completedAtIso?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (status === 'completed' || status === 'skipped') {
    patch.completed_at = completedAtIso ?? new Date().toISOString()
  } else {
    patch.completed_at = null
    patch.completed_by_user_id = null
  }
  const { error } = await supabase.from('campaign_event_task_instances').update(patch).eq('id', taskId)
  if (error) throw error
}

export function completedTemplateSlugsFromRows(rows: DbEventTaskRow[]): Set<string> {
  const s = new Set<string>()
  for (const r of rows) {
    if (r.status === 'completed' || r.status === 'skipped') {
      s.add(r.template_slug)
    }
  }
  return s
}
