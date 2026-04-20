import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNowMs } from './useNowMs'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import type { AgentJonesInternLayerContext } from '../lib/agentJonesContextV2'
import {
  ensureInternDailyLeadership,
  evaluateAllPipelinesForActor,
} from '../lib/internPipelineEngine'
import { supabase } from '../lib/supabaseClient'

export type PipelineRow = {
  id: string
  volunteer_profile_id: string
  status: string
  first_contact_due_at: string
  next_action_due_at: string | null
  attempt_count: number
  reassignment_count: number
  escalation_level: number
}

function isInternRole(role: string | null | undefined): boolean {
  return String(role ?? '').trim().toLowerCase() === 'intern'
}

export function useInternLayer(
  campaignProfileId: string | undefined,
  primaryRole: string | null | undefined,
) {
  const [pipelines, setPipelines] = useState<PipelineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nowMs = useNowMs()

  const enabled = Boolean(campaignProfileId) && isInternRole(primaryRole) && !isDevAuthBypassEnabled()

  const load = useCallback(async () => {
    if (!enabled || !campaignProfileId) {
      setPipelines([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    void (await evaluateAllPipelinesForActor())
    void (await ensureInternDailyLeadership(campaignProfileId))
    const { data, err } = await supabase
      .from('volunteer_contact_pipeline')
      .select(
        'id, volunteer_profile_id, status, first_contact_due_at, next_action_due_at, attempt_count, reassignment_count, escalation_level',
      )
      .eq('current_intern_profile_id', campaignProfileId)
      .in('status', ['pending', 'contacted'])
      .order('first_contact_due_at', { ascending: true })
    if (err) setError(err.message)
    setPipelines((data ?? []) as PipelineRow[])
    setLoading(false)
  }, [campaignProfileId, enabled])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const overdueCount = useMemo(() => {
    return pipelines.filter((p) => {
      if (p.status !== 'pending') return false
      const due = new Date(p.first_contact_due_at).getTime()
      return Number.isFinite(due) && nowMs > due
    }).length
  }, [pipelines, nowMs])

  const agentInternContext: AgentJonesInternLayerContext | null = useMemo(() => {
    if (!enabled) return null
    const next = pipelines[0]
    return {
      assigned_pipeline_count: pipelines.length,
      overdue_first_contact_count: overdueCount,
      next_follow_up_hint: next
        ? `Next contact window: volunteer ${next.volunteer_profile_id.slice(0, 8)}… — status ${next.status}.`
        : null,
      leadership_task_title: null,
    }
  }, [enabled, pipelines, overdueCount])

  return {
    pipelines,
    loading,
    error,
    refetch: load,
    overdueCount,
    nowMs,
    agentInternContext,
    isIntern: enabled,
  }
}
