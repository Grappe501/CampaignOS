import { Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import AdminDeskContent from '../components/admin/AdminDeskContent'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabaseClient'
import { canAccessAdminDesk } from '../lib/adminDeskAccess'

type AdminDeskProps = {
  onDevSessionClear?: () => void
}

export default function AdminDesk({ onDevSessionClear }: AdminDeskProps) {
  const { profile, loading, refetch } = useProfile()
  const role = profile?.primary_role != null ? String(profile.primary_role) : null

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const gated =
    !loading &&
    profile != null &&
    !canAccessAdminDesk(role)

  if (gated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell admin-desk-shell">
        {loading && !profile ? (
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        ) : (
          <AdminDeskContent onProfileRefresh={() => void refetch()} />
        )}
      </main>
      <AppFooter />
    </>
  )
}
