import { Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import EventCoordinatorDeskContent from '../components/events/EventCoordinatorDeskContent'
import { useProfile } from '../hooks/useProfile'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { supabase } from '../lib/supabaseClient'

type EventCoordinatorDeskProps = {
  onDevSessionClear?: () => void
}

export default function EventCoordinatorDesk({ onDevSessionClear }: EventCoordinatorDeskProps) {
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
      <main className="app-shell event-coordinator-desk-shell">
        {loading && !profile ? (
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        ) : (
          <EventCoordinatorDeskContent profile={profile} />
        )}
      </main>
      <AppFooter />
    </>
  )
}
