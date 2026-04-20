import { createContext, useContext, type ReactNode } from 'react'
import type { CampaignCalendarEventRecord } from '../lib/campaignCalendarArchitecture'
import { useCampaignEvents } from '../hooks/useCampaignEvents'

type Ctx = {
  events: CampaignCalendarEventRecord[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const CampaignEventsContext = createContext<Ctx | null>(null)

export function CampaignEventsProvider({
  campaignId = 'default',
  children,
}: {
  campaignId?: string
  children: ReactNode
}) {
  const { events, loading, error, refetch } = useCampaignEvents(campaignId)
  return (
    <CampaignEventsContext.Provider value={{ events, loading, error, refetch }}>
      {children}
    </CampaignEventsContext.Provider>
  )
}

export function useCampaignEventsContext(): Ctx {
  const v = useContext(CampaignEventsContext)
  if (!v) {
    throw new Error('useCampaignEventsContext requires CampaignEventsProvider')
  }
  return v
}
