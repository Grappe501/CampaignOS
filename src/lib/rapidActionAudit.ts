import type { RapidActionAuditEntry, RapidActionType } from './rapidActionSchemas'

const STORAGE_KEY = 'campaignos_rapid_action_audit_v1'
const MAX_ENTRIES = 200

function readRaw(): RapidActionAuditEntry[] {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as RapidActionAuditEntry[]) : []
  } catch {
    return []
  }
}

function writeRaw(rows: RapidActionAuditEntry[]) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(-MAX_ENTRIES)))
  } catch {
    /* quota */
  }
}

export function appendRapidActionAudit(entry: Omit<RapidActionAuditEntry, 'initiated_at'> & { initiated_at?: string }): void {
  const full: RapidActionAuditEntry = {
    ...entry,
    initiated_at: entry.initiated_at ?? new Date().toISOString(),
  }
  const next = [...readRaw(), full]
  writeRaw(next)
}

export function getRecentRapidActionAudit(limit = 50): RapidActionAuditEntry[] {
  return readRaw().slice(-limit).reverse()
}

export function filterAuditByAction(actions: readonly RapidActionType[]): RapidActionAuditEntry[] {
  const set = new Set(actions)
  return readRaw().filter((r) => set.has(r.action_type)).reverse()
}
