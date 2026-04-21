/**
 * Expense tracking — validation + typed inserts (editors only via RLS).
 */

import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from './financeDomain'

export type CreateExpenseInput = {
  expense_category: ExpenseCategory
  amount: number
  vendor_label?: string | null
  event_id?: string | null
  county_id?: string | null
  notes_internal?: string | null
  incurred_at?: string | null
}

export function validateExpenseInput(
  input: CreateExpenseInput,
): { ok: true } | { ok: false; error: string } {
  if (!EXPENSE_CATEGORIES.includes(input.expense_category)) return { ok: false, error: 'Invalid category' }
  if (!Number.isFinite(input.amount) || input.amount < 0) return { ok: false, error: 'Invalid amount' }
  return { ok: true }
}

export async function createExpense(
  profileId: string,
  input: CreateExpenseInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const v = validateExpenseInput(input)
  if (!v.ok) return v
  if (isDevAuthBypassEnabled()) return { ok: true, id: 'dev' }
  const row = {
    expense_category: input.expense_category,
    amount: input.amount,
    vendor_label: input.vendor_label?.trim().slice(0, 200) || null,
    event_id: input.event_id ?? null,
    county_id: input.county_id?.trim() || null,
    recorded_by_profile_id: profileId,
    notes_internal: input.notes_internal?.trim().slice(0, 2000) || null,
    incurred_at: input.incurred_at ?? new Date().toISOString(),
  }
  const { data, error } = await supabase.from('campaign_expenses').insert(row).select('id').single()
  if (error) return { ok: false, error: error.message }
  if (!data?.id) return { ok: false, error: 'No id returned' }
  return { ok: true, id: String(data.id) }
}
