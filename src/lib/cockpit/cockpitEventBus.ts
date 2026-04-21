/**
 * Lightweight pub/sub for cockpit cross-module signals (no external deps).
 */

export type CockpitBusEvent =
  | { type: 'promote_module'; moduleId: string }
  | { type: 'highlight_module'; moduleId: string }
  | { type: 'refresh_module'; moduleId: string }
  | { type: 'open_route'; path: string }
  | { type: 'apply_compare_template'; templateId: string }
  | { type: 'mission_digest_tick'; generatedAtMs: number }

type Handler = (e: CockpitBusEvent) => void

const handlers = new Set<Handler>()

export function subscribeCockpitBus(h: Handler): () => void {
  handlers.add(h)
  return () => handlers.delete(h)
}

export function emitCockpitBus(e: CockpitBusEvent): void {
  for (const h of handlers) {
    try {
      h(e)
    } catch {
      /* isolate subscribers */
    }
  }
}
