import { Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { getRoleHomePath } from '../lib/roleHomeRouting'

/**
 * Resolves `/` and post-auth entry to a role-appropriate desk after profile load.
 * Uses the same loading shell as the app shell to avoid redirect loops.
 */
export default function RoleHomeRedirect() {
  const { profile, loading } = useProfile()
  const destination = getRoleHomePath(profile?.primary_role)

  if (loading) {
    return (
      <div className="app-viewport">
        <div className="loading-screen" role="status" aria-live="polite">
          Loading…
        </div>
      </div>
    )
  }

  return <Navigate to={destination} replace />
}
