import type { AgentJonesResponse } from './api/agentJones'
import type { AgentJonesSessionCoaching } from './agentJonesContextV2'

/** Stable short tag so v3.2 intel changes bump session_coaching without long payloads (server caps epoch at 320 chars). */
export function agentJonesV32IntelCoachingTag(v32IntelEpoch: string): string {
  if (!v32IntelEpoch.trim()) return ''
  let h = 2166136261
  for (let i = 0; i < v32IntelEpoch.length; i++) {
    h ^= v32IntelEpoch.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function composeAgentJonesCoachingSignalEpoch(
  operatingEpoch: string,
  v32IntelEpoch: string,
  max = 320,
): string {
  const tag = agentJonesV32IntelCoachingTag(v32IntelEpoch)
  const composed = tag ? `${operatingEpoch}|v32:${tag}` : operatingEpoch
  return composed.length > max ? composed.slice(0, max) : composed
}

export function normalizeCoachPhrase(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 88)
}

/** Phrases to pass to the model so it varies copy when signal_epoch is unchanged. */
export function extractAvoidPhrasesFromReply(reply: AgentJonesResponse): string[] {
  const out: string[] = []
  for (const p of reply.suggestedPrompts ?? []) {
    const t = p.trim().slice(0, 92)
    if (t) out.push(t)
  }
  const r = reply.response.replace(/\s+/g, ' ').trim()
  if (r.length > 24) {
    const cut = r.indexOf('. ')
    const first = (cut > 20 ? r.slice(0, cut + 1) : r.slice(0, 96)).trim()
    if (first) out.push(first)
  }
  const seen = new Set<string>()
  const dedup: string[] = []
  for (const x of out) {
    const k = normalizeCoachPhrase(x)
    if (!k || seen.has(k)) continue
    seen.add(k)
    dedup.push(x.slice(0, 100))
    if (dedup.length >= 3) break
  }
  return dedup
}

export function buildAgentJonesSessionCoachingPayload(input: {
  signalEpoch: string
  persistedEpoch: string | null
  persistedPhrases: string[]
}): AgentJonesSessionCoaching | null {
  if (!input.signalEpoch.trim()) return null
  if (
    input.persistedEpoch === input.signalEpoch &&
    input.persistedPhrases.length > 0
  ) {
    return {
      signal_epoch: input.signalEpoch,
      avoid_repeating: input.persistedPhrases.slice(0, 3),
    }
  }
  return null
}
