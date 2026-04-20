import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import CandidateDeskContent from '../components/candidate/CandidateDeskContent'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabaseClient'

type CandidateDeskProps = {
  onDevSessionClear?: () => void
}

/**
 * Principal / leadership strategic surface — not a volunteer workflow duplicate.
 * KPIs and election framing reuse shared engines; operations deep-links stay separate.
 */
export default function CandidateDesk({ onDevSessionClear }: CandidateDeskProps) {
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
      <main className="app-shell candidate-desk-shell">
        {loading && !profile ? (
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        ) : (
          <CandidateDeskContent
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
