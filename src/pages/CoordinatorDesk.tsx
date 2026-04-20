import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import CoordinatorDeskContent from '../components/coordinator/CoordinatorDeskContent'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabaseClient'

type CoordinatorDeskProps = {
  onDevSessionClear?: () => void
}

export default function CoordinatorDesk({ onDevSessionClear }: CoordinatorDeskProps) {
  const { profile, loading, refetch } = useProfile()

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell coordinator-desk-shell">
        {loading && !profile ? (
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        ) : (
          <CoordinatorDeskContent
            profile={profile}
            profileLoading={loading}
            onRefreshProfile={() => void refetch()}
          />
        )}
      </main>
      <AppFooter />
    </>
  )
}
