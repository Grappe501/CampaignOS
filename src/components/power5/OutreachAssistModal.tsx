import { useEffect, useState } from 'react'
import { gmailComposeUrl, smsComposeUrl } from '../../lib/outreachChannels'

export default function OutreachAssistModal({
  open,
  mode,
  personLabel,
  draft,
  inviteUrl,
  onClose,
  onDraftChange,
  onLogChannelOpened,
  onLogMessageSent,
  onLogInviteSent,
}: {
  open: boolean
  mode: 'message' | 'invite'
  personLabel: string
  draft: string
  inviteUrl?: string | null
  onClose: () => void
  onDraftChange: (next: string) => void
  onLogChannelOpened: (channel: string) => void
  onLogMessageSent: () => void
  onLogInviteSent: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      void Promise.resolve().then(() => setCopied(false))
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])

  if (!open) return null

  const subj =
    mode === 'invite'
      ? `Join my Power of 5 — Chris Jones for Congress`
      : `Quick note — Chris Jones for Congress`

  const openGmail = () => {
    onLogChannelOpened('gmail')
    window.open(gmailComposeUrl(subj, draft), '_blank', 'noopener,noreferrer')
  }

  const openSms = () => {
    onLogChannelOpened('sms')
    window.location.href = smsComposeUrl(draft)
  }

  const copyDraft = () => {
    void navigator.clipboard.writeText(draft).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  const copyInvite = () => {
    if (!inviteUrl) return
    void navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="outreach-assist-modal-root"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="outreach-assist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outreach-assist-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="outreach-assist-modal__head">
          <h2 id="outreach-assist-title" className="outreach-assist-modal__title">
            {mode === 'invite' ? 'Invite' : 'Message'} · {personLabel}
          </h2>
          <button
            type="button"
            className="outreach-assist-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="outreach-assist-modal__warn">
          You send this yourself. CampaignOS does not deliver messages.
        </p>
        <label className="power5-field">
          <span className="power5-field-label">Your text (edit freely)</span>
          <textarea
            className="input-stretch outreach-assist-textarea"
            rows={mode === 'invite' ? 7 : 9}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
          />
        </label>
        <div className="outreach-assist-actions">
          <button type="button" className="btn-touch outreach-assist-copy" onClick={copyDraft}>
            {copied ? 'Copied' : 'Copy text'}
          </button>
          {mode === 'message' ? (
            <>
              <button type="button" className="btn-touch btn-primary" onClick={openGmail}>
                Open Gmail (compose)
              </button>
              <button type="button" className="btn-touch btn-primary" onClick={openSms}>
                Open SMS app
              </button>
              <button
                type="button"
                className="btn-touch power5-secondary-btn"
                onClick={() => {
                  onLogMessageSent()
                  onClose()
                }}
              >
                Log: I sent a message
              </button>
            </>
          ) : (
            <>
              {inviteUrl ? (
                <>
                  <code className="outreach-assist-invite-url">{inviteUrl}</code>
                  <button type="button" className="btn-touch btn-primary" onClick={copyInvite}>
                    Copy invite link
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="btn-touch power5-secondary-btn"
                onClick={() => {
                  onLogInviteSent()
                  onClose()
                }}
              >
                Log: I shared an invite
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
