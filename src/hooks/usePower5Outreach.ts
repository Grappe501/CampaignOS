import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type {
  OutreachActionKind,
  OutreachContactRow,
  OutreachEventType,
  UserConnectedAccountRow,
} from '../lib/outreachModel'

const SCAFFOLD_PLATFORMS = ['gmail', 'facebook', 'instagram', 'sms'] as const

async function seedScaffoldAccounts(profileId: string) {
  const { data: rows } = await supabase
    .from('user_connected_accounts')
    .select('platform')
    .eq('owner_profile_id', profileId)
  const have = new Set((rows ?? []).map((r) => r.platform))
  const inserts = SCAFFOLD_PLATFORMS.filter((p) => !have.has(p)).map((platform) => ({
    owner_profile_id: profileId,
    platform,
    connection_status: 'not_connected' as const,
  }))
  if (inserts.length) {
    await supabase.from('user_connected_accounts').insert(inserts)
  }
}

export function usePower5Outreach(profileId: string | undefined) {
  const [contactsByNode, setContactsByNode] = useState<Map<string, OutreachContactRow>>(
    new Map(),
  )
  const [accounts, setAccounts] = useState<UserConnectedAccountRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profileId) {
      setContactsByNode(new Map())
      setAccounts([])
      setLoading(false)
      return
    }
    await seedScaffoldAccounts(profileId)
    const [c, a] = await Promise.all([
      supabase.from('outreach_contacts').select('*').eq('owner_profile_id', profileId),
      supabase
        .from('user_connected_accounts')
        .select('*')
        .eq('owner_profile_id', profileId)
        .order('platform'),
    ])
    const cmap = new Map<string, OutreachContactRow>()
    if (!c.error && c.data) {
      for (const row of c.data as OutreachContactRow[]) {
        cmap.set(row.node_id, row)
      }
    }
    setContactsByNode(cmap)
    setAccounts((!a.error && a.data ? a.data : []) as UserConnectedAccountRow[])
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      await Promise.resolve()
      if (cancelled) return
      await load()
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  const syncContactsForNodes = useCallback(
    async (nodeIds: string[]) => {
      if (!profileId || nodeIds.length === 0) return
      const { data: rows } = await supabase
        .from('outreach_contacts')
        .select('node_id')
        .eq('owner_profile_id', profileId)
        .in('node_id', nodeIds)
      const have = new Set((rows ?? []).map((r) => r.node_id as string))
      const missing = nodeIds.filter((id) => !have.has(id))
      if (!missing.length) return
      const { error } = await supabase.from('outreach_contacts').insert(
        missing.map((node_id) => ({
          owner_profile_id: profileId,
          node_id,
        })),
      )
      if (!error) await load()
    },
    [profileId, load],
  )

  const logActivity = useCallback(
    async (params: {
      nodeId: string
      eventType: OutreachEventType
      channel?: string | null
      note?: string | null
      outreachActionId?: string | null
    }) => {
      if (!profileId) return
      const { error } = await supabase.from('outreach_activity_log').insert({
        owner_profile_id: profileId,
        node_id: params.nodeId,
        event_type: params.eventType,
        channel: params.channel ?? null,
        note: params.note ?? null,
        outreach_action_id: params.outreachActionId ?? null,
      })
      if (error) throw error

      const touch =
        params.eventType === 'message_sent' ||
        params.eventType === 'call_made' ||
        params.eventType === 'in_person' ||
        params.eventType === 'invitation_sent'
      if (touch) {
        await supabase
          .from('outreach_contacts')
          .update({
            last_contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('node_id', params.nodeId)
          .eq('owner_profile_id', profileId)
      }
      await load()
    },
    [profileId, load],
  )

  const createAction = useCallback(
    async (params: {
      nodeId: string
      kind: OutreachActionKind
      suggestedCopy: string | null
    }) => {
      if (!profileId) return null
      const { data, error } = await supabase
        .from('outreach_actions')
        .insert({
          owner_profile_id: profileId,
          node_id: params.nodeId,
          action_kind: params.kind,
          status: 'draft',
          suggested_copy: params.suggestedCopy,
        })
        .select('id')
        .single()
      if (error) throw error
      return (data?.id as string | undefined) ?? null
    },
    [profileId],
  )

  const updateAction = useCallback(
    async (
      actionId: string,
      patch: Partial<{
        status: string
        suggested_copy: string | null
        opened_platform: string | null
      }>,
    ) => {
      if (!profileId) return
      const { error } = await supabase
        .from('outreach_actions')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', actionId)
        .eq('owner_profile_id', profileId)
      if (error) throw error
    },
    [profileId],
  )

  const setAccountStatus = useCallback(
    async (
      platform: string,
      patch: Partial<{
        connection_status: string
        handle: string | null
        last_synced_at: string | null
      }>,
    ) => {
      if (!profileId) return
      const { error } = await supabase
        .from('user_connected_accounts')
        .update({
          ...patch,
          last_synced_at: patch.last_synced_at ?? new Date().toISOString(),
        })
        .eq('owner_profile_id', profileId)
        .eq('platform', platform)
      if (error) throw error
      await load()
    },
    [profileId, load],
  )

  const updateContactNotes = useCallback(
    async (nodeId: string, notes: string | null) => {
      if (!profileId) return
      const { error } = await supabase
        .from('outreach_contacts')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('node_id', nodeId)
        .eq('owner_profile_id', profileId)
      if (error) throw error
      await load()
    },
    [profileId, load],
  )

  return useMemo(
    () => ({
      contactsByNode,
      accounts,
      loading,
      reload: load,
      syncContactsForNodes,
      logActivity,
      createAction,
      updateAction,
      setAccountStatus,
      updateContactNotes,
    }),
    [
      contactsByNode,
      accounts,
      loading,
      load,
      syncContactsForNodes,
      logActivity,
      createAction,
      updateAction,
      setAccountStatus,
      updateContactNotes,
    ],
  )
}
