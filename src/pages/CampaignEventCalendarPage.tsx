import { Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import EventCalendarPage from '../components/events/calendar/EventCalendarPage'
import { useProfile } from '../hooks/useProfile'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { mapProfileRoleToCalendarWidgetPersona } from '../lib/eventSummaryEngine'
import { supabase } from '../lib/supabaseClient'

type CampaignEventCalendarPageProps = {
  onDevSessionClear?: () => void
}

export default function CampaignEventCalendarPage({
  onDevSessionClear,
}: CampaignEventCalendarPageProps) {
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

  const persona = mapProfileRoleToCalendarWidgetPersona(profile?.primary_role)

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell event-calendar-page-shell">
        {loading && !profile ? (
          <div className="loading-screen" role="status" aria-live="polite">
            Loading profile and calendar…
          </div>
        ) : (
          <EventCalendarPage persona={persona} />
        )}
      </main>
      <AppFooter />
    </>
  )
}
