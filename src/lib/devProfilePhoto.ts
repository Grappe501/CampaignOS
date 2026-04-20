import { isDevAuthBypassEnabled } from './devAuth'

const KEY = 'campaignos-dev-profile-photo-dataurl'

export function readDevProfilePhotoPatch(): { profile_photo_url?: string } {
  if (!isDevAuthBypassEnabled()) return {}
  try {
    const v = sessionStorage.getItem(KEY)
    if (v && v.startsWith('data:image/')) {
      return { profile_photo_url: v }
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function setDevProfilePhotoDataUrl(dataUrl: string | null): void {
  if (!isDevAuthBypassEnabled()) return
  try {
    if (dataUrl) {
      sessionStorage.setItem(KEY, dataUrl)
    } else {
      sessionStorage.removeItem(KEY)
    }
  } catch {
    /* ignore */
  }
}
