import { isDevAuthBypassEnabled } from './devAuth'

/**
 * Client-side gate for the Event Coordinator desk (/events).
 * HQ and field roles that run or approve events; not a permission model for writes.
 */
export function canAccessEventCoordinatorDesk(
  primaryRole: string | null | undefined,
): boolean {
  if (isDevAuthBypassEnabled()) return true
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!k) return false
  if (k === 'admin' || k === 'staff') return true
  if (k === 'coordinator' || k === 'volunteer_coordinator') return true
  if (k === 'candidate') return true
  if (
    (k.includes('assistant') || k.includes('deputy')) &&
    (k.includes('manager') || k.includes('campaign') || k.includes('cm'))
  ) {
    return true
  }
  if (k.includes('county') && (k.includes('lead') || k.includes('captain'))) return true
  if (k.includes('precinct') || k === 'captain' || k.endsWith('_captain')) return true
  return false
}
