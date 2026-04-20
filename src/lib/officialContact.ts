import type { PublicOfficialEntry } from './api/publicOfficials'

export type ChannelLink = { label: string; url: string }

const CHANNEL_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  youtube: 'YouTube',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
}

export function formatOfficialAddresses(
  entry: PublicOfficialEntry,
): string[] {
  const raw = entry.addresses
  if (!raw?.length) return []
  const lines: string[] = []
  for (const a of raw) {
    const parts = [
      a.line1,
      a.line2,
      [a.city, a.state, a.zip].filter(Boolean).join(', '),
    ].filter(Boolean)
    if (parts.length) lines.push(parts.join('\n'))
  }
  return lines
}

export function channelLinksFromOfficial(entry: PublicOfficialEntry): ChannelLink[] {
  const ch = entry.channels
  if (!ch?.length) return []
  const out: ChannelLink[] = []
  for (const c of ch) {
    const type = (c.type ?? '').toLowerCase()
    const id = (c.id ?? '').trim()
    if (!id) continue
    const url = urlForChannel(type, id)
    if (!url) continue
    const label =
      CHANNEL_LABELS[type] ??
      (c.type ? c.type.charAt(0).toUpperCase() + c.type.slice(1) : 'Social')
    out.push({ label, url })
  }
  return out
}

function urlForChannel(type: string, id: string): string | null {
  if (/^https?:\/\//i.test(id)) return id
  const handle = id.replace(/^@/, '')
  if (type.includes('twitter') || type === 'x')
    return `https://twitter.com/${encodeURIComponent(handle)}`
  if (type.includes('facebook'))
    return `https://www.facebook.com/${encodeURIComponent(id)}`
  if (type.includes('youtube')) {
    if (id.startsWith('http')) return id
    return `https://www.youtube.com/${encodeURIComponent(id.replace(/^@/, ''))}`
  }
  if (type.includes('instagram'))
    return `https://www.instagram.com/${encodeURIComponent(handle)}/`
  if (type.includes('linkedin'))
    return id.startsWith('http')
      ? id
      : `https://www.linkedin.com/in/${encodeURIComponent(handle)}`
  return null
}

/** Single block for clipboard (email, outreach, etc.). */
export function formatOfficialForClipboard(entry: PublicOfficialEntry): string {
  const lines: string[] = [entry.name, entry.office]
  if (entry.party) lines.push(entry.party)
  for (const block of formatOfficialAddresses(entry)) {
    lines.push('', block)
  }
  if (entry.phones?.length) lines.push('', entry.phones.join(', '))
  if (entry.emails?.length) lines.push('', entry.emails.join(', '))
  if (entry.urls?.length) lines.push('', entry.urls.join('\n'))
  for (const { label, url } of channelLinksFromOfficial(entry)) {
    lines.push(`${label}: ${url}`)
  }
  return lines.join('\n').trim()
}
