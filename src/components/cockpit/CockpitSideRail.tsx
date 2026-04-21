import CockpitFullscreenSphere from './CockpitFullscreenSphere'
import type { CockpitModuleId } from '../../lib/cockpit/cockpitWorkspaceSchemas'
import { getCockpitModuleMeta } from '../../lib/cockpit/cockpitModuleRegistry'
import { useCampaignManagerCockpit } from '../../context/CampaignManagerCockpitContext'
import type { LeadershipBriefingSnapshot } from '../../lib/leadershipBriefingSchemas'

const DRAG_MIME = 'application/x-campaignos-cockpit-module'

type Props = {
  side: 'left' | 'right'
  moduleIds: CockpitModuleId[]
  snapshot: LeadershipBriefingSnapshot
  /** Mission engine recommends opening this module in center. */
  recommendedModuleId?: CockpitModuleId | null
}

function attentionForModule(id: CockpitModuleId, snap: LeadershipBriefingSnapshot): 'ok' | 'warn' | 'urgent' | 'info' {
  if (id === 'war_room' && snap.counts.critical_risk_events > 0) return 'urgent'
  if (id === 'approvals_leadership' && snap.counts.approval_pending > 0) return 'warn'
  if (id === 'calendar' && snap.counts.upcoming_7d > 6) return 'info'
  if (id === 'finance_fundraising') return 'info'
  return 'ok'
}

function railHint(id: CockpitModuleId, snap: LeadershipBriefingSnapshot): string {
  switch (id) {
    case 'war_room':
      return `${snap.counts.critical_risk_events} critical · ${snap.counts.live_now} live`
    case 'calendar':
      return `${snap.counts.upcoming_7d} next 7d`
    case 'volunteer_command':
      return `${snap.counts.staffing_incomplete_events} staffing gaps`
    case 'event_operations':
      return `${snap.counts.active_program_events} programs`
    case 'communications_press':
      return `${snap.counts.communications_risk_events} comms risk`
    case 'finance_fundraising':
      return 'KPIs on dashboard'
    case 'candidate_schedule':
      return 'Candidate desk'
    case 'approvals_leadership':
      return `${snap.counts.approval_pending} pending`
    case 'field_operations':
      return 'County / neighborhood'
    default:
      return snap.pulse.overall_operational_status
  }
}

export default function CockpitSideRail({
  side,
  moduleIds,
  snapshot,
  recommendedModuleId = null,
}: Props) {
  const { promoteFromRail, setFullscreenModule, fullscreenModuleId, layoutLocked } =
    useCampaignManagerCockpit()

  return (
    <div className={`cm-cockpit-rail cm-cockpit-rail--${side}`} role="region" aria-label={`${side} tactical rail`}>
      {moduleIds.map((id) => {
        const meta = getCockpitModuleMeta(id)
        if (!meta) return null
        const attn = attentionForModule(id, snapshot)
        const fs = fullscreenModuleId === id
        const rec = recommendedModuleId === id
        return (
          <div
            key={id}
            className={`cm-cockpit-rail-tile${rec ? ' cm-cockpit-rail-tile--recommended' : ''}`}
            draggable={!layoutLocked}
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_MIME, id)
              e.dataTransfer.effectAllowed = 'copyMove'
            }}
          >
            <div className="cm-cockpit-rail-tile__head">
              <span className="cm-cockpit-rail-tile__title">{meta.shortTitle}</span>
              <CockpitFullscreenSphere
                attention={attn}
                title={meta.title}
                fullscreenActive={fs}
                onToggleFullscreen={() => setFullscreenModule(fs ? null : id)}
              />
            </div>
            <p className="cm-cockpit-rail-tile__hint">{railHint(id, snapshot)}</p>
            <button
              type="button"
              className="cm-cockpit-rail-tile__promote"
              disabled={layoutLocked}
              onClick={() => promoteFromRail(id)}
            >
              Promote to center
            </button>
          </div>
        )
      })}
    </div>
  )
}
