/**
 * Embedding refresh scheduler — **no-op** until server workers exist.
 * Call `shouldRefreshEmbedding` after meaningful record saves to gate future jobs.
 * The fingerprint in `eventAiRetrieval` already dedupes full re-ranks; embedding jobs should key the same way.
 */

const last: Record<string, number> = {}

export function shouldRefreshEmbedding(entityKey: string, minIntervalMs: number): boolean {
  const now = Date.now()
  const prev = last[entityKey] ?? 0
  if (now - prev < minIntervalMs) return false
  last[entityKey] = now
  return true
}

export function markEmbeddingStale(entityKey: string): void {
  delete last[entityKey]
}
