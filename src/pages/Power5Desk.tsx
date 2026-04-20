import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useVoterMatch } from '../hooks/useVoterMatch'
import { usePower5Workspace } from '../hooks/usePower5Workspace'
import { usePower5Propagation } from '../hooks/usePower5Propagation'
import { supabase } from '../lib/supabaseClient'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import Power5Workspace from '../components/power5/Power5Workspace'

type Power5DeskProps = {
  onDevSessionClear?: () => void
}

export default function Power5Desk({ onDevSessionClear }: Power5DeskProps) {
  const { profile, loading, refetch } = useProfile()
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const power5Workspace = usePower5Workspace(profileId)
  const power5Propagation = usePower5Propagation(profileId)
  const onVoterMatchDone = useCallback(() => {
    void refetch()
  }, [refetch])
  const voterMatch = useVoterMatch(profileId, {
    onAfterMatch: onVoterMatchDone,
  })

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  if (loading) {
    return (
      <>
        <AppHeader onSignOut={handleSignOut} />
        <main className="app-shell">
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        </main>
        <AppFooter />
      </>
    )
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell dashboard-workspace dashboard-workspace--hd power5-desk-page">
        <div className="power5-desk-toolbar stack-section">
          <Link to="/dashboard" className="power5-desk-back">
            ← Back to dashboard
          </Link>
          <p className="subtitle power5-desk-toolbar-lede" style={{ margin: 0 }}>
            Full relational workspace — add people, run relays, and log outreach on a wide canvas.
          </p>
        </div>
        <Power5Workspace
          profileId={profileId}
          homeTeamId={
            profile?.power5_home_team_id
              ? String(profile.power5_home_team_id)
              : undefined
          }
          matchedVoterId={
            voterMatch.matched?.voter_id != null
              ? String(voterMatch.matched.voter_id)
              : undefined
          }
          workspace={power5Workspace}
          propagation={power5Propagation}
          fullPage
        />
      </main>
      <AppFooter />
    </>
  )
}
