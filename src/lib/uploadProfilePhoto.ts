import { supabase } from './supabaseClient'

export const PROFILE_PHOTOS_BUCKET = 'profile-photos'

/** User-facing copy when Supabase Storage returns opaque errors. */
export function humanizeProfilePhotoStorageError(raw: string): string {
  const m = raw.trim().toLowerCase()
  if (m.includes('bucket not found')) {
    return 'Photo storage is not enabled on this Supabase project yet. A campaign admin should create the public “profile-photos” bucket and policies (see migration 20260425140000_profile_photo_storage.sql), then try again.'
  }
  if (
    m.includes('jwt') ||
    m.includes('not authorized') ||
    m.includes('permission denied') ||
    m.includes('row-level security')
  ) {
    return 'Your session cannot upload right now. Sign out and sign back in, then try again.'
  }
  if (m.includes('payload too large') || m.includes('413')) {
    return 'File is too large for storage. Use an image under 3 MB.'
  }
  return raw
}

const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

export function validateProfilePhotoFile(file: File): string | null {
  if (!file || !ALLOWED.has(file.type)) {
    return 'Please choose a JPEG, PNG, WebP, or GIF image.'
  }
  if (file.size > MAX_BYTES) {
    return 'Image must be 3 MB or smaller.'
  }
  return null
}

/**
 * Uploads to `profile-photos/{user_id}/{uuid}.ext` and returns the public URL.
 */
export async function uploadProfilePhotoToStorage(file: File): Promise<string> {
  const msg = validateProfilePhotoFile(file)
  if (msg) throw new Error(msg)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    throw new Error('You need to be signed in to upload a photo.')
  }

  const ext = extForMime(file.type)
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (upErr) {
    console.error('Storage upload:', upErr)
    throw new Error(upErr.message || 'Upload failed')
  }

  const { data } = supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .getPublicUrl(path)

  if (!data?.publicUrl) {
    throw new Error('Could not get public URL for upload.')
  }

  return data.publicUrl
}

export async function persistProfilePhotoUrl(
  profileId: string,
  publicUrl: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('campaign_profiles')
    .update({
      profile_photo_url: publicUrl,
    })
    .eq('id', profileId)

  if (error) {
    console.error('profile_photo_url update:', error)
    throw new Error(error.message || 'Could not save photo on your profile.')
  }
}
