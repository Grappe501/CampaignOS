import { isDevAuthBypassEnabled } from '../../lib/devAuth'

function truncId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

export default function AdminAuditSystemPanel({
  authLoading,
  userId,
  email,
  lastSignInAt,
}: {
  authLoading: boolean
  userId: string | null | undefined
  email: string | null | undefined
  lastSignInAt: string | null | undefined
}) {
  const bypass = isDevAuthBypassEnabled()

  return (
    <div className="admin-governance-grid">
      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Auth session (read-only)</h3>
        {bypass ? (
          <p className="subtitle">
            Dev auth bypass is active — Supabase session snapshot is intentionally skipped for this
            surface.
          </p>
        ) : authLoading ? (
          <p className="subtitle">Loading auth metadata…</p>
        ) : (
          <dl className="admin-governance-dl">
            <dt>User ID</dt>
            <dd>
              {userId ? <code className="admin-governance-mono">{truncId(userId)}</code> : '—'}
            </dd>
            <dt>Email</dt>
            <dd>{email && email.trim() !== '' ? email : '—'}</dd>
            <dt>Last sign-in (Auth)</dt>
            <dd>
              {lastSignInAt
                ? (() => {
                    try {
                      return new Date(lastSignInAt).toLocaleString()
                    } catch {
                      return lastSignInAt
                    }
                  })()
                : '—'}
            </dd>
          </dl>
        )}
        <p className="admin-desk-empty-hint">
          Device fingerprinting, per-action audit logs, and impersonation trails are not exposed in
          this build. Prefer Supabase Auth logs and application logging for investigations.
        </p>
      </div>

      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Application visibility</h3>
        <dl className="admin-governance-dl">
          <dt>Build mode</dt>
          <dd>
            <code>{import.meta.env.MODE}</code>
          </dd>
          <dt>Base URL</dt>
          <dd>
            <code>{import.meta.env.BASE_URL || '/'}</code>
          </dd>
        </dl>
        <p className="subtitle">
          Client bundles do not surface secrets. Operational “who changed what” belongs in
          server-side audit tables and retained logs — this panel is the hook for future read-only
          feeds (e.g. recent role changes, publish events).
        </p>
      </div>

      <div className="admin-desk-panel admin-desk-nested admin-governance-roadmap">
        <h3 className="admin-desk-panel-title">Activity feed (planned)</h3>
        <p className="subtitle" style={{ marginTop: 0 }}>
          The blueprint calls for recent role changes, approvals, and escalations in one narrative
          stream. That requires aggregated queries with admin RLS — not available here yet.
        </p>
      </div>
    </div>
  )
}
