/**
 * Personalized invite URLs and QR-ready payloads (data only; no auto-send).
 */

export function buildPower5JoinUrl(origin: string, inviteToken: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/join?p5=${encodeURIComponent(inviteToken)}`
}

export function buildPower5QrPayload(input: {
  inviteToken: string
  campaignSlug?: string
  personalizationNote?: string | null
}): Record<string, unknown> {
  return {
    v: 2,
    kind: 'power5_invite',
    t: input.inviteToken,
    campaign: input.campaignSlug ?? 'chris-jones-for-congress',
    ...(input.personalizationNote?.trim()
      ? { note: input.personalizationNote.trim().slice(0, 500) }
      : {}),
  }
}
