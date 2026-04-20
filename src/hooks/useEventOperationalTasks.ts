import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CampaignEventTypeKey } from '../lib/campaignEventTypeMatrix'
import { recomputeAndPersistEventReadiness } from '../lib/campaignEventReadinessPersistence'
import {
  completedTemplateSlugsFromRows,
  fetchEventTaskRows,
  seedEventTasksIfEmpty,
  updateTaskStatus,
  type DbEventTaskRow,
} from '../lib/campaignEventTasksDb'
import { supabase } from '../lib/supabaseClient'

const EVENT_SELECT = [
  'id',
  'campaign_id',
  'title',
  'event_type',
  'status',
  'operational_status',
  'readiness_score',
  'staffing_state',
  'venue_name',
  'address_line_1',
  'city',
  'state',
  'postal_code',
  'virtual_url',
  'owner_user_id',
  'followup_state',
  'start_at',
  'end_at',
  'county_id',
  'precinct_id',
  'district_id',
  'neighborhood_id',
  'mobilize_publish_state',
].join(',')

export function useEventOperationalTasks(
  eventId: string | null,
  eventType: CampaignEventTypeKey,
  startAtIso: string | null,
  enabled: boolean,
) {
  const [rows, setRows] = useState<DbEventTaskRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!eventId || !startAtIso || !enabled) {
      setRows([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const next = await seedEventTasksIfEmpty(eventId, eventType, startAtIso)
      setRows(next)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load tasks'))
    } finally {
      setLoading(false)
    }
  }, [eventId, eventType, startAtIso, enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const completedSlugs = useMemo(() => completedTemplateSlugsFromRows(rows), [rows])

  const toggleTemplateComplete = useCallback(
    async (templateSlug: string, completed: boolean) => {
      if (!eventId) return
      const row = rows.find((r) => r.template_slug === templateSlug)
      if (!row) return
      try {
        await updateTaskStatus(row.id, completed ? 'completed' : 'pending', completed ? undefined : null)
        const { data: fullRow } = await supabase
          .from('campaign_events')
          .select(EVENT_SELECT)
          .eq('id', eventId)
          .single()
        if (fullRow) {
          await recomputeAndPersistEventReadiness(eventId, {
            eventType,
            row: fullRow as Record<string, unknown>,
          })
        }
        const next = await fetchEventTaskRows(eventId)
        setRows(next)
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Task update failed'))
      }
    },
    [eventId, eventType, rows],
  )

  return {
    taskRows: rows,
    completedTemplateSlugs: completedSlugs,
    loading,
    error,
    refresh,
    toggleTemplateComplete,
  }
}
