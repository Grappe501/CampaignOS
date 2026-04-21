/**
 * Local audit log for accept / ignore / defer — sync to Supabase when online & authenticated (future hook).
 */

import type { EventAiRecommendationAuditRecordV1 } from './eventAiOrchestrationSchemas'

const LS_KEY = 'campaignos_event_ai_audit_log_v1'
const MAX = 200

export function loadLocalEventAiAuditLog(): EventAiRecommendationAuditRecordV1[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x) => x && typeof x === 'object' && (x as EventAiRecommendationAuditRecordV1).v === 1,
    ) as EventAiRecommendationAuditRecordV1[]
  } catch {
    return []
  }
}

function fingerprintExplanation(s: string): string {
  return s.trim().toLowerCase().slice(0, 120)
}

/** Dedupes by id + explanation fingerprint so retries do not spam the log. */
export function appendLocalEventAiAudit(entry: EventAiRecommendationAuditRecordV1): void {
  try {
    const cur = loadLocalEventAiAuditLog()
    const fp = fingerprintExplanation(entry.explanation_digest)
    const dup = cur.find(
      (e) => e.id === entry.id && fingerprintExplanation(e.explanation_digest) === fp,
    )
    if (dup) return
    cur.unshift(entry)
    localStorage.setItem(LS_KEY, JSON.stringify(cur.slice(0, MAX)))
  } catch {
    /* ignore quota */
  }
}
