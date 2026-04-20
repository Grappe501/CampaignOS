/**
 * Marketplace health metrics from merged opportunity rows + open assignment counts.
 */

import type { VolunteerOpportunity } from './volunteerOpportunityDomain'

export type MarketplaceAnalyticsSnapshot = {
  totalOpen: number
  totalFilled: number
  urgentOpen: number
  bySource: Record<string, number>
  byCategory: Record<string, number>
  bottleneckRoles: { roleSlug: string | null; open: number }[]
}

export function computeMarketplaceAnalytics(
  opportunities: VolunteerOpportunity[],
): MarketplaceAnalyticsSnapshot {
  const open = opportunities.filter((o) => o.quantityOpen > 0)
  let totalFilled = 0
  let totalOpenSlots = 0
  const bySource: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  const roleOpen = new Map<string | null, number>()

  for (const o of open) {
    totalOpenSlots += o.quantityOpen
    totalFilled += o.quantityFilled
    bySource[o.sourceType] = (bySource[o.sourceType] ?? 0) + o.quantityOpen
    byCategory[o.category] = (byCategory[o.category] ?? 0) + o.quantityOpen
    const r = o.roleSlug
    roleOpen.set(r, (roleOpen.get(r) ?? 0) + o.quantityOpen)
  }

  const urgentOpen = open.filter((o) => o.priority === 'urgent').reduce((s, o) => s + o.quantityOpen, 0)

  const bottleneckRoles = [...roleOpen.entries()]
    .map(([roleSlug, n]) => ({ roleSlug, open: n }))
    .sort((a, b) => b.open - a.open)
    .slice(0, 8)

  return {
    totalOpen: totalOpenSlots,
    totalFilled,
    urgentOpen,
    bySource,
    byCategory,
    bottleneckRoles,
  }
}
