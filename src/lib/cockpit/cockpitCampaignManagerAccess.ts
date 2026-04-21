import { isDevAuthBypassEnabled } from '../devAuth'

/** Flagship command shell — Campaign Manager primary; admin/staff for QA. */
export function canAccessCampaignManagerCockpit(
  primaryRole: string | null | undefined,
): boolean {
  if (isDevAuthBypassEnabled()) return true
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!k) return false
  if (k === 'admin' || k === 'staff') return true
  if (k === 'campaign_manager') return true
  return false
}
