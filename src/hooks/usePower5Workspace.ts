import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Power5RelationshipNodeRow } from '../lib/power5Model'

export type Power5ImpactRollup = {
  identified: number
  contacted: number
  activated: number
  matched: number
  total: number
}

const CONTACTED_KEYS = new Set([
  'first_contact',
  'contacted',
  'follow_up',
  'invited',
  'interested',
  'committed',
  'activated',
  'signed_up',
  'matched_voter',
  'active',
])

const ACTIVATED_KEYS = new Set([
  'committed',
  'activated',
  'signed_up',
  'matched_voter',
  'active',
])

function rollupImpact(nodes: Power5RelationshipNodeRow[]): Power5ImpactRollup {
  let contacted = 0
  let activated = 0
  let matched = 0
  for (const n of nodes) {
    const k = n.progress_state_key
    if (CONTACTED_KEYS.has(k)) {
      contacted += 1
    }
    if (ACTIVATED_KEYS.has(k)) {
      activated += 1
    }
    if (k === 'matched_voter') matched += 1
  }
  return {
    identified: nodes.length,
    contacted,
    activated,
    matched,
    total: nodes.length,
  }
}

type FetchResult = {
  nodes: Power5RelationshipNodeRow[]
  progressStates: { key: string; label: string }[]
  error: string | null
}

async function fetchPower5Workspace(profileId: string | undefined): Promise<FetchResult> {
  if (!profileId) {
    return { nodes: [], progressStates: [], error: null }
  }
  const [ns, st] = await Promise.all([
    supabase
      .from('power5_relationship_nodes')
      .select('*')
      .eq('owner_profile_id', profileId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('power5_progress_states')
      .select('key, label')
      .order('sort_order', { ascending: true }),
  ])
  const err = ns.error?.message ?? null
  const nodes = (err ? [] : (ns.data ?? [])) as Power5RelationshipNodeRow[]
  const progressStates = (!st.error && st.data
    ? (st.data as { key: string; label: string }[])
    : []) as { key: string; label: string }[]
  return { nodes, progressStates, error: err }
}

export function usePower5Workspace(profileId: string | undefined) {
  const [nodes, setNodes] = useState<Power5RelationshipNodeRow[]>([])
  const [progressStates, setProgressStates] = useState<{ key: string; label: string }[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyResult = useCallback((r: FetchResult, doneLoading: boolean) => {
    setNodes(r.nodes)
    if (r.progressStates.length) {
      setProgressStates(r.progressStates)
    }
    setError(r.error)
    if (doneLoading) setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const r = await fetchPower5Workspace(profileId)
      if (cancelled) return
      applyResult(r, true)
    })()
    return () => {
      cancelled = true
    }
  }, [profileId, applyResult])

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetchPower5Workspace(profileId)
    applyResult(r, true)
  }, [profileId, applyResult])

  const addNode = useCallback(
    async (input: {
      display_label: string
      relationship_kind: string
      connection_strength: number
      preferred_contact: string
      progress_state_key?: string
      next_step?: string | null
      notes?: string | null
      team_id?: string | null
    }) => {
      if (!profileId) return
      const { error: e } = await supabase.from('power5_relationship_nodes').insert({
        owner_profile_id: profileId,
        display_label: input.display_label.slice(0, 200),
        relationship_kind: input.relationship_kind,
        connection_strength: input.connection_strength,
        preferred_contact: input.preferred_contact,
        progress_state_key: input.progress_state_key ?? 'identified',
        next_step: input.next_step?.slice(0, 500) ?? null,
        notes: input.notes?.slice(0, 2000) ?? null,
        team_id: input.team_id ?? null,
      })
      if (e) throw e
      await load()
    },
    [profileId, load],
  )

  const updateNode = useCallback(
    async (
      id: string,
      patch: Partial<{
        display_label: string
        relationship_kind: string
        connection_strength: number
        preferred_contact: string
        progress_state_key: string
        next_step: string | null
        linked_voter_id: string | null
        notes: string | null
        sort_order: number
        team_id: string | null
        proximity_type: string | null
        target_role: string | null
      }>,
    ) => {
      if (!profileId) return
      const { error: e } = await supabase
        .from('power5_relationship_nodes')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_profile_id', profileId)
      if (e) throw e
      await load()
    },
    [profileId, load],
  )

  const deleteNode = useCallback(
    async (id: string) => {
      const { error: e } = await supabase
        .from('power5_relationship_nodes')
        .delete()
        .eq('id', id)
        .eq('owner_profile_id', profileId ?? '')
      if (e) throw e
      await load()
    },
    [profileId, load],
  )

  const impact = rollupImpact(nodes)

  return {
    nodes,
    progressStates,
    loading,
    error,
    impact,
    reload: load,
    addNode,
    updateNode,
    deleteNode,
  }
}
