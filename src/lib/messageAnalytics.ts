/**
 * Message analytics — aggregate usage / resonance signals (client or future DB feed).
 */

export type MessageUsageEvent = {
  id: string
  at_ms: number
  /** Talking point id, script id, or custom tag. */
  message_key: string
  kind: 'talking_point' | 'script' | 'rebuttal' | 'draft' | 'ai_suggestion'
  county?: string | null
  channel?: string | null
  segment?: string | null
  /** Volunteer subjective: did voter engage positively? */
  resonance?: 'strong' | 'mixed' | 'weak' | 'unknown'
}

export type MessageUsageRollup = {
  message_key: string
  kind: MessageUsageEvent['kind']
  count: number
  strong_count: number
  weak_count: number
  counties: Record<string, number>
}

export function rollupMessageUsage(events: readonly MessageUsageEvent[]): MessageUsageRollup[] {
  const m = new Map<string, MessageUsageRollup>()
  for (const e of events) {
    const k = `${e.kind}:${e.message_key}`
    const cur =
      m.get(k) ??
      {
        message_key: e.message_key,
        kind: e.kind,
        count: 0,
        strong_count: 0,
        weak_count: 0,
        counties: {},
      }
    cur.count += 1
    if (e.resonance === 'strong') cur.strong_count += 1
    if (e.resonance === 'weak') cur.weak_count += 1
    const c = e.county?.trim() || 'unknown'
    cur.counties[c] = (cur.counties[c] ?? 0) + 1
    m.set(k, cur)
  }
  return [...m.values()].sort((a, b) => b.count - a.count)
}

export function weakMessagingZones(rollups: readonly MessageUsageRollup[]): string[] {
  const byCounty: Record<string, { weak: number; n: number }> = {}
  for (const r of rollups) {
    for (const [county, cnt] of Object.entries(r.counties)) {
      const slot = byCounty[county] ?? { weak: 0, n: 0 }
      slot.n += cnt
      slot.weak += r.weak_count
      byCounty[county] = slot
    }
  }
  return Object.entries(byCounty)
    .filter(([, v]) => v.n >= 3 && v.weak >= 2)
    .map(([county]) => `${county}: elevated weak resonance vs touches`)
    .slice(0, 8)
}

export function topMessagesInUse(rollups: readonly MessageUsageRollup[], limit = 8): MessageUsageRollup[] {
  return [...rollups].slice(0, limit)
}
