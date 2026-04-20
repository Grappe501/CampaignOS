import { isDevAuthBypassEnabled } from './devAuth'
import { canAccessEventCoordinatorDesk } from './eventCoordinatorDeskAccess'

/** Upload / review / import signup sheets (paper → durable rows → volunteer match → audit stamp). */
export function canAccessSignupSheetIngestion(
  primaryRole: string | null | undefined,
): boolean {
  if (isDevAuthBypassEnabled()) return true
  if (canAccessEventCoordinatorDesk(primaryRole)) return true
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!k) return false
  if (k.includes('intern')) return true
  return false
}
