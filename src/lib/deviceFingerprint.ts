/**
 * Non-cryptographic browser fingerprint for trusted-device scaffolding only.
 * Not a secret; pairs with authenticated RPCs.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr'
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen?.width ?? 0),
    String(screen?.height ?? 0),
    String(screen?.colorDepth ?? 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ]
  const raw = parts.join('|')
  let h = 0
  for (let i = 0; i < raw.length; i += 1) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0
  }
  return `fp_${(h >>> 0).toString(16)}_${raw.length}`
}
