import { useState } from 'react'
import { normalizeKey } from '../../lib/dashboardState'
import { useExceptionRequest } from '../../hooks/useExceptionRequest'

export default function ExceptionRequestCard({
  profileId,
  status,
  note,
  voterMatched,
  onSubmitted,
}: {
  profileId: string | undefined
  status: string | null | undefined
  note: string | null | undefined
  voterMatched: boolean
  onSubmitted: () => void
}) {
  const { submit, saving, error } = useExceptionRequest(profileId, onSubmitted)
  const [draft, setDraft] = useState('')
  const st = normalizeKey(status) || 'none'

  if (!profileId) return null

  if (voterMatched && (st === 'none' || st === '')) {
    return null
  }

  if (st === 'approved' && !voterMatched) {
    return (
      <section
        id="exception-request"
        className="card stack-section"
        aria-label="Roster exception"
      >
        <h2
          className="page-title"
          style={{
            fontSize: 'clamp(1.1rem, 2.5vw + 0.45rem, 1.45rem)',
            margin: 0,
          }}
        >
          Roster exception approved
        </h2>
        <p className="subtitle" style={{ margin: 0 }}>
          Coordinators approved your path without a voter-file self-match. Continue
          with workspace orientation and training cards below.
        </p>
      </section>
    )
  }

  return (
    <section
      id="exception-request"
      className="card stack-section"
      aria-labelledby="exception-request-title"
    >
      <h2
        id="exception-request-title"
        className="page-title"
        style={{
          fontSize: 'clamp(1.1rem, 2.5vw + 0.45rem, 1.45rem)',
          margin: 0,
        }}
      >
        Roster exception
      </h2>

      {st === 'pending' ? (
        <>
          <p className="subtitle" style={{ margin: 0, fontWeight: 600 }}>
            Status: pending review
          </p>
          <p className="subtitle" style={{ margin: 0 }}>
            Coordinators can approve or deny from the admin console. You keep
            base volunteer access while this is open.
          </p>
          {note ? (
            <blockquote className="exception-note-preview">{note}</blockquote>
          ) : null}
        </>
      ) : null}

      {st === 'denied' ? (
        <p
          className="subtitle"
          role="status"
          style={{ margin: 0, color: '#b45309' }}
        >
          Your last request was not approved. Update your note and resubmit, or
          complete voter self-match above.
        </p>
      ) : null}

      {(!voterMatched || st === 'denied') && st !== 'pending' ? (
        <>
          <p className="subtitle" style={{ margin: 0 }}>
            Use this if you cannot complete Arkansas voter self-match right now
            (youth volunteer, out-of-state supporter, HQ placement, etc.). Keep
            it short and non-sensitive.
          </p>
          <div className="field-block" style={{ marginBottom: 0 }}>
            <label htmlFor="exception-note">Note to coordinators</label>
            <textarea
              id="exception-note"
              className="input-stretch exception-textarea"
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
              placeholder="Example: HQ staff created my login; I will not appear in raw_vr."
            />
          </div>
          {error ? (
            <p role="alert" className="subtitle" style={{ color: '#b91c1c', margin: 0 }}>
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="btn-touch btn-primary"
            disabled={saving || !draft.trim()}
            onClick={() =>
              void submit(draft).then((ok) => {
                if (ok) setDraft('')
              })
            }
          >
            {saving ? 'Submitting…' : 'Submit exception request'}
          </button>
        </>
      ) : null}
    </section>
  )
}
