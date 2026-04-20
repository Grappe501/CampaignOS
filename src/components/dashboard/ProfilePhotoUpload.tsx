import { useRef, useState } from 'react'
import { isDevAuthBypassEnabled } from '../../lib/devAuth'
import { setDevProfilePhotoDataUrl } from '../../lib/devProfilePhoto'
import {
  humanizeProfilePhotoStorageError,
  persistProfilePhotoUrl,
  uploadProfilePhotoToStorage,
  validateProfilePhotoFile,
} from '../../lib/uploadProfilePhoto'

function CameraGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function TrashGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

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
      const raw = err instanceof Error ? err.message : 'Upload failed'
      setError(humanizeProfilePhotoStorageError(raw))
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
      const raw = err instanceof Error ? err.message : 'Could not remove photo'
      setError(humanizeProfilePhotoStorageError(raw))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="profile-photo-upload profile-photo-upload--compact">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="profile-photo-upload-input"
        aria-label="Choose profile photo file"
        disabled={busy}
        onChange={(ev) => void onChange(ev)}
      />
      <div className="profile-photo-upload-actions">
        <button
          type="button"
          className="profile-photo-upload-icon-btn"
          disabled={busy}
          onClick={pickFile}
          title={hasCustomPhoto ? 'Change photo' : 'Add photo'}
          aria-label={
            busy
              ? 'Working on photo'
              : hasCustomPhoto
                ? 'Change profile photo'
                : 'Add profile photo'
          }
        >
          {busy ? (
            <span className="profile-photo-upload-spinner" aria-hidden />
          ) : (
            <CameraGlyph />
          )}
        </button>
        {hasCustomPhoto ? (
          <button
            type="button"
            className="profile-photo-upload-icon-btn profile-photo-upload-icon-btn--danger"
            disabled={busy}
            onClick={() => void clearPhoto()}
            title="Remove photo"
            aria-label="Remove profile photo"
          >
            <TrashGlyph />
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="profile-photo-upload-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
