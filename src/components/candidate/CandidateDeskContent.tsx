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
  pickStrongestActiveKpi,
  pickWeakestActiveKpi,
} from '../../lib/candidateDeskNarrative'
import {
  averageKpiProgressPct,
  buildLeadershipAttentionBullets,
  countKpisAtOrAboveGoal,
  countKpisBelowThreshold,
  formatProgressPctLabel,
  sortKpisByProgress,
  sortMissionsByProgress,
} from '../../lib/candidateLeadershipInsights'
import { isCampaignLeadershipRole } from '../../lib/kpiEngine'
import CandidateElectionStrategicCard from './CandidateElectionStrategicCard'

function formatKpiUnit(unit: string, n: number): string {
  if (unit === 'dollars') {
    return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`
  }
  return `${Math.round(n)}`
}

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
  const strongest = useMemo(
    () => pickStrongestActiveKpi(kpisHook.kpis),
    [kpisHook.kpis],
  )

  const isLeadership = isCampaignLeadershipRole(primaryRole)
  const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

  const avgPct = useMemo(
    () => averageKpiProgressPct(kpisHook.kpis),
    [kpisHook.kpis],
  )
  const belowHalf = useMemo(
    () => countKpisBelowThreshold(kpisHook.kpis, 50),
    [kpisHook.kpis],
  )
  const atGoal = useMemo(
    () => countKpisAtOrAboveGoal(kpisHook.kpis),
    [kpisHook.kpis],
  )
  const laggingKpis = useMemo(
    () => sortKpisByProgress(kpisHook.kpis, 'asc').slice(0, 3),
    [kpisHook.kpis],
  )
  const leadingKpis = useMemo(
    () => sortKpisByProgress(kpisHook.kpis, 'desc').slice(0, 3),
    [kpisHook.kpis],
  )
  const missionLag = useMemo(() => {
    if (!isLeadership || kpisHook.missions.length === 0) return []
    return sortMissionsByProgress(kpisHook.missions, 'asc').slice(0, 4)
  }, [isLeadership, kpisHook.missions])

  const attentionItems = useMemo(
    () =>
      buildLeadershipAttentionBullets({
        kpiError: kpisHook.error,
        kpiLoading: kpisHook.loading,
        kpis: kpisHook.kpis,
        missions: kpisHook.missions,
        isLeadership,
        weakest,
        strongest,
      }),
    [
      isLeadership,
      kpisHook.error,
      kpisHook.kpis,
      kpisHook.loading,
      kpisHook.missions,
      strongest,
      weakest,
    ],
  )

  const focusItems: string[] = []
  focusItems.push(...phase.operationalEmphasis.slice(0, 2))
  if (!kpisHook.loading && weakest) {
    focusItems.push(
      `KPI priority: “${weakest.row.name}” is at ${weakest.pctOfTarget}% of target — align coordinators and comms before layering new programs.`,
    )
  } else if (!kpisHook.loading && kpisHook.kpis.length === 0) {
    focusItems.push(
      'No active KPI window for today — confirm campaign_kpis dates with HQ before messaging goals publicly.',
    )
  }
  if (urgency === 'd7' || urgency === 'h72') {
    focusItems.push(
      'Execution: keep coordinator and intern surfaces staffed — blockers there flow straight to turnout.',
    )
  }

  const healthNarrative = (() => {
    if (kpisHook.loading) return 'Loading KPI window…'
    if (kpisHook.error) return 'KPI snapshot unavailable until the error above is resolved.'
    if (kpisHook.kpis.length === 0) {
      return 'No active KPI rows for the current calendar window — health read is limited to the election phase below.'
    }
    if (avgPct == null) return 'KPI targets need valid positive numbers to compute a campaign-average read.'
    const parts: string[] = []
    parts.push(
      `Across ${kpisHook.kpis.length} active KPI${kpisHook.kpis.length === 1 ? '' : 's'}, the mean progress toward each configured target is ${avgPct}%.`,
    )
    if (belowHalf > 0) {
      parts.push(`${belowHalf} ${belowHalf === 1 ? 'is' : 'are'} still below half of target.`)
    }
    if (atGoal > 0) {
      parts.push(`${atGoal} ${atGoal === 1 ? 'has' : 'have'} reached or exceeded its current target.`)
    }
    return parts.join(' ')
  })()

  return (
    <div className="candidate-desk">
      <header className="candidate-desk-header">
        <p className="subtitle candidate-desk-eyebrow" style={{ margin: 0 }}>
          Principal & HQ
        </p>
        <h1 className="page-title candidate-desk-title">Campaign leadership</h1>
        <p className="subtitle candidate-desk-intro">
          Executive read for {brand.campaignName}: election phase from the configured clock, live KPIs from{' '}
          <code>campaign_kpis</code>, and mission scaffolds when your role allows — without turning this page into
          a volunteer task board. Numbers are read-only here except where HQ target tools apply.
        </p>
      </header>

      <section
        id="candidate-health-snapshot"
        className="card stack-section candidate-health-card"
        aria-labelledby="cand-health-title"
      >
        <h2 id="cand-health-title" className="candidate-section-title">
          Campaign health snapshot
        </h2>
        <p className="subtitle candidate-section-lede" style={{ marginBottom: 10 }}>
          {healthNarrative}
        </p>
        {profileLoading ? (
          <p className="subtitle" role="status">
            Loading profile…
          </p>
        ) : (
          <>
            {!kpisHook.loading && !kpisHook.error && kpisHook.kpis.length > 0 ? (
              <ul className="candidate-health-chips" aria-label="KPI summary chips">
                <li className="candidate-health-chip">
                  <strong>{kpisHook.kpis.length}</strong>
                  <span>active KPI{kpisHook.kpis.length === 1 ? '' : 's'}</span>
                </li>
                {avgPct != null ? (
                  <li className="candidate-health-chip candidate-health-chip--neutral">
                    <strong>{avgPct}%</strong>
                    <span>mean vs target</span>
                  </li>
                ) : null}
                <li
                  className={`candidate-health-chip${belowHalf > 0 ? ' candidate-health-chip--warn' : ''}`}
                >
                  <strong>{belowHalf}</strong>
                  <span>below half of target</span>
                </li>
                <li
                  className={`candidate-health-chip${atGoal > 0 ? ' candidate-health-chip--ok' : ''}`}
                >
                  <strong>{atGoal}</strong>
                  <span>at/above target</span>
                </li>
              </ul>
            ) : null}
            <dl className="candidate-dl candidate-dl--inline">
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
                <dt>KPI window</dt>
                <dd>
                  {kpisHook.loading
                    ? 'Loading…'
                    : kpisHook.error
                      ? kpisHook.error
                      : `${kpisHook.kpis.length} active row${kpisHook.kpis.length === 1 ? '' : 's'}`}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <CandidateElectionStrategicCard />

      <section
        className="card stack-section candidate-momentum-card"
        aria-labelledby="cand-momentum-title"
      >
        <h2 id="cand-momentum-title" className="candidate-section-title">
          Metric balance (snapshot)
        </h2>
        <p className="subtitle candidate-section-lede">
          Ordering uses each KPI’s <strong>current_value</strong> vs its <strong>target_value</strong> — a static
          picture, not week-over-week velocity (historical series are not exposed in this client).
        </p>
        {kpisHook.loading ? (
          <p className="subtitle" role="status">
            Loading KPIs…
          </p>
        ) : kpisHook.kpis.length === 0 ? (
          <p className="subtitle">No KPI rows to rank in this window.</p>
        ) : kpisHook.kpis.length === 1 ? (
          <p className="subtitle" style={{ marginTop: 8 }}>
            Only one active KPI in this window — use <strong>Active KPI window (detail)</strong> below for the full
            bar and contribution lines.
          </p>
        ) : (
          <div className="candidate-momentum-grid">
            <div className="candidate-momentum-panel">
              <h3 className="candidate-momentum-panel-title">Largest lift still needed</h3>
              <ul className="candidate-momentum-list">
                {laggingKpis.map(({ row, pct }) => (
                  <li key={row.id}>
                    <strong>{row.name}</strong>
                    <span className="subtitle">
                      {formatProgressPctLabel(pct)} ·{' '}
                      {formatKpiUnit(row.unit, Number(row.current_value) || 0)} /{' '}
                      {formatKpiUnit(row.unit, Number(row.target_value) || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="candidate-momentum-panel candidate-momentum-panel--positive">
              <h3 className="candidate-momentum-panel-title">Furthest along on paper</h3>
              <ul className="candidate-momentum-list">
                {leadingKpis.map(({ row, pct }) => (
                  <li key={row.id}>
                    <strong>{row.name}</strong>
                    <span className="subtitle">
                      {formatProgressPctLabel(pct)} ·{' '}
                      {formatKpiUnit(row.unit, Number(row.current_value) || 0)} /{' '}
                      {formatKpiUnit(row.unit, Number(row.target_value) || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {isLeadership && kpisHook.missions.length > 0 ? (
          <div className="candidate-mission-lift">
            <h3 className="candidate-momentum-panel-title">Mission scaffolds (leadership)</h3>
            <p className="subtitle" style={{ margin: '4px 0 8px' }}>
              Rows from <code>campaign_missions</code> — lowest progress first.
            </p>
            <ul className="candidate-momentum-list">
              {missionLag.map(({ row, pct }) => (
                <li key={row.id}>
                  <strong>{row.name}</strong>
                  <span className="subtitle">
                    {formatProgressPctLabel(pct)} · scope: {row.assigned_scope || '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {attentionItems.length > 0 ? (
        <section
          className="card stack-section candidate-attention-card"
          aria-labelledby="cand-attention-title"
        >
          <h2 id="cand-attention-title" className="candidate-section-title">
            Leadership attention areas
          </h2>
          <p className="subtitle candidate-section-lede">
            Derived from live KPI and mission rows — not a separate analytics warehouse.
          </p>
          <ul className="candidate-attention-list">
            {attentionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div id="campaign-kpis" aria-hidden="true" />
      <CampaignKpisCard
        kpis={kpisHook.kpis}
        contributions={kpisHook.contributions}
        loading={kpisHook.loading}
        error={kpisHook.error}
        maxItems={12}
        heading="Active KPI window (detail)"
        intro="Same rows volunteers see, expanded for leadership. Values come from campaign_kpis; contribution lines are this account’s mission_progress only."
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
          <h2 className="candidate-section-title">HQ target controls</h2>
          <p className="subtitle">
            Adjusting targets and mission scaffolding is limited to principal and HQ roles. Current role:{' '}
            <strong>{primaryRole?.trim() || '—'}</strong>. KPI values above remain visible for awareness.
          </p>
        </section>
      )}

      <section className="card stack-section" aria-labelledby="cand-ops-title">
        <h2 id="cand-ops-title" className="candidate-section-title">
          Field & volunteer engine
        </h2>
        <p className="subtitle candidate-section-lede">
          Operational truth lives in scoped workspaces — use these when you need coordinator or intern visibility,
          or the full volunteer dashboard.
        </p>
        <div className="candidate-ops-grid">
          <Link className="candidate-ops-tile" to="/coordinator">
            <span className="candidate-ops-tile-label">Coordinator desk</span>
            <span className="candidate-ops-tile-hint">
              Supervised assignments, pipeline aggregates, activation (team-scoped).
            </span>
          </Link>
          <Link className="candidate-ops-tile" to="/intern">
            <span className="candidate-ops-tile-label">Intern / team desk</span>
            <span className="candidate-ops-tile-hint">
              Intern queue when the signed-in profile has intern-capable access.
            </span>
          </Link>
          <Link className="candidate-ops-tile" to="/dashboard">
            <span className="candidate-ops-tile-label">Volunteer workspace</span>
            <span className="candidate-ops-tile-hint">
              Power of 5, voter tools, Agent Jones, daily missions — full volunteer surface.
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
          Blends the election phase (above) with KPI shape — parallel to attention areas, but action-oriented for the
          principal’s calendar.
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
          Legal, finance, and sensitive communications approvals stay in your HQ workflow. This app does not
          replace FEC, state filing, or press clearance — use it for field and KPI alignment, not sign-off storage.
        </p>
      </section>

    </div>
  )
}
