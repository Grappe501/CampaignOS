import { Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import NeighborhoodEventHubContent from '../components/events/operations/NeighborhoodEventHubContent'
import { useProfile } from '../hooks/useProfile'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { supabase } from '../lib/supabaseClient'

type Props = { onDevSessionClear?: () => void }

export default function NeighborhoodEventHubPage({ onDevSessionClear }: Props) {
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
          <NeighborhoodEventHubContent />
        )}
      </main>
      <AppFooter />
    </>
  )
}
