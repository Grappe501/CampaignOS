/**
 * Client-side permissions for event communications tooling (strengthened with Supabase RLS later).
 */

import { canAccessEventCoordinatorDesk } from './eventCoordinatorDeskAccess'
import type { CampaignProfile } from '../hooks/useProfile'

/** Full edit: steps, drafts, uploads — aligned with coordinator-style roles. */
export function canMutateEventCommunications(profile: CampaignProfile | null | undefined): boolean {
  return canAccessEventCoordinatorDesk(profile?.primary_role)
}

/** AI draft generation uses server keys only; UI gate prevents casual abuse on shared machines. */
export function canRequestCommsAiDrafts(profile: CampaignProfile | null | undefined): boolean {
  return canMutateEventCommunications(profile)
}
