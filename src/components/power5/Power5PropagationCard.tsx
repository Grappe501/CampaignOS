import { useState } from 'react'
import type { Power5RelationshipNodeRow } from '../../lib/power5Model'
import {
  usePower5Propagation,
  type Power5PropagationApi,
} from '../../hooks/usePower5Propagation'
import { POWER5_RELAY_BATCH_MAX } from '../../lib/power5TreeRules'

export default function Power5PropagationCard({
  profileId,
  nodes,
  propagation: propagationInjected,
}: {
  profileId: string | undefined
  nodes: Power5RelationshipNodeRow[]
  propagation?: Power5PropagationApi
}) {
  const propagationInternal = usePower5Propagation(profileId)
  const p = propagationInjected ?? propagationInternal
  const [localErr, setLocalErr] = useState<string | null>(null)

  const startRelay = async () => {
    setLocalErr(null)
    try {
      const cid = await p.createManualRelayCampaign()
      if (!cid) return
      const ids = nodes.slice(0, POWER5_RELAY_BATCH_MAX).map((n) => n.id)
      await p.enqueueRelayForNodes(cid, ids)
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Could not start relay')
    }
  }

  return (
    <div className="power5-propagation-card card card--inner stack-section">
      <h3 className="power5-subheading">Manual message relay</h3>
      <p className="subtitle">
        Queue up to <strong>{POWER5_RELAY_BATCH_MAX}</strong> personal relay steps — you still
        deliver each conversation yourself. No blast, no auto-send.
      </p>
      {localErr ? (
        <p className="profile-photo-upload-error" role="alert">
          {localErr}
        </p>
      ) : null}
      {p.error ? (
        <p className="subtitle" role="note">
          {p.error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-touch btn-primary"
        disabled={!profileId || nodes.length === 0 || p.loading}
        onClick={() => void startRelay()}
      >
        Queue next {Math.min(POWER5_RELAY_BATCH_MAX, nodes.length)} relay slots
      </button>
      {p.assignments.length > 0 ? (
        <ul className="power5-relay-queue">
          {p.assignments.map((a) => (
            <li key={a.id} className="power5-relay-queue-item">
              <span className="power5-relay-status">{a.status}</span>
              <button
                type="button"
                className="btn-touch power5-outreach-chip--ghost"
                onClick={() => void p.markAssignmentPrepared(a.id)}
              >
                Mark prepared
              </button>
              <button
                type="button"
                className="btn-touch power5-outreach-chip"
                onClick={() =>
                  void p.logManualDelivery(
                    a.id,
                    'Logged manual delivery from propagation workspace',
                  )
                }
              >
                Log I reached out
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtitle">No open relay steps — start one when you are ready.</p>
      )}
    </div>
  )
}
