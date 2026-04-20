import { useCallback, useEffect, useState } from 'react'
import type { PublicOfficialEntry } from '../../lib/api/publicOfficials'
import {
  channelLinksFromOfficial,
  formatOfficialAddresses,
  formatOfficialForClipboard,
} from '../../lib/officialContact'

function CopyValueButton({
  label,
  value,
  ariaLabel,
}: {
  label: string
  value: string
  ariaLabel: string
}) {
  const [done, setDone] = useState(false)

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setDone(true)
      window.setTimeout(() => setDone(false), 2000)
    })
  }, [value])

  if (!value.trim()) return null

  return (
    <div className="official-contact-copy-row">
      <div className="official-contact-copy-row__main">
        <span className="official-contact-copy-row__label">{label}</span>
        <span className="official-contact-copy-row__value">{value}</span>
      </div>
      <button
        type="button"
        className="official-contact-copy-btn"
        onClick={copy}
        aria-label={ariaLabel}
      >
        {done ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export default function OfficialContactModal({
  official,
  onClose,
}: {
  official: PublicOfficialEntry | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!official) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [official, onClose])

  if (!official) return null

  const addresses = formatOfficialAddresses(official)
  const channels = channelLinksFromOfficial(official)
  const fullBlock = formatOfficialForClipboard(official)

  return (
    <div
      className="official-contact-modal-root"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="official-contact-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="official-contact-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="official-contact-modal__head">
          <h2 id="official-contact-title" className="official-contact-modal__title">
            {official.name}
          </h2>
          <button
            type="button"
            className="official-contact-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="official-contact-modal__office">{official.office}</p>
        {official.party ? (
          <p className="official-contact-modal__party">{official.party}</p>
        ) : null}

        {official.photoUrl ? (
          <div className="official-contact-modal__photo-wrap">
            <img
              src={official.photoUrl}
              alt=""
              className="official-contact-modal__photo"
              width={120}
              height={120}
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="official-contact-modal__actions">
          <button
            type="button"
            className="btn-touch official-contact-copy-all"
            onClick={() => {
              void navigator.clipboard.writeText(fullBlock)
            }}
          >
            Copy all contact info
          </button>
        </div>

        <div className="official-contact-modal__body">
          {addresses.map((block, i) => (
            <CopyValueButton
              key={`addr-${i}`}
              label={i === 0 ? 'Office address' : `Address ${i + 1}`}
              value={block}
              ariaLabel={`Copy address ${i + 1}`}
            />
          ))}

          {official.phones?.map((p, i) => (
            <CopyValueButton
              key={`ph-${i}`}
              label={official.phones!.length > 1 ? `Phone ${i + 1}` : 'Phone'}
              value={p}
              ariaLabel={`Copy phone ${p}`}
            />
          ))}

          {official.emails?.map((em, i) => (
            <CopyValueButton
              key={`em-${i}`}
              label={official.emails!.length > 1 ? `Email ${i + 1}` : 'Email'}
              value={em}
              ariaLabel={`Copy email ${em}`}
            />
          ))}

          {official.urls?.map((u, i) => (
            <div className="official-contact-copy-row" key={`url-${i}`}>
              <div className="official-contact-copy-row__main">
                <span className="official-contact-copy-row__label">
                  {official.urls!.length > 1 ? `Website ${i + 1}` : 'Website'}
                </span>
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="official-contact-copy-row__link"
                >
                  {u}
                </a>
              </div>
              <button
                type="button"
                className="official-contact-copy-btn"
                onClick={() => void navigator.clipboard.writeText(u)}
                aria-label="Copy website URL"
              >
                Copy
              </button>
            </div>
          ))}

          {channels.map(({ label, url }) => (
            <div className="official-contact-copy-row" key={`${label}-${url}`}>
              <div className="official-contact-copy-row__main">
                <span className="official-contact-copy-row__label">{label}</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="official-contact-copy-row__link"
                >
                  {url}
                </a>
              </div>
              <button
                type="button"
                className="official-contact-copy-btn"
                onClick={() => void navigator.clipboard.writeText(url)}
                aria-label={`Copy ${label} link`}
              >
                Copy
              </button>
            </div>
          ))}

          {!addresses.length &&
          !official.phones?.length &&
          !official.emails?.length &&
          !official.urls?.length &&
          !channels.length ? (
            <p className="subtitle" style={{ margin: 0 }}>
              No extra contact fields returned for this office yet. Try their
              website link from the full officials list when available.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
