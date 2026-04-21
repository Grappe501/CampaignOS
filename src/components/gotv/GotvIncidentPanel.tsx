import { useState } from 'react'
import type { GotvPollingPlaceRow } from '../../lib/gotvDomain'
import { GOTV_INCIDENT_KINDS, GOTV_INCIDENT_SEVERITY } from '../../lib/gotvDomain'
import { insertGotvIncident, logGotvIntervention } from '../../lib/gotvDb'
import type { GotvIncidentSeverity } from '../../lib/gotvDomain'

export default function GotvIncidentPanel({
  campaignId,
  sites,
  onLogged,
}: {
  campaignId: string
  sites: readonly GotvPollingPlaceRow[]
  onLogged: () => void
}) {
  const [siteId, setSiteId] = useState('')
  const [kind, setKind] = useState<string>(GOTV_INCIDENT_KINDS[0]!)
  const [severity, setSeverity] = useState<GotvIncidentSeverity>('watch')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null)
    if (!siteId) {
      setErr('Select a site.')
      return
    }
    const trimmed = message.trim()
    if (!trimmed) {
      setErr('Describe the incident briefly.')
      return
    }
    setBusy(true)
    try {
      await insertGotvIncident({
        campaignId,
        siteId,
        incidentKind: kind,
        severity,
        message: trimmed,
      })
      await logGotvIntervention({
        campaignId,
        siteId,
        kind: 'incident_logged',
        message: `Incident logged: ${kind}`,
        payload: { severity },
      })
      setMessage('')
      onLogged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (!sites.length) return null

  return (
    <div style={{ marginTop: 16 }}>
      <h3 className="event-coordinator-desk__h2" style={{ fontSize: '1rem' }}>
        Log incident (mobile-friendly)
      </h3>
      <p className="subtitle" style={{ fontSize: '0.8rem' }}>
        Fast field signal — ties to site readiness. Does not page volunteers automatically.
      </p>
      <div className="neighborhood-form" style={{ maxWidth: 480 }}>
        <label>
          Site
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">—</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kind
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {GOTV_INCIDENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select value={severity} onChange={(e) => setSeverity(e.target.value as GotvIncidentSeverity)}>
            {GOTV_INCIDENT_SEVERITY.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          What happened?
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </label>
      </div>
      {err ? (
        <p className="seg-cal__banner" role="alert">
          {err}
        </p>
      ) : null}
      <button type="button" className="btn-touch" disabled={busy} onClick={() => void submit()}>
        {busy ? 'Saving…' : 'Log incident'}
      </button>
    </div>
  )
}
