import { useState } from 'react'
import {
  POWER5_CONTACT_LABELS,
  POWER5_CONTACT_PATHS,
  POWER5_RELATIONSHIP_LABELS,
  type Power5RelationshipKind,
  type Power5RelationshipNodeRow,
} from '../../lib/power5Model'
import { contactStrategySummary } from '../../lib/power5ContactStrategy'
import type { OutreachContactRow } from '../../lib/outreachModel'

export function Power5NodeCard({
  node,
  outreachSummary,
  statusOptions,
  matchedVoterId,
  onUpdate,
  onDelete,
  onTalkInPerson,
  onCall,
  onMessage,
  onInvite,
  onLogResponse,
}: {
  node: Power5RelationshipNodeRow
  outreachSummary?: OutreachContactRow
  statusOptions: { value: string; label: string }[]
  matchedVoterId?: string | null
  onUpdate: (
    id: string,
    p: Partial<{
      progress_state_key: string
      preferred_contact: string
      next_step: string | null
      linked_voter_id: string | null
    }>,
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTalkInPerson: () => void
  onCall: () => void
  onMessage: () => void
  onInvite: () => void
  onLogResponse: () => void
}) {
  const [busy, setBusy] = useState(false)

  const statusLabel =
    statusOptions.find((o) => o.value === node.progress_state_key)?.label ??
    node.progress_state_key

  return (
    <li className="power5-node-card">
      <div className="power5-node-head">
        <strong className="power5-node-label">{node.display_label}</strong>
        <span className="power5-node-meta">
          {POWER5_RELATIONSHIP_LABELS[node.relationship_kind as Power5RelationshipKind] ??
            node.relationship_kind}{' '}
          · strength {node.connection_strength}
        </span>
      </div>
      <p className="subtitle power5-strategy-hint" style={{ margin: '6px 0 0' }}>
        <strong>Suggested order:</strong> {contactStrategySummary(node)}
      </p>
      <div className="power5-outreach-summary">
        <span className="power5-outreach-summary-k">Status</span>
        <span className="power5-outreach-summary-v">{statusLabel}</span>
        <span className="power5-outreach-summary-k">Next step</span>
        <span className="power5-outreach-summary-v">
          {node.next_step?.trim() ? node.next_step : '—'}
        </span>
        {outreachSummary?.last_contacted_at ? (
          <>
            <span className="power5-outreach-summary-k">Last outreach</span>
            <span className="power5-outreach-summary-v">
              {new Date(outreachSummary.last_contacted_at).toLocaleString()}
            </span>
          </>
        ) : null}
      </div>
      <div className="power5-outreach-actions" role="group" aria-label="Outreach actions">
        <button type="button" className="btn-touch power5-outreach-chip" onClick={onTalkInPerson}>
          Talk in person
        </button>
        <button type="button" className="btn-touch power5-outreach-chip" onClick={onCall}>
          Call
        </button>
        <button type="button" className="btn-touch power5-outreach-chip" onClick={onMessage}>
          Message
        </button>
        <button type="button" className="btn-touch power5-outreach-chip" onClick={onInvite}>
          Invite
        </button>
        <button
          type="button"
          className="btn-touch power5-outreach-chip power5-outreach-chip--ghost"
          onClick={onLogResponse}
        >
          Log response
        </button>
      </div>
      <div className="power5-node-fields">
        <label className="power5-field power5-field--inline">
          <span className="power5-field-label">Status</span>
          <select
            className="power5-select"
            value={node.progress_state_key}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value
              setBusy(true)
              void onUpdate(node.id, { progress_state_key: v }).finally(() => setBusy(false))
            }}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="power5-field power5-field--inline">
          <span className="power5-field-label">Reach</span>
          <select
            className="power5-select"
            value={node.preferred_contact}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value
              setBusy(true)
              void onUpdate(node.id, { preferred_contact: v }).finally(() => setBusy(false))
            }}
          >
            {POWER5_CONTACT_PATHS.map((c) => (
              <option key={c} value={c}>
                {POWER5_CONTACT_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="power5-field">
        <span className="power5-field-label">Next step</span>
        <input
          type="text"
          className="power5-input"
          defaultValue={node.next_step ?? ''}
          disabled={busy}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v === (node.next_step ?? '')) return
            setBusy(true)
            void onUpdate(node.id, { next_step: v || null }).finally(() => setBusy(false))
          }}
        />
      </label>
      {matchedVoterId && !node.linked_voter_id ? (
        <button
          type="button"
          className="btn-touch power5-link-match"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void onUpdate(node.id, {
              linked_voter_id: matchedVoterId,
              progress_state_key: 'matched_voter',
            }).finally(() => setBusy(false))
          }}
        >
          Attach my roster match to this person
        </button>
      ) : null}
      {node.linked_voter_id ? (
        <p className="subtitle power5-linked-hint">Linked to your roster match (ID on file).</p>
      ) : null}
      <button
        type="button"
        className="btn-touch power5-remove"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void onDelete(node.id).finally(() => setBusy(false))
        }}
      >
        Remove from list
      </button>
    </li>
  )
}
