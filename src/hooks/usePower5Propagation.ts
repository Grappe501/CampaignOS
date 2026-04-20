import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { POWER5_RELAY_BATCH_MAX } from '../lib/power5TreeRules'
import type {
  Power5MessageAssignmentRow,
  Power5MessageCampaignRow,
} from '../lib/power5PropagationTypes'

export function usePower5Propagation(profileId: string | undefined) {
  const [campaigns, setCampaigns] = useState<Power5MessageCampaignRow[]>([])
  const [assignments, setAssignments] = useState<Power5MessageAssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    await Promise.resolve()
    if (!profileId) {
      setCampaigns([])
      setAssignments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const [c, a] = await Promise.all([
      supabase
        .from('power5_message_campaigns')
        .select('*')
        .eq('owner_profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('power5_message_assignments')
        .select('*')
        .eq('assignee_profile_id', profileId)
        .in('status', ['queued', 'prepared'])
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (c.error) setError(c.error.message)
    else setCampaigns((c.data ?? []) as Power5MessageCampaignRow[])
    if (a.error) setError(a.error.message)
    else setAssignments((a.data ?? []) as Power5MessageAssignmentRow[])
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      await load()
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  const openRelayCount = useMemo(() => assignments.length, [assignments])

  const createManualRelayCampaign = useCallback(async () => {
    if (!profileId) return null
    const { data, error: e } = await supabase
      .from('power5_message_campaigns')
      .insert({
        owner_profile_id: profileId,
        title: `Personal relay ${new Date().toLocaleDateString()}`,
        body_summary: 'Manual relay — you choose each conversation. No bulk send.',
        status: 'active',
      })
      .select('id')
      .single()
    if (e) throw e
    await load()
    return (data?.id as string) ?? null
  }, [profileId, load])

  const enqueueRelayForNodes = useCallback(
    async (campaignId: string, nodeIds: string[]) => {
      if (!profileId) return
      const slice = nodeIds.slice(0, POWER5_RELAY_BATCH_MAX)
      if (!slice.length) return
      const rows = slice.map((node_id) => ({
        campaign_id: campaignId,
        assignee_profile_id: profileId,
        node_id,
        status: 'queued' as const,
      }))
      const { error: e } = await supabase.from('power5_message_assignments').insert(rows)
      if (e) throw e
      await load()
    },
    [profileId, load],
  )

  const markAssignmentPrepared = useCallback(
    async (assignmentId: string) => {
      if (!profileId) return
      const { error: e } = await supabase
        .from('power5_message_assignments')
        .update({ status: 'prepared', updated_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .eq('assignee_profile_id', profileId)
      if (e) throw e
      await load()
    },
    [profileId, load],
  )

  const logManualDelivery = useCallback(
    async (assignmentId: string, note?: string) => {
      if (!profileId) return
      const { error: e1 } = await supabase.from('power5_message_delivery_events').insert({
        assignment_id: assignmentId,
        event_type: 'logged_touch',
        performed_by_profile_id: profileId,
        note: note?.slice(0, 2000) ?? null,
      })
      if (e1) throw e1
      const { error: e2 } = await supabase
        .from('power5_message_assignments')
        .update({ status: 'delivered_manually', updated_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .eq('assignee_profile_id', profileId)
      if (e2) throw e2
      await load()
    },
    [profileId, load],
  )

  return {
    campaigns,
    assignments,
    loading,
    error,
    reload: load,
    openRelayCount,
    createManualRelayCampaign,
    enqueueRelayForNodes,
    markAssignmentPrepared,
    logManualDelivery,
  }
}

export type Power5PropagationApi = ReturnType<typeof usePower5Propagation>
