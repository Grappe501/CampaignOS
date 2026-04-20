/**
 * Deep links only — opens the user's own apps. No server-side send.
 */

export function gmailComposeUrl(subject: string, body: string): string {
  const p = new URLSearchParams()
  p.set('view', 'cm')
  p.set('fs', '1')
  if (subject.trim()) p.set('su', subject)
  p.set('body', body)
  return `https://mail.google.com/mail/?${p.toString()}`
}

export function smsComposeUrl(body: string, phone?: string): string {
  if (phone?.trim()) {
    const digits = phone.replace(/[^\d+]/g, '')
    if (digits) return `sms:${digits}?body=${encodeURIComponent(body)}`
  }
  return `sms:?body=${encodeURIComponent(body)}`
}

export function telUrl(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : 'tel:'
}

/** Generic — user may need to pick thread manually. */
export function facebookMessengerWebUrl(): string {
  return 'https://www.messenger.com/'
}

export function instagramWebUrl(): string {
  return 'https://www.instagram.com/direct/inbox/'
}
