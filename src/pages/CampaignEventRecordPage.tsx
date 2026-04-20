import { Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import EventRecordDeskContent from '../components/events/EventRecordDeskContent'
import { useProfile } from '../hooks/useProfile'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { supabase } from '../lib/supabaseClient'

type CampaignEventRecordPageProps = {
  onDevSessionClear?: () => void
}

export default function CampaignEventRecordPage({ onDevSessionClear }: CampaignEventRecordPageProps) {
  const { profile, loading } = useProfile()

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  if (!loading && profile && !canAccessEventCoordinatorDesk(profile.primary_role)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell event-detail-page-shell">
        {loading && !profile ? (
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
