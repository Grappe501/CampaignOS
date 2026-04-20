import { useCallback, useEffect, useState } from 'react'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import {
  humanizeWorkspaceStatus,
  type StructuredWorkspaceRecord,
} from '../lib/workspaceStructured'
import { supabase } from '../lib/supabaseClient'

type ProfileTaskRow = {
  task_id: string
  status: string
  workspace_tasks: {
    title: string
    description: string | null
    sort_order: number
  } | null
}

/**
 * Current task surface for the signed-in profile (catalog + progress).
 * Returns null when dev bypass is on, no profile id, empty data, or RPC errors.
 */
export function useTasks(campaignProfileId: string | undefined) {
  const [structured, setStructured] = useState<StructuredWorkspaceRecord | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setStructured(null)
      setLoading(false)
      setError(null)
      return
    }

    if (!campaignProfileId) {
      setStructured(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: qErr } = await supabase
      .from('workspace_profile_tasks')
      .select(
        'task_id, status, workspace_tasks ( title, description, sort_order )',
      )
      .eq('campaign_profile_id', campaignProfileId)

    if (qErr) {
      setError(qErr.message)
      setStructured(null)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as ProfileTaskRow[]
    if (rows.length === 0) {
      setStructured(null)
      setLoading(false)
      return
    }

    const sorted = [...rows].sort(
      (a, b) =>
        (a.workspace_tasks?.sort_order ?? 0) - (b.workspace_tasks?.sort_order ?? 0),
    )
    const current =
      sorted.find((r) => r.status !== 'completed') ?? sorted[0] ?? null
    const cat = current?.workspace_tasks
    if (!current || !cat?.title) {
      setStructured(null)
      setLoading(false)
      return
    }

    setStructured({
      title: cat.title,
      status: humanizeWorkspaceStatus(current.status),
      description: cat.description,
    })
    setLoading(false)
  }, [campaignProfileId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  return { structured, loading, error, refetch: load }
}
