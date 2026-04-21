/**
 * Fundraising tracking — validation + typed inserts (editors only via RLS).
 */

import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'
import {
  DONATION_CHANNELS,
  DONOR_AMOUNT_TIERS,
  FUND_SOURCE_SLUGS,
  type DonationChannel,
  type DonorAmountTier,
  type FundSourceSlug,
} from './financeDomain'

export type CreateDonationInput = {
  fund_source_slug: FundSourceSlug
  amount: number
  donor_amount_tier?: DonorAmountTier
  channel?: DonationChannel
  event_id?: string | null
  county_id?: string | null
  notes_internal?: string | null
  received_at?: string | null
}

export function validateDonationInput(
  input: CreateDonationInput,
): { ok: true } | { ok: false; error: string } {
  if (!FUND_SOURCE_SLUGS.includes(input.fund_source_slug)) return { ok: false, error: 'Invalid fund source' }
  if (!Number.isFinite(input.amount) || input.amount < 0) return { ok: false, error: 'Invalid amount' }
  const tier = input.donor_amount_tier ?? 'unknown'
  if (!DONOR_AMOUNT_TIERS.includes(tier)) return { ok: false, error: 'Invalid donor tier' }
  const ch = input.channel ?? 'unknown'
  if (!DONATION_CHANNELS.includes(ch)) return { ok: false, error: 'Invalid channel' }
  return { ok: true }
}

export async function createDonation(
  profileId: string,
  input: CreateDonationInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const v = validateDonationInput(input)
  if (!v.ok) return v
  if (isDevAuthBypassEnabled()) return { ok: true, id: 'dev' }
  const row = {
    fund_source_slug: input.fund_source_slug,
    amount: input.amount,
    donor_amount_tier: input.donor_amount_tier ?? 'unknown',
    channel: input.channel ?? 'unknown',
    event_id: input.event_id ?? null,
    county_id: input.county_id?.trim() || null,
    recorded_by_profile_id: profileId,
    notes_internal: input.notes_internal?.trim().slice(0, 2000) || null,
    received_at: input.received_at ?? new Date().toISOString(),
  }
  const { data, error } = await supabase.from('campaign_donations').insert(row).select('id').single()
  if (error) return { ok: false, error: error.message }
  if (!data?.id) return { ok: false, error: 'No id returned' }
  return { ok: true, id: String(data.id) }
}

/** Tier from amount for quick logging (deterministic bands). */
export function donorTierFromAmount(amount: number): DonorAmountTier {
  if (!Number.isFinite(amount) || amount <= 0) return 'unknown'
  if (amount < 100) return 'under_100'
  if (amount < 500) return '100_500'
  if (amount < 2500) return '500_2500'
  return '2500_plus'
}
