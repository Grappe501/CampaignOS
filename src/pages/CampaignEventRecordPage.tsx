import { Navigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import EventRecordDeskContent from '../components/events/EventRecordDeskContent'
import { useEventById } from '../hooks/useCampaignEvents'
import { useProfile } from '../hooks/useProfile'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { CAMPAIGN_EVENT_NEW_RECORD_SLUG, isUuidParam } from '../lib/campaignEventSystem'
import { canAccessEventRecordPage } from '../lib/eventRecordAccess'
import { supabase } from '../lib/supabaseClient'

type CampaignEventRecordPageProps = {
  onDevSessionClear?: () => void
}

export default function CampaignEventRecordPage({ onDevSessionClear }: CampaignEventRecordPageProps) {
  const { profile, loading: profileLoading } = useProfile()
  const { eventId = '' } = useParams<{ eventId: string }>()
  const isUuid = isUuidParam(eventId)
  const { event, loading: eventLoading } = useEventById(isUuid ? eventId : null)

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const accessLoading = profileLoading || (isUuid && eventLoading)
  const canAccess =
    profile && (canAccessEventCoordinatorDesk(profile.primary_role) || canAccessEventRecordPage(profile, event))

  if (
    !profileLoading &&
    profile &&
    eventId === CAMPAIGN_EVENT_NEW_RECORD_SLUG &&
    !canAccessEventCoordinatorDesk(profile.primary_role)
  ) {
    return <Navigate to="/dashboard" replace />
  }

  if (!accessLoading && profile && isUuid && !canAccess) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell event-detail-page-shell">
        {accessLoading && !profile ? (
          <div className="loading-screen" role="status" aria-live="polite">
            Loading profile and desk access…
          </div>
        ) : (
          <EventRecordDeskContent profile={profile} />
        )}
      </main>
      <AppFooter />
    </>
  )
}
