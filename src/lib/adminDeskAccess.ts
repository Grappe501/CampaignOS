import { isDevAuthBypassEnabled } from './devAuth'

/**
 * Who may open /admin (client-side gate; server policies must still enforce writes).
 * Staff included as HQ operations per architecture docs.
 */
export function canAccessAdminDesk(primaryRole: string | null | undefined): boolean {
  if (isDevAuthBypassEnabled()) return true
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  return k === 'admin' || k === 'staff'
}

/** True when this account's role home is the command center (admin only, not staff). */
export function isAdminRoleHome(primaryRole: string | null | undefined): boolean {
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  return k === 'admin'
}
