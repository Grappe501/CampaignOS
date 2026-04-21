import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LeadershipBriefingSnapshot } from '../../lib/leadershipBriefingSchemas'
import type { CockpitMissionStripExtras } from '../../lib/cockpit/cockpitAiMissionStrip'
import { missionStripLines, topThreeRiskLabels } from '../../lib/cockpit/cockpitTopBarSelectors'
import { COCKPIT_PRESET_ORDER } from '../../lib/cockpit/cockpitWorkspaceSchemas'
import { useCampaignManagerCockpit } from '../../context/CampaignManagerCockpitContext'

type Props = {
  snapshot: LeadershipBriefingSnapshot
  missionExtras?: CockpitMissionStripExtras | null
}

export default function CockpitTopTacticalBar({ snapshot, missionExtras = null }: Props) {
  const { loadPreset, saveLayoutToStorage, setLayoutLocked, layoutLocked, layout } =
    useCampaignManagerCockpit()
  const [presetOpen, setPresetOpen] = useState(false)

  const risks = useMemo(() => topThreeRiskLabels(snapshot), [snapshot])
  const mission = useMemo(() => missionStripLines(snapshot), [snapshot])

  return (
    <header className="cm-cockpit-topbar" role="banner">
      <div className="cm-cockpit-topbar__seg">
        <div className="cm-cockpit-topbar__status" data-level={snapshot.pulse.overall_operational_status}>
          <span className="cm-cockpit-topbar__eyebrow">Operating status</span>
          <strong>{snapshot.pulse.overall_operational_status.replace(/_/g, ' ')}</strong>
        </div>
        <ul className="cm-cockpit-topbar__risk-list" aria-label="Top risks">
          {risks.length ? (
            risks.map((r) => (
              <li key={r} className="cm-cockpit-topbar__risk">
                {r}
              </li>
            ))
          ) : (
            <li className="cm-cockpit-topbar__risk">No ranked risks</li>
          )}
        </ul>
        <dl className="cm-cockpit-topbar__stats">
          <div>
            <dt>Approvals</dt>
            <dd>{snapshot.counts.approval_pending}</dd>
          </div>
          <div>
            <dt>Critical</dt>
            <dd>{snapshot.counts.critical_risk_events}</dd>
          </div>
          <div>
            <dt>Live</dt>
            <dd>{snapshot.counts.live_now}</dd>
          </div>
          <div>
            <dt>7d</dt>
            <dd>{snapshot.counts.upcoming_7d}</dd>
          </div>
        </dl>
      </div>

      <div className="cm-cockpit-topbar__seg cm-cockpit-topbar__seg--mission">
        {missionExtras ? (
          <p className="cm-cockpit-topbar__mode-pill" data-mode={missionExtras.stripMode}>
            Mode: {missionExtras.stripMode.replace(/_/g, ' ')}
          </p>
        ) : null}
        <p className="cm-cockpit-topbar__mission-line">{mission.briefing}</p>
        <p className="cm-cockpit-topbar__mission-sub">Δ {mission.change}</p>
        {missionExtras ? (
          <p className="cm-cockpit-topbar__mission-pressure">{missionExtras.crossSystemLine}</p>
        ) : null}
        {missionExtras?.topConsequences.length ? (
          <ul className="cm-cockpit-topbar__consequence-tight" aria-label="Cross-system consequences">
            {missionExtras.topConsequences.map((line, i) => (
              <li key={`${String(i)}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        ) : null}
        <p className="cm-cockpit-topbar__mission-decision">
          <strong>Next decision:</strong> {mission.decision}
        </p>
        {missionExtras ? (
          <p className="cm-cockpit-topbar__mission-focus">
            <strong>Focus:</strong> {missionExtras.recommendedCenterLabel}
            {missionExtras.recommendedCompareId
              ? ` · Compare: ${missionExtras.recommendedCompareId.replace(/_/g, ' ')}`
              : ''}
          </p>
        ) : null}
      </div>

      <div className="cm-cockpit-topbar__seg cm-cockpit-topbar__seg--controls">
        <Link to="/events/review-requests" className="cm-cockpit-topbar__link">
          Approvals queue
        </Link>
        <div className="cm-cockpit-topbar__preset">
          <button
            type="button"
            className="cm-cockpit-topbar__btn"
            aria-expanded={presetOpen}
            onClick={() => setPresetOpen((o) => !o)}
          >
            Preset: {layout.lastPreset ?? 'Custom'}
          </button>
          {presetOpen ? (
            <ul className="cm-cockpit-topbar__preset-menu" role="listbox">
              {COCKPIT_PRESET_ORDER.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => {
                      loadPreset(name)
                      setPresetOpen(false)
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="button" className="cm-cockpit-topbar__btn" onClick={() => saveLayoutToStorage()}>
          Save layout
        </button>
        <button
          type="button"
          className={`cm-cockpit-topbar__btn ${layoutLocked ? 'is-active' : ''}`}
          onClick={() => setLayoutLocked(!layoutLocked)}
        >
          {layoutLocked ? 'Unlock' : 'Lock'} panels
        </button>
      </div>
    </header>
  )
}
