import { isDevAuthBypassEnabled } from './devAuth'

/**
 * Executive leadership briefing (/events/leadership). Narrower than full coordinator desk.
 * Client gate only — server RPCs enforce RLS for any write path.
 */
export function canAccessLeadershipBriefing(primaryRole: string | null | undefined): boolean {
  if (isDevAuthBypassEnabled()) return true
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!k) return false
  if (k === 'admin' || k === 'staff') return true
  if (k === 'campaign_manager') return true
  if (k === 'candidate') return true
  if (
    (k.includes('assistant') || k.includes('deputy')) &&
    (k.includes('manager') || k.includes('campaign') || k.includes('cm'))
  ) {
    return true
  }
  return false
}

/** Varies emphasis copy — underlying snapshot is identical. */
export type LeadershipBriefingEmphasis =
  | 'executive'
  | 'campaign_manager'
  | 'candidate'
  | 'operations'

export function emphasisFromRole(primaryRole: string | null | undefined): LeadershipBriefingEmphasis {
  const k = String(primaryRole ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (k === 'admin' || k === 'staff') return 'executive'
  if (k === 'candidate') return 'candidate'
  if (k === 'campaign_manager') return 'campaign_manager'
  return 'operations'
}
