import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CampaignProfile } from '../../../hooks/useProfile'
import {
  campaignEventRecordPath,
  campaignEventRecordSectionPath,
  EVENT_RECORD_DETAIL_SECTION_DOM_IDS,
} from '../../../lib/campaignEventSystem'
import { EVENT_STAFF_ROLE_SLUGS } from '../../../lib/eventStaffingMatrix'
import { executeRapidAction, type RapidActionMutationPayload } from '../../../lib/rapidActionMutations'
import {
  getRapidActionDefinition,
  listRapidActionsForContext,
  rapidActionTierFromProfile,
} from '../../../lib/rapidActionsService'
import type { RapidActionContext, RapidActionType } from '../../../lib/rapidActionSchemas'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from '../../../lib/eventStaffingMatrix'
import { precheckRapidAction } from '../../../lib/rapidActionPrecheck'

type RapidActionsBarProps = {
  context: RapidActionContext
  profile: CampaignProfile | null
  onAfterAction?: () => void
  compact?: boolean
  operationalEvent?: CampaignCalendarEventRecord | null
  campaignEvents?: readonly CampaignCalendarEventRecord[]
  assignmentMap?: Map<string, StaffingAssignmentLike[]>
}

export default function RapidActionsBar({
  context,
  profile,
  onAfterAction,
  compact,
  operationalEvent,
  campaignEvents,
  assignmentMap,
}: RapidActionsBarProps) {
  const navigate = useNavigate()
  const tier = rapidActionTierFromProfile(profile?.primary_role)
  const actions = useMemo(() => listRapidActionsForContext(context, tier), [context, tier])
  const [busy, setBusy] = useState<RapidActionType | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [modal, setModal] = useState<RapidActionType | null>(null)
  const [form, setForm] = useState<RapidActionMutationPayload>({})

  const run = useCallback(
    async (type: RapidActionType, payload?: RapidActionMutationPayload) => {
      const def = getRapidActionDefinition(type)
      if (!def) return
      setBusy(type)
      setErr(null)
      setMsg(null)

      const navTypes: RapidActionType[] = [
        'navigate_staffing_section',
        'navigate_readiness_section',
        'fill_open_staffing_gap',
        'open_event_playbook',
        'launch_quick_outreach_flow',
      ]
      if (
        operationalEvent &&
        assignmentMap &&
        campaignEvents?.length &&
        !navTypes.includes(type)
      ) {
        const pre = precheckRapidAction({
          action: type,
          event: operationalEvent,
          assignmentMap,
          allEvents: campaignEvents,
          targetVolunteerUserId: payload?.assigned_user_id ?? null,
        })
        if (pre.block) {
          setErr(pre.warnings[0] ?? 'Action blocked by operational precheck.')
          setBusy(null)
          return
        }
        if (pre.warnings.length) {
          setMsg(pre.warnings.join(' · '))
        }
      }

      if (navTypes.includes(type)) {
        const eid = context.event_id
        if (type === 'launch_quick_outreach_flow' && eid) {
          navigate(`/events/promotion?eventHint=${encodeURIComponent(eid)}`)
        } else if (eid) {
          const section =
            type === 'open_event_playbook' || type === 'navigate_readiness_section' ? 'command' : 'staffing'
          navigate(campaignEventRecordSectionPath(eid, section))
          requestAnimationFrame(() => {
            const domId =
              section === 'command'
                ? EVENT_RECORD_DETAIL_SECTION_DOM_IDS.command
                : EVENT_RECORD_DETAIL_SECTION_DOM_IDS.staffing
            document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          })
        }
        await executeRapidAction({
          action: type,
          eventId: context.event_id,
          approvalEventId: context.approval_request_event_id,
          initiatedByProfileId: profile?.id ?? null,
          payload,
        })
        setMsg(def.success_message)
        setBusy(null)
        onAfterAction?.()
        return
      }

      const res = await executeRapidAction({
        action: type,
        eventId: context.event_id,
        approvalEventId: context.approval_request_event_id ?? context.event_id,
        initiatedByProfileId: profile?.id ?? null,
        payload,
      })
      if (res.ok) {
        setMsg(res.message ?? def.success_message)
        onAfterAction?.()
      } else {
        setErr(res.error ?? def.failure_message)
      }
      setBusy(null)
    },
    [
      assignmentMap,
      campaignEvents,
      context.approval_request_event_id,
      context.event_id,
      navigate,
      onAfterAction,
      operationalEvent,
      profile?.id,
    ],
  )

  const onPick = (type: RapidActionType) => {
    const def = getRapidActionDefinition(type)
    if (!def) return
    if (def.ui_mode === 'modal') {
      setForm({})
      setModal(type)
      return
    }
    if (def.confirmation_required && !window.confirm(`Run “${def.label}”?`)) return
    void run(type, {})
  }

  const submitModal = () => {
    if (!modal) return
    const def = getRapidActionDefinition(modal)
    if (def?.confirmation_required && !window.confirm(`Confirm “${def.label}”?`)) return
    void run(modal, form)
    setModal(null)
  }

  const eventLink =
    context.event_id && !context.event_id.startsWith('new') ? (
      <Link to={campaignEventRecordPath(context.event_id)} className="subtitle">
        Open event →
      </Link>
    ) : null

  return (
    <div
      className="rapid-actions-bar"
      id="rapid-actions-command"
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: compact ? '0.5rem 0.65rem' : '0.75rem 1rem',
        marginBottom: '0.75rem',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <div>
          <p className="event-coordinator-desk__eyebrow" style={{ margin: 0 }}>
            Rapid actions
          </p>
          <p className="subtitle" style={{ margin: '0.15rem 0 0', fontSize: '0.82rem' }}>
            Context-aware command surface — writes go to Supabase + readiness where applicable.
          </p>
        </div>
        {eventLink}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <label className="subtitle" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Action
          <select
            className="btn-touch"
            value=""
            onChange={(ev) => {
              const v = ev.target.value as RapidActionType
              if (v) onPick(v)
              ev.target.value = ''
            }}
            disabled={!!busy}
          >
            <option value="">Choose…</option>
            {actions.map((a) => (
              <option key={a.action_type} value={a.action_type}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {busy ? (
          <span className="subtitle" role="status">
            Working…
          </span>
        ) : null}
      </div>

      {msg ? (
        <p className="event-coordinator-desk__meta" role="status" style={{ marginTop: 8 }}>
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="event-coordinator-desk__placeholder" role="alert" style={{ marginTop: 8 }}>
          {err}
        </p>
      ) : null}

      {modal ? (
        <div
          className="rapid-actions-bar__modal"
          role="dialog"
          aria-modal
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: 'rgba(20,24,32,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <p style={{ marginTop: 0, fontWeight: 600 }}>{getRapidActionDefinition(modal)?.label}</p>
          {(modal === 'assign_volunteer_to_role' ||
            modal === 'create_assignment' ||
            modal === 'create_shift_slot' ||
            modal === 'create_backup_staffing_role' ||
            modal === 'reassign_volunteer_to_role' ||
            modal === 'confirm_provisional_coverage') && (
            <>
              <label className="subtitle" style={{ display: 'block', marginBottom: 6 }}>
                Role
                <select
                  className="btn-touch"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.staff_role_slug ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, staff_role_slug: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {EVENT_STAFF_ROLE_SLUGS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              {modal === 'create_shift_slot' ? (
                <>
                  <label className="subtitle" style={{ display: 'block', marginBottom: 6 }}>
                    Shift label
                    <input
                      className="btn-touch"
                      style={{ width: '100%', marginTop: 4 }}
                      value={form.shift_label ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, shift_label: e.target.value }))}
                    />
                  </label>
                  <label className="subtitle" style={{ display: 'block', marginBottom: 6 }}>
                    Placeholder name
                    <input
                      className="btn-touch"
                      style={{ width: '100%', marginTop: 4 }}
                      value={form.assigned_display_name ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, assigned_display_name: e.target.value }))}
                    />
                  </label>
                </>
              ) : modal === 'confirm_provisional_coverage' ? (
                <p className="subtitle" style={{ marginTop: 4 }}>
                  Sets invited rows for this role to <strong>confirmed</strong> when commitments are firm.
                </p>
              ) : (
                <label className="subtitle" style={{ display: 'block', marginBottom: 6 }}>
                  {modal === 'reassign_volunteer_to_role' ? 'New display name (optional UUID in future)' : 'Display name'}
                  <input
                    className="btn-touch"
                    style={{ width: '100%', marginTop: 4 }}
                    value={form.assigned_display_name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, assigned_display_name: e.target.value }))}
                    placeholder="Volunteer name"
                  />
                </label>
              )}
            </>
          )}
          {(modal === 'send_reminder' ||
            modal === 'create_note_risk_flag' ||
            modal === 'mark_issue_escalation' ||
            modal === 'request_changes' ||
            modal === 'approve_request' ||
            modal === 'reject_request') && (
            <label className="subtitle" style={{ display: 'block', marginBottom: 6 }}>
              Notes
              <textarea
                className="btn-touch"
                style={{ width: '100%', marginTop: 4, minHeight: 72 }}
                value={form.body ?? form.approval_notes ?? ''}
                onChange={(e) =>
                  setForm((f) =>
                    modal === 'approve_request' || modal === 'reject_request'
                      ? { ...f, approval_notes: e.target.value }
                      : { ...f, body: e.target.value },
                  )
                }
              />
            </label>
          )}
          {modal === 'approve_request' && (
            <label className="subtitle" style={{ display: 'block', marginBottom: 6 }}>
              Conditions (optional)
              <input
                className="btn-touch"
                style={{ width: '100%', marginTop: 4 }}
                value={form.approval_conditions ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, approval_conditions: e.target.value }))}
              />
            </label>
          )}
          {(modal === 'generate_followup_task' || modal === 'add_missing_asset_task' || modal === 'duplicate_event_workflow_step') && (
            <label className="subtitle" style={{ display: 'block', marginBottom: 6 }}>
              Task title
              <input
                className="btn-touch"
                style={{ width: '100%', marginTop: 4 }}
                value={form.body ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </label>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="btn-touch" onClick={() => void submitModal()}>
              Run
            </button>
            <button type="button" className="btn-touch" onClick={() => setModal(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
