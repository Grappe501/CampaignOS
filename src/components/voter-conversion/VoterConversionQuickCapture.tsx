import { useCallback, useEffect, useState } from 'react'
import {
  VOTER_CONTACT_METHODS,
  VOTER_CONVERSION_DISPOSITIONS,
  VOTER_DISPOSITION_LABELS,
  type VoterContactMethod,
  type VoterConversionDisposition,
} from '../../lib/voterConversionDomain'
import { insertVoterConversionAttempt } from '../../lib/voterConversionDb'
import { fetchVoterConversionState } from '../../lib/voterConversionDb'
import type { Power5RelationshipNodeRow } from '../../lib/power5Model'
import { POWER5_CONTACT_LABELS, POWER5_CONTACT_PATHS } from '../../lib/power5Model'

const QUICK_DISPOSITIONS: VoterConversionDisposition[] = [
  'no_answer',
  'supporter',
  'persuadable',
  'commitment_secured',
  'ballot_plan_recorded',
  'needs_relational_followup',
  'chase_later',
  'do_not_contact',
]

function methodFromPower5Preferred(pref: string): VoterContactMethod {
  const p = String(pref ?? '') as VoterContactMethod
  if (VOTER_CONTACT_METHODS.includes(p)) return p
  return 'unknown'
}

export default function VoterConversionQuickCapture({
  profileId,
  node,
}: {
  profileId: string | undefined
  node: Power5RelationshipNodeRow | null
}) {
  const [method, setMethod] = useState<VoterContactMethod>('text')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [stageHint, setStageHint] = useState<string | null>(null)

  const voterId = node?.linked_voter_id ? String(node.linked_voter_id).trim() : ''

  useEffect(() => {
    if (node?.preferred_contact) setMethod(methodFromPower5Preferred(node.preferred_contact))
  }, [node?.preferred_contact, node?.id])

  const refreshHint = useCallback(async () => {
    if (!voterId) {
      setStageHint(null)
      return
    }
    try {
      const st = await fetchVoterConversionState(voterId)
      if (!st) setStageHint('No conversion state yet — first log creates DB posture.')
      else
        setStageHint(
          `DB: ${st.lifecycle_stage.replace(/_/g, ' ')} · chase ${st.chase_sequence_state.replace(/_/g, ' ')}`,
        )
    } catch {
      setStageHint(null)
    }
  }, [voterId])

  useEffect(() => {
    void refreshHint()
  }, [refreshHint])

  const onRecord = async (disposition: VoterConversionDisposition) => {
    if (!profileId || !voterId || !node) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await insertVoterConversionAttempt(profileId, {
        voter_id: voterId,
        contact_method: method,
        disposition,
        power5_node_id: node.id,
        notes: null,
        county_snapshot: null,
      })
      if (!res.ok) {
        setMsg(res.error)
        return
      }
      setMsg('Recorded — state updating.')
      await refreshHint()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (!node) return null

  if (!voterId) {
    return (
      <div className="card card--inner stack-section voter-conversion-card">
        <h3 className="power5-subheading">Turnout conversion</h3>
        <p className="subtitle">
          Link <strong>{node.display_label}</strong> to a voter record to enable fast disposition logging.
        </p>
      </div>
    )
  }

  return (
    <div className="card card--inner stack-section voter-conversion-card">
      <h3 className="power5-subheading">Record contact</h3>
      <p className="subtitle" style={{ marginTop: 0 }}>
        One-tap dispositions for <strong>{node.display_label}</strong> — writes to voter conversion log (DB truth).
      </p>
      {stageHint ? (
        <p className="subtitle" style={{ marginTop: 0 }}>
          {stageHint}
        </p>
      ) : null}
      <label className="power5-field">
        <span className="power5-field-label">Method</span>
        <select
          className="power5-select"
          value={method}
          onChange={(e) => setMethod(e.target.value as VoterContactMethod)}
        >
          {POWER5_CONTACT_PATHS.map((k) => (
            <option key={k} value={k}>
              {POWER5_CONTACT_LABELS[k]}
            </option>
          ))}
          <option value="other">Other</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>
      <p className="subtitle" style={{ margin: '0.5rem 0 0.25rem' }}>
        Outcome
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {QUICK_DISPOSITIONS.map((d) => (
          <button
            key={d}
            type="button"
            className="btn-touch btn-touch--ghost"
            disabled={busy || !profileId}
            onClick={() => void onRecord(d)}
          >
            {VOTER_DISPOSITION_LABELS[d]}
          </button>
        ))}
      </div>
      <details style={{ marginTop: '0.75rem' }}>
        <summary className="subtitle">More outcomes</summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
          {VOTER_CONVERSION_DISPOSITIONS.filter((d) => !QUICK_DISPOSITIONS.includes(d)).map((d) => (
            <button
              key={d}
              type="button"
              className="btn-touch btn-touch--ghost"
              style={{ fontSize: '0.85rem' }}
              disabled={busy || !profileId}
              onClick={() => void onRecord(d)}
            >
              {VOTER_DISPOSITION_LABELS[d]}
            </button>
          ))}
        </div>
      </details>
      {msg ? (
        <p className="subtitle" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  )
}
