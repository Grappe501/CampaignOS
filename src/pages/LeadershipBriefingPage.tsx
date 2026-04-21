import { Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import LeadershipBriefingContent from '../components/events/leadership/LeadershipBriefingContent'
import { useProfile } from '../hooks/useProfile'
import { canAccessLeadershipBriefing } from '../lib/leadershipBriefingAccess'
import { supabase } from '../lib/supabaseClient'

type Props = {
  onDevSessionClear?: () => void
}

export default function LeadershipBriefingPage({ onDevSessionClear }: Props) {
  const { profile, loading } = useProfile()

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  if (!loading && profile && !canAccessLeadershipBriefing(profile.primary_role)) {
    return <Navigate to="/events" replace />
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
          <LeadershipBriefingContent profile={profile} />
        )}
      </main>
      <AppFooter />
    </>
  )
}
