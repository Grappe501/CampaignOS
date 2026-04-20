import { useEffect, useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import VolunteerCommandNav from '../components/volunteer-command/VolunteerCommandNav'
import { useProfile } from '../hooks/useProfile'
import { useVolunteerSelfService } from '../hooks/useVolunteerSelfService'
import { useVolunteerMarketplace } from '../hooks/useVolunteerMarketplace'
import { supabase } from '../lib/supabaseClient'
import type { VolunteerOpportunity } from '../lib/volunteerOpportunityDomain'
import { useVolunteerRecommendations } from '../hooks/useVolunteerRecommendations'
import VolunteerRecommendedOpportunitiesPanel from '../components/volunteer-command/VolunteerRecommendedOpportunitiesPanel'
import { logVolunteerEngagementEvent } from '../lib/volunteerEngagementTracker'

type Props = { onDevSessionClear?: () => void }

function sourceLabel(o: VolunteerOpportunity): string {
  switch (o.sourceType) {
    case 'assignment':
      return 'Assignment'
    case 'shift_slot':
      return 'Shift'
    case 'staffing_requirement':
      return 'Event staffing'
    case 'onboarding_step':
      return 'Onboarding'
    case 'training_support':
      return 'Training'
    default:
      return 'Custom'
  }
}

export default function OpportunityMarketplacePage({ onDevSessionClear }: Props) {
  const { profile, loading: profileLoading } = useProfile()
  const profileId = profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const self = useVolunteerSelfService(profileId)
  const desk = useVolunteerMarketplace(self.volunteer, profileId)
  const intel = useVolunteerRecommendations(self.volunteer, false)

  const [detail, setDetail] = useState<VolunteerOpportunity | null>(null)
  const [claimMsg, setClaimMsg] = useState<string | null>(null)

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  useEffect(() => {
    if (!detail || !self.volunteer) return
    if (self.volunteer.recommendationPreferences?.engagementTrackingOptIn === false) return
    void logVolunteerEngagementEvent({
      volunteerId: self.volunteer.id,
      opportunityId: detail.id,
      eventType: 'opened_opportunity_detail',
      metadataJson: { role_slug: detail.roleSlug ?? '' },
    })
  }, [detail?.id, self.volunteer])

  const recMap = useMemo(() => {
    const m = new Map<string, (typeof desk.recommended)[0]['summary']>()
    for (const r of desk.recommended) {
      m.set(r.opportunity.id, r.summary)
    }
    return m
  }, [desk.recommended])

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell">
        {profileLoading && !profile ? (
          <div className="loading-screen" role="status">
            Loading…
          </div>
        ) : (
          <div className="event-coordinator-desk volunteer-command-page" id="volunteer-marketplace">
            <header className="event-coordinator-desk__command">
              <p className="event-coordinator-desk__eyebrow">Volunteer marketplace</p>
              <h1 className="event-coordinator-desk__title">Opportunity marketplace</h1>
              <p className="event-coordinator-desk__lede">
                One place to browse open assignments, shift gaps, and event staffing needs. Claims update
                Volunteer Command and event coverage.
              </p>
              <VolunteerCommandNav />
              <div className="event-coordinator-desk__quick-actions">
                <button
                  type="button"
                  className="btn-touch"
                  disabled={!profileId || self.loading}
                  onClick={() => void self.ensureProfile()}
                >
                  Ensure volunteer profile
                </button>
              </div>
            </header>

            {self.error || desk.error ? (
              <p className="event-coordinator-desk__placeholder" role="alert">
                {(self.error ?? desk.error)?.message}
              </p>
            ) : null}

            {desk.loading ? (
              <p className="event-coordinator-desk__meta" role="status">
                Loading opportunities…
              </p>
            ) : null}

            {!desk.loading && !self.volunteer ? (
              <p className="event-coordinator-desk__placeholder">
                Create your volunteer profile to filter recommendations and claim shifts.
              </p>
            ) : null}

            <section className="event-coordinator-desk__section" aria-labelledby="vm-stats">
              <h2 id="vm-stats" className="event-coordinator-desk__h2">
                Marketplace health
              </h2>
              <ul className="volunteer-command__stat-grid">
                <li>
                  <strong>{desk.analytics.totalOpen}</strong> open slots
                </li>
                <li>
                  <strong>{desk.analytics.urgentOpen}</strong> urgent openings
                </li>
                <li>
                  <strong>{desk.filtered.length}</strong> match filters
                </li>
              </ul>
            </section>

            <section className="event-coordinator-desk__section" aria-labelledby="vm-filters">
              <h2 id="vm-filters" className="event-coordinator-desk__h2">
                Filters
              </h2>
              <div className="volunteer-marketplace-filters">
                <label className="volunteer-marketplace-filters__field">
                  <span className="volunteer-marketplace-filters__label">Search</span>
                  <input
                    className="volunteer-marketplace-filters__input"
                    type="search"
                    value={desk.filters.search}
                    onChange={(e) => desk.setFilters((f) => ({ ...f, search: e.target.value }))}
                    placeholder="Title, role, location…"
                  />
                </label>
                <label className="volunteer-marketplace-filters__field">
                  <span className="volunteer-marketplace-filters__label">Role</span>
                  <select
                    className="volunteer-marketplace-filters__input"
                    value={desk.filters.roleSlug ?? ''}
                    onChange={(e) =>
                      desk.setFilters((f) => ({
                        ...f,
                        roleSlug: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">Any</option>
                    {desk.roleList.map((r) => (
                      <option key={r.roleSlug} value={r.roleSlug}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="volunteer-marketplace-filters__check">
                  <input
                    type="checkbox"
                    checked={desk.filters.urgentOnly}
                    onChange={(e) => desk.setFilters((f) => ({ ...f, urgentOnly: e.target.checked }))}
                  />{' '}
                  Urgent only
                </label>
                <label className="volunteer-marketplace-filters__check">
                  <input
                    type="checkbox"
                    checked={desk.filters.selfClaimOnly}
                    onChange={(e) => desk.setFilters((f) => ({ ...f, selfClaimOnly: e.target.checked }))}
                  />{' '}
                  Self-claim
                </label>
                <label className="volunteer-marketplace-filters__check">
                  <input
                    type="checkbox"
                    checked={desk.filters.recommendedOnly}
                    onChange={(e) => desk.setFilters((f) => ({ ...f, recommendedOnly: e.target.checked }))}
                  />{' '}
                  Recommended for me
                </label>
              </div>
            </section>

            {self.volunteer && intel.results.length > 0 ? (
              <section className="event-coordinator-desk__section" aria-labelledby="vm-intel">
                <h2 id="vm-intel" className="event-coordinator-desk__h2">
                  Personalized matches (eligibility + AI)
                </h2>
                <VolunteerRecommendedOpportunitiesPanel
                  loading={intel.loading}
                  error={intel.error}
                  results={intel.results}
                  usedAi={intel.usedAi}
                  fallbackReason={intel.fallbackReason}
                  onRefresh={() => void intel.refetch({ forceRefresh: true })}
                  limit={4}
                />
              </section>
            ) : null}

            {desk.recommended.length > 0 && !desk.filters.recommendedOnly ? (
              <section className="event-coordinator-desk__section" aria-labelledby="vm-rec">
                <h2 id="vm-rec" className="event-coordinator-desk__h2">
                  Recommended for you
                </h2>
                <ul className="volunteer-marketplace__card-list">
                  {desk.recommended.slice(0, 6).map(({ opportunity: o, summary }) => (
                    <li key={o.id}>
                      <article className="volunteer-marketplace-card">
                        <h3 className="volunteer-marketplace-card__title">{o.title}</h3>
                        <p className="volunteer-marketplace-card__meta">
                          {sourceLabel(o)} · {o.priority} · open {o.quantityOpen}
                        </p>
                        {summary.reasons[0] ? (
                          <p className="volunteer-marketplace-card__why">{summary.reasons[0].detail}</p>
                        ) : null}
                        <div className="volunteer-marketplace-card__actions">
                          <button
                            type="button"
                            className="btn-touch btn-touch--ghost"
                            onClick={() => setDetail(o)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn-touch"
                            disabled={!self.volunteer || desk.claimBusy === o.id}
                            onClick={async () => {
                              setClaimMsg(null)
                              const r = await desk.claim(o)
                              setClaimMsg(r.ok ? 'Claim recorded.' : r.error)
                            }}
                          >
                            {desk.claimBusy === o.id ? 'Claiming…' : 'Claim'}
                          </button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="event-coordinator-desk__section" aria-labelledby="vm-all">
              <h2 id="vm-all" className="event-coordinator-desk__h2">
                All matching opportunities
              </h2>
              {desk.filtered.length === 0 ? (
                <p className="event-coordinator-desk__placeholder">
                  No opportunities match these filters. Clear filters or check back after coordinators publish
                  more work.
                </p>
              ) : (
                <ul className="volunteer-marketplace__card-list">
                  {desk.filtered.map((o) => {
                    const summary = recMap.get(o.id)
                    return (
                      <li key={o.id}>
                        <article className="volunteer-marketplace-card">
                          <h3 className="volunteer-marketplace-card__title">{o.title}</h3>
                          <p className="volunteer-marketplace-card__meta">
                            {sourceLabel(o)}
                            {o.virtual ? ' · live' : ''} · {o.commitmentType} · {o.priority} · open{' '}
                            {o.quantityOpen}
                          </p>
                          {o.dueAt || o.startsAt ? (
                            <p className="volunteer-marketplace-card__when">
                              {o.startsAt
                                ? new Date(o.startsAt).toLocaleString()
                                : o.dueAt
                                  ? `Due ${new Date(o.dueAt).toLocaleString()}`
                                  : ''}
                            </p>
                          ) : null}
                          {o.locationLabel ? (
                            <p className="volunteer-marketplace-card__where">{o.locationLabel}</p>
                          ) : null}
                          {summary?.reasons[0] ? (
                            <p className="volunteer-marketplace-card__why">{summary.reasons[0].detail}</p>
                          ) : null}
                          <div className="volunteer-marketplace-card__actions">
                            <button
                              type="button"
                              className="btn-touch btn-touch--ghost"
                              onClick={() => setDetail(o)}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              className="btn-touch"
                              disabled={!self.volunteer || desk.claimBusy === o.id}
                              onClick={async () => {
                                setClaimMsg(null)
                                const r = await desk.claim(o)
                                setClaimMsg(r.ok ? 'Claim recorded.' : r.error)
                              }}
                            >
                              {desk.claimBusy === o.id ? 'Claiming…' : 'Claim'}
                            </button>
                          </div>
                        </article>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {claimMsg ? (
              <p className="event-coordinator-desk__meta" role="status">
                {claimMsg}
              </p>
            ) : null}

            {detail ? (
              <div
                className="volunteer-marketplace-detail"
                role="dialog"
                aria-modal="true"
                aria-labelledby="vm-detail-title"
              >
                <div className="volunteer-marketplace-detail__backdrop" onClick={() => setDetail(null)} />
                <div className="volunteer-marketplace-detail__panel">
                  <button
                    type="button"
                    className="volunteer-marketplace-detail__close"
                    onClick={() => setDetail(null)}
                  >
                    Close
                  </button>
                  <h2 id="vm-detail-title" className="volunteer-marketplace-detail__title">
                    {detail.title}
                  </h2>
                  <p className="volunteer-marketplace-detail__meta">
                    {sourceLabel(detail)} · {detail.roleSlug ?? '—'} · {detail.commitmentType}
                  </p>
                  {detail.description ? (
                    <p className="volunteer-marketplace-detail__body">{detail.description}</p>
                  ) : null}
                  <p className="volunteer-marketplace-detail__body">
                    Openings: {detail.quantityOpen} · Filled: {detail.quantityFilled}
                  </p>
                  <div className="volunteer-marketplace-card__actions">
                    <button type="button" className="btn-touch" onClick={() => void desk.claim(detail)}>
                      Claim now
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>
      <AppFooter />
    </>
  )
}
