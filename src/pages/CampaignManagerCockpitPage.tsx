import { Navigate } from 'react-router-dom'
import CampaignManagerCockpitShell from '../components/cockpit/CampaignManagerCockpitShell'
import { useProfile } from '../hooks/useProfile'
import { canAccessCampaignManagerCockpit } from '../lib/cockpit/cockpitCampaignManagerAccess'
import { supabase } from '../lib/supabaseClient'

type Props = {
  onDevSessionClear?: () => void
}

export default function CampaignManagerCockpitPage({ onDevSessionClear }: Props) {
  const { profile, loading } = useProfile()

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  if (!loading && profile && !canAccessCampaignManagerCockpit(profile.primary_role)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="cm-cockpit-page">
      <button type="button" className="cm-cockpit-signout" onClick={() => void handleSignOut()}>
        Sign out
      </button>
      {loading && !profile ? (
        <div className="loading-screen cm-cockpit-loading" role="status" aria-live="polite">
          Loading cockpit…
        </div>
      ) : (
        <CampaignManagerCockpitShell profile={profile} />
      )}
    </div>
  )
}
