import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import CampaignKpisCard from '../dashboard/CampaignKpisCard'
import LeadershipKpiScaffold from '../dashboard/LeadershipKpiScaffold'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../../brand/chrisJonesForCongress'
import type { CampaignProfile } from '../../hooks/useProfile'
import { useCampaignKpis } from '../../hooks/useCampaignKpis'
import {
  getCountdownParts,
  getCountdownUrgency,
} from '../../lib/campaignClock'
import {
  getStrategicPhase,
  pickWeakestActiveKpi,
} from '../../lib/candidateDeskNarrative'
import { isCampaignLeadershipRole } from '../../lib/kpiEngine'
import CandidateElectionStrategicCard from './CandidateElectionStrategicCard'

export default function CandidateDeskContent({
  profile,
  profileLoading,
  onRefreshProfile,
}: {
  profile: CampaignProfile | null
  profileLoading: boolean
  onRefreshProfile: () => void | Promise<void>
}) {
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const primaryRole =
    profile?.primary_role != null ? String(profile.primary_role) : null
  const kpisHook = useCampaignKpis(profileId, primaryRole)

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const urgency = getCountdownUrgency(getCountdownParts(nowMs))
  const phase = getStrategicPhase(urgency)
  const weakest = useMemo(
    () => pickWeakestActiveKpi(kpisHook.kpis),
    [kpisHook.kpis],
  )

  const isLeadership = isCampaignLeadershipRole(primaryRole)
  const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

  const focusItems: string[] = []
  focusItems.push(...phase.operationalEmphasis.slice(0, 2))
  if (!kpisHook.loading && weakest) {
    focusItems.push(
      `KPI watch: “${weakest.row.name}” is at ${weakest.pctOfTarget}% of its current target — align coordinators and comms before adding new programs.`,
    )
  } else if (!kpisHook.loading && kpisHook.kpis.length === 0) {
    focusItems.push(
      'No active KPI window returned for today — confirm campaign_kpis dates in HQ tools or database.',
    )
  }
  if (urgency === 'd7' || urgency === 'h72') {
    focusItems.push(
      'Operations: keep /coordinator and intern surfaces staffed — blockers there ripple to turnout.',
    )
  }

  return (
    <div className="candidate-desk">
      <header className="candidate-desk-header">
        <p className="subtitle candidate-desk-eyebrow" style={{ margin: 0 }}>
          Leadership
        </p>
        <h1 className="page-title candidate-desk-title">Campaign command view</h1>
        <p className="subtitle candidate-desk-intro">
          High-level health for {brand.campaignName}: election momentum from the configured
          clock, live KPIs from the same system volunteers see, and quick paths into field
          operations — without duplicating day-to-day volunteer workflow.
        </p>
      </header>

      <section className="card stack-section candidate-overview-card" aria-labelledby="cand-overview-title">
        <h2 id="cand-overview-title" className="candidate-section-title">
          Where we stand now
        </h2>
        {profileLoading ? (
          <p className="subtitle" role="status">
            Loading profile…
          </p>
        ) : (
          <dl className="candidate-dl">
            <div>
              <dt>Principal profile</dt>
              <dd>
                {profileId
                  ? profileId.length > 12
                    ? `Linked (${profileId.slice(0, 8)}…)`
                    : 'Linked'
                  : 'Not linked'}
              </dd>
            </div>
            <div>
              <dt>Account role</dt>
              <dd>{primaryRole?.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Strategic read</dt>
              <dd>
                {kpisHook.loading
                  ? 'Loading KPIs…'
                  : kpisHook.error
                    ? kpisHook.error
                    : `${kpisHook.kpis.length} active KPI${kpisHook.kpis.length === 1 ? '' : 's'} in the current window.`}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <CandidateElectionStrategicCard />

      <CampaignKpisCard
        kpis={kpisHook.kpis}
        contributions={kpisHook.contributions}
        loading={kpisHook.loading}
        error={kpisHook.error}
        heading="Campaign KPI snapshot"
        intro="Read-only view of the same active KPI window used across CampaignOS. Numbers come from campaign_kpis; your personal contribution lines reflect this account’s mission progress only."
      />

      {isLeadership ? (
        <LeadershipKpiScaffold
          key={kpisHook.kpis.map((k) => `${k.id}:${k.target_value}`).join('|')}
          kpis={kpisHook.kpis}
          missions={kpisHook.missions}
          onUpdated={async () => {
            await kpisHook.refetch()
            await onRefreshProfile()
          }}
        />
      ) : (
        <section className="card stack-section candidate-note-card">
          <h2 className="candidate-section-title">KPI target controls</h2>
          <p className="subtitle">
            Adjusting targets and mission scaffolding is limited to principal and HQ roles.
            Current role: <strong>{primaryRole?.trim() || '—'}</strong>. KPI values above
            remain visible for awareness.
          </p>
        </section>
      )}

      <section className="card stack-section" aria-labelledby="cand-ops-title">
        <h2 id="cand-ops-title" className="candidate-section-title">
          Organization visibility
        </h2>
        <p className="subtitle candidate-section-lede">
          Deep operational tools stay in their own surfaces — use these links when you need
          field truth, not another volunteer dashboard.
        </p>
        <div className="candidate-ops-grid">
          <Link className="candidate-ops-tile" to="/coordinator">
            <span className="candidate-ops-tile-label">Coordinator workspace</span>
            <span className="candidate-ops-tile-hint">
              Supervised missions, pipeline snapshot, activation signals (scoped by team).
            </span>
          </Link>
          <Link className="candidate-ops-tile" to="/intern">
            <span className="candidate-ops-tile-label">Team desk</span>
            <span className="candidate-ops-tile-hint">
              Intern queue and mission tasks when signed in as an intern-capable account.
            </span>
          </Link>
          <Link className="candidate-ops-tile" to="/dashboard">
            <span className="candidate-ops-tile-label">Volunteer engine</span>
            <span className="candidate-ops-tile-hint">
              Full volunteer workspace — Power of 5, voter tools, Agent Jones, missions.
            </span>
          </Link>
        </div>
      </section>

      <section
        className={`card stack-section candidate-focus-card candidate-focus-card--${urgency === 'closed' ? 'closed' : 'open'}`}
        aria-labelledby="cand-focus-title"
      >
        <h2 id="cand-focus-title" className="candidate-section-title">
          Recommended focus now
        </h2>
        <p className="subtitle candidate-section-lede">
          Derived from the current countdown phase (above) plus live KPI shape — not a
          separate analytics pipeline.
        </p>
        <ul className="candidate-focus-list">
          {[...new Set(focusItems)].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card stack-section candidate-compliance-card">
        <h2 className="candidate-section-title">Compliance & approvals</h2>
        <p className="subtitle" style={{ margin: 0, lineHeight: 1.45 }}>
          Legal, finance, and sensitive communications approvals are handled through your HQ
          workflow (counsel, treasurer, communications director). This app does not replace
          FEC, state filing, or press clearance processes — use it for field and KPI
          alignment, not sign-off storage.
        </p>
      </section>
    </div>
  )
}
