/**
 * Client gates for field / day-of mutations (align with coordinator desk access).
 */

import { canAccessEventCoordinatorDesk } from './eventCoordinatorDeskAccess'
import type { CampaignProfile } from '../hooks/useProfile'

export function canMutateFieldExecution(profile: CampaignProfile | null | undefined): boolean {
  return canAccessEventCoordinatorDesk(profile?.primary_role)
}
