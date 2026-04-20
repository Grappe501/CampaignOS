import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  POWER5_CONTACT_LABELS,
  POWER5_CONTACT_PATHS,
  POWER5_RELATIONSHIP_KINDS,
  POWER5_RELATIONSHIP_LABELS,
  type Power5RelationshipKind,
  type Power5RelationshipNodeRow,
} from '../../lib/power5Model'
import { createPower5RecruitmentLink } from '../../lib/power5Recruitment'
import { suggestInviteNote, suggestOutreachMessage } from '../../lib/messageAssist'
import { telUrl } from '../../lib/outreachChannels'
import { usePower5Workspace } from '../../hooks/usePower5Workspace'
import { usePower5Outreach } from '../../hooks/usePower5Outreach'
import ConnectedAccountsScaffold from './ConnectedAccountsScaffold'
import OutreachAssistModal from './OutreachAssistModal'
import { Power5NodeCard } from './Power5NodePanel'
import Power5TreeView from './Power5TreeView'
import Power5ImpactPanel from './Power5ImpactPanel'
import Power5ContactPlanCard from './Power5ContactPlanCard'
import Power5PropagationCard from './Power5PropagationCard'
import type { Power5PropagationApi } from '../../hooks/usePower5Propagation'

export type Power5WorkspaceApi = ReturnType<typeof usePower5Workspace>

function scrollToVoterWorkspace() {
  document.getElementById('voter-workspace')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

type AssistState = {
  nodeId: string
  personLabel: string
  mode: 'message' | 'invite'
  draft: string
  inviteUrl: string | null
  actionId: string | null
}

export default function Power5Workspace({
  profileId,
  homeTeamId,
  matchedVoterId,
  workspace: workspaceInjected,
  propagation: propagationInjected,
}: {
  profileId: string | undefined
  homeTeamId: string | undefined
  matchedVoterId?: string | null
  /** When provided (e.g. from Dashboard), avoids duplicate workspace fetches. */
  workspace?: Power5WorkspaceApi
  propagation?: Power5PropagationApi
}) {
  const workspaceInternal = usePower5Workspace(profileId)
  const {
    nodes,
    progressStates,
    loading,
    error,
    impact,
    addNode,
    updateNode,
    deleteNode,
  } = workspaceInjected ?? workspaceInternal

  const outreach = usePower5Outreach(profileId)
  const { syncContactsForNodes } = outreach

  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<Power5RelationshipKind>('friend')
  const [strength, setStrength] = useState(3)
  const [contact, setContact] = useState<string>('text')
  const [nextStep, setNextStep] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [localErr, setLocalErr] = useState<string | null>(null)
  const [assist, setAssist] = useState<AssistState | null>(null)

  useEffect(() => {
    if (!profileId || !nodes.length) return
    void syncContactsForNodes(nodes.map((n) => n.id))
  }, [profileId, nodes, syncContactsForNodes])

  const onAdd = useCallback(async () => {
    if (!label.trim()) {
      setLocalErr('Add a name or short label for this person.')
      return
    }
    setSaving(true)
    setLocalErr(null)
    try {
      await addNode({
        display_label: label.trim(),
        relationship_kind: kind,
        connection_strength: strength,
        preferred_contact: contact,
        next_step: nextStep.trim() || null,
        team_id: homeTeamId ?? null,
      })
      setLabel('')
      setNextStep('')
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }, [addNode, label, kind, strength, contact, nextStep, homeTeamId])

  const createInvite = useCallback(async () => {
    if (!profileId || !homeTeamId) {
      setLocalErr('Team not ready yet — refresh in a moment.')
      return
    }
    setInviteBusy(true)
    setLocalErr(null)
    try {
      const { inviteToken: t } = await createPower5RecruitmentLink({
        recruiterProfileId: profileId,
        teamId: homeTeamId,
        personalizationNote: 'Join my Power of 5 — we grow trust one conversation at a time.',
      })
      setInviteToken(t)
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Invite failed')
    } finally {
      setInviteBusy(false)
    }
  }, [profileId, homeTeamId])

  const openMessageAssist = useCallback(
    async (n: Power5RelationshipNodeRow) => {
      setLocalErr(null)
      try {
        const draft = suggestOutreachMessage(n.display_label, n.relationship_kind)
        const actionId = await outreach.createAction({
          nodeId: n.id,
          kind: 'message',
          suggestedCopy: draft,
        })
        setAssist({
          nodeId: n.id,
          personLabel: n.display_label,
          mode: 'message',
          draft,
          inviteUrl: null,
          actionId: actionId ?? null,
        })
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : 'Could not open message helper')
      }
    },
    [outreach],
  )

  const openInviteAssist = useCallback(
    async (n: Power5RelationshipNodeRow) => {
      if (!profileId || !homeTeamId) {
        setLocalErr('Team not ready — try again shortly.')
        return
      }
      setLocalErr(null)
      try {
        const draft = suggestInviteNote(n.display_label)
        const { inviteToken: t } = await createPower5RecruitmentLink({
          recruiterProfileId: profileId,
          teamId: homeTeamId,
          personalizationNote: draft.slice(0, 2000),
        })
        const inviteUrl = `${window.location.origin}/join?p5=${encodeURIComponent(t)}`
        const actionId = await outreach.createAction({
          nodeId: n.id,
          kind: 'invite',
          suggestedCopy: draft,
        })
        setAssist({
          nodeId: n.id,
          personLabel: n.display_label,
          mode: 'invite',
          draft,
          inviteUrl,
          actionId: actionId ?? null,
        })
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : 'Invite helper failed')
      }
    },
    [profileId, homeTeamId, outreach],
  )

  const logInPerson = useCallback(
    async (n: Power5RelationshipNodeRow) => {
      try {
        await outreach.logActivity({
          nodeId: n.id,
          eventType: 'in_person',
          channel: 'face_to_face',
        })
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : 'Log failed')
      }
    },
    [outreach],
  )

  const logCallOpened = useCallback(
    async (n: Power5RelationshipNodeRow) => {
      try {
        await outreach.logActivity({
          nodeId: n.id,
          eventType: 'channel_opened',
          channel: 'phone_call',
        })
        window.location.href = telUrl('')
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : 'Log failed')
      }
    },
    [outreach],
  )

  const logResponseQuick = useCallback(
    async (n: Power5RelationshipNodeRow) => {
      const note = window.prompt('Their response or your note (optional, stays private to you):')
      if (note === null) return
      try {
        await outreach.logActivity({
          nodeId: n.id,
          eventType: 'response_logged',
          note: note.trim() || null,
        })
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : 'Log failed')
      }
    },
    [outreach],
  )

  const onAssistChannelOpened = useCallback(
    async (channel: string) => {
      if (!assist?.actionId) return
      try {
        await outreach.updateAction(assist.actionId, {
          status: 'opened',
          opened_platform: channel,
        })
        await outreach.logActivity({
          nodeId: assist.nodeId,
          eventType: 'channel_opened',
          channel,
          outreachActionId: assist.actionId,
        })
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : 'Log failed')
      }
    },
    [assist, outreach],
  )

  const onAssistMessageSent = useCallback(async () => {
    if (!assist) return
    try {
      if (assist.actionId) {
        await outreach.updateAction(assist.actionId, {
          status: 'completed',
          suggested_copy: assist.draft,
        })
      }
      await outreach.logActivity({
        nodeId: assist.nodeId,
        eventType: 'message_sent',
        outreachActionId: assist.actionId,
      })
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Log failed')
    }
  }, [assist, outreach])

  const onAssistInviteSent = useCallback(async () => {
    if (!assist) return
    try {
      if (assist.actionId) {
        await outreach.updateAction(assist.actionId, {
          status: 'completed',
          suggested_copy: assist.draft,
        })
      }
      await outreach.logActivity({
        nodeId: assist.nodeId,
        eventType: 'invitation_sent',
        outreachActionId: assist.actionId,
      })
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Log failed')
    }
  }, [assist, outreach])

  const onOptInToggle = useCallback(
    async (platform: string, next: 'not_connected' | 'pending') => {
      try {
        await outreach.setAccountStatus(platform, { connection_status: next })
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : 'Could not update channel')
      }
    },
    [outreach],
  )

  const statusOptions = useMemo(
    () => progressStates.map((s) => ({ value: s.key, label: s.label })),
    [progressStates],
  )

  return (
    <section
      id="power5-workspace"
      className="card stack-section power5-workspace"
      aria-labelledby="power5-workspace-title"
    >
      <h2 id="power5-workspace-title" className="page-title power5-workspace-title">
        Your Power of 5
      </h2>
      <p className="subtitle power5-workspace-lede">
        Trust beats transactions. Name people you know — then reach them your way. Five
        strong relationships → twenty-five → one-hundred-twenty-five when everyone brings
        their five.
      </p>

      <Power5ImpactPanel impact={impact} />

      <Power5TreeView nodes={nodes} />

      <Power5ContactPlanCard spotlightNode={nodes[0] ?? null} />

      {error ? (
        <p className="subtitle" role="alert">
          {error}
        </p>
      ) : null}
      {localErr ? (
        <p className="profile-photo-upload-error" role="alert">
          {localErr}
        </p>
      ) : null}

      <div className="power5-workspace-lower">
        <div className="power5-workspace-lower-col power5-workspace-lower-col--growth">
          <Power5PropagationCard
            profileId={profileId}
            nodes={nodes}
            propagation={propagationInjected}
          />

          <ConnectedAccountsScaffold
            accounts={outreach.accounts}
            loading={outreach.loading}
            onOptInToggle={onOptInToggle}
          />
        </div>

        <div className="power5-workspace-lower-col power5-workspace-lower-col--outreach">
      <div className="power5-add-form">
        <label className="power5-field">
          <span className="power5-field-label">Who comes to mind?</span>
          <input
            type="text"
            className="power5-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="First name or how you know them"
            maxLength={200}
            autoComplete="off"
          />
        </label>
        <div className="power5-field-row">
          <label className="power5-field">
            <span className="power5-field-label">How you connect</span>
            <select
              className="power5-select"
              value={kind}
              onChange={(e) => setKind(e.target.value as Power5RelationshipKind)}
            >
              {POWER5_RELATIONSHIP_KINDS.map((k) => (
                <option key={k} value={k}>
                  {POWER5_RELATIONSHIP_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="power5-field">
            <span className="power5-field-label">Strength (1–5)</span>
            <input
              type="range"
              min={1}
              max={5}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="power5-range"
            />
            <span className="power5-range-val">{strength}</span>
          </label>
        </div>
        <div className="power5-field-row">
          <label className="power5-field">
            <span className="power5-field-label">Best way to reach</span>
            <select
              className="power5-select"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            >
              {POWER5_CONTACT_PATHS.map((c) => (
                <option key={c} value={c}>
                  {POWER5_CONTACT_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="power5-field power5-field--grow">
            <span className="power5-field-label">Next step (optional)</span>
            <input
              type="text"
              className="power5-input"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="e.g. Coffee Saturday"
              maxLength={500}
            />
          </label>
        </div>
        <button
          type="button"
          className="btn-touch btn-primary power5-add-btn"
          disabled={saving || !profileId}
          onClick={() => void onAdd()}
        >
          {saving ? 'Adding…' : 'Add to my list'}
        </button>
      </div>

      <div className="power5-side-actions">
        <button type="button" className="btn-touch power5-secondary-btn" onClick={scrollToVoterWorkspace}>
          Roster lookup (side panel)
        </button>
        <button
          type="button"
          className="btn-touch power5-secondary-btn"
          disabled={inviteBusy || !profileId}
          onClick={() => void createInvite()}
        >
          {inviteBusy ? 'Creating…' : 'Create invite link'}
        </button>
      </div>
      {inviteToken ? (
        <div className="power5-invite-token">
          <span className="power5-field-label">Share token (QR-ready record in database)</span>
          <code className="power5-token-code">{inviteToken}</code>
        </div>
      ) : null}

      <h3 className="power5-outreach-heading">Personal outreach (your taps only)</h3>
      <p className="subtitle power5-outreach-sub">
        No bulk sends. Buttons open your apps or log what you did — you stay in control.
      </p>

      {loading ? (
        <p className="subtitle">Loading your list…</p>
      ) : nodes.length === 0 ? (
        <p className="subtitle">Your working list is empty — add someone you trust above.</p>
      ) : (
        <ul className="power5-node-list">
          {nodes.map((n) => (
            <Power5NodeCard
              key={n.id}
              node={n}
              outreachSummary={outreach.contactsByNode.get(n.id)}
              statusOptions={statusOptions}
              matchedVoterId={matchedVoterId}
              onUpdate={updateNode}
              onDelete={deleteNode}
              onTalkInPerson={() => void logInPerson(n)}
              onCall={() => void logCallOpened(n)}
              onMessage={() => void openMessageAssist(n)}
              onInvite={() => void openInviteAssist(n)}
              onLogResponse={() => void logResponseQuick(n)}
            />
          ))}
        </ul>
      )}
        </div>
      </div>

      <OutreachAssistModal
        open={assist != null}
        mode={assist?.mode ?? 'message'}
        personLabel={assist?.personLabel ?? ''}
        draft={assist?.draft ?? ''}
        inviteUrl={assist?.inviteUrl}
        onClose={() => setAssist(null)}
        onDraftChange={(next) =>
          setAssist((s) => (s ? { ...s, draft: next } : s))
        }
        onLogChannelOpened={(ch) => void onAssistChannelOpened(ch)}
        onLogMessageSent={() => void onAssistMessageSent()}
        onLogInviteSent={() => void onAssistInviteSent()}
      />
    </section>
  )
}
