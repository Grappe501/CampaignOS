import { supabase } from './supabaseClient'

/**
 * Idempotent: ensures a `campaign_profiles` row exists for the current session.
 * Call after sign-in; workspace seed trigger still runs on INSERT when needed.
 */
export async function ensureCampaignProfile(): Promise<void> {
  const { error } = await supabase.rpc('ensure_campaign_profile')
  if (error) {
    console.error('ensure_campaign_profile:', error.message)
  }
}
