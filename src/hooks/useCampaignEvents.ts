import { useCallback, useEffect, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../lib/campaignCalendarArchitecture'
import {
  fetchCampaignEventById,
  fetchCampaignEventsForCampaign,
  fetchCountyEvents,
} from '../lib/campaignEventsFromSupabase'

export function useCampaignEvents(campaignId = 'default') {
  const [events, setEvents] = useState<CampaignCalendarEventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { events: rows, error: err } = await fetchCampaignEventsForCampaign(campaignId)
    setEvents(rows)
    setError(err)
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  return { events, loading, error, refetch: load }
}

export function useCountyEvents(countyId: string | null) {
  const [events, setEvents] = useState<CampaignCalendarEventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!countyId) {
      setEvents([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { events: rows, error: err } = await fetchCountyEvents(countyId)
    setEvents(rows)
    setError(err)
    setLoading(false)
  }, [countyId])

  useEffect(() => {
    void load()
  }, [load])

  return { events, loading, error, refetch: load }
}

export function useEventById(eventId: string | null) {
  const [event, setEvent] = useState<CampaignCalendarEventRecord | null>(null)
  const [loading, setLoading] = useState(Boolean(eventId))
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!eventId) {
      setEvent(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { event: row, error: err } = await fetchCampaignEventById(eventId)
    setEvent(row)
    setError(err)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  return { event, loading, error, refetch: load }
}
