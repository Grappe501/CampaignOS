import { useRef, useState } from 'react'
import { isDevAuthBypassEnabled } from '../../lib/devAuth'
import { setDevProfilePhotoDataUrl } from '../../lib/devProfilePhoto'
import {
  persistProfilePhotoUrl,
  uploadProfilePhotoToStorage,
  validateProfilePhotoFile,
} from '../../lib/uploadProfilePhoto'

export default function ProfilePhotoUpload({
  profileId,
  hasCustomPhoto,
  onDone,
}: {
  profileId: string | undefined
  hasCustomPhoto: boolean
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickFile = () => {
    setError(null)
    inputRef.current?.click()
  }

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const v = validateProfilePhotoFile(file)
    if (v) {
      setError(v)
      return
    }

    setBusy(true)
    setError(null)

    try {
      if (isDevAuthBypassEnabled()) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result ?? ''))
          r.onerror = () => reject(new Error('Could not read image'))
          r.readAsDataURL(file)
        })
        if (!dataUrl.startsWith('data:image/')) {
          throw new Error('Invalid image data')
        }
        setDevProfilePhotoDataUrl(dataUrl)
        onDone()
        return
      }

      if (!profileId) {
        throw new Error('Profile not ready — refresh and try again.')
      }

      const url = await uploadProfilePhotoToStorage(file)
      await persistProfilePhotoUrl(profileId, url)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const clearPhoto = async () => {
    setBusy(true)
    setError(null)
    try {
      if (isDevAuthBypassEnabled()) {
        setDevProfilePhotoDataUrl(null)
        onDone()
        return
      }
      if (!profileId) {
        throw new Error('Profile not ready')
      }
      await persistProfilePhotoUrl(profileId, null)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove photo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="profile-photo-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="profile-photo-upload-input"
        aria-label="Upload your profile photo"
        disabled={busy}
        onChange={(ev) => void onChange(ev)}
      />
      <div className="profile-photo-upload-actions">
        <button
          type="button"
          className="btn-touch profile-photo-upload-btn"
          disabled={busy}
          onClick={pickFile}
        >
          {busy ? 'Working…' : hasCustomPhoto ? 'Change photo' : 'Your photo'}
        </button>
        {hasCustomPhoto ? (
          <button
            type="button"
            className="btn-touch profile-photo-upload-clear"
            disabled={busy}
            onClick={() => void clearPhoto()}
          >
            Remove
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="profile-photo-upload-error subtitle" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
