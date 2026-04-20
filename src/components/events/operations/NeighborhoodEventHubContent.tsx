import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CAMPAIGN_EVENT_NEW_RECORD_SLUG, campaignEventRecordPath } from '../../../lib/campaignEventSystem'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import { createEventFromTemplate } from '../../../lib/campaignEventDomainServices'
import { getEventTypeTemplate } from '../../../lib/event-types.config'
import { EVENT_OBJECTIVES } from '../../../lib/campaignEventDomain'
import type { EventObjective } from '../../../lib/campaignEventDomain'

const NEIGHBORHOOD_PRESETS: { id: string; key: CampaignEventTypeKey; label: string; hint: string }[] = [
  { id: 'house', key: 'house_party_intro_candidate', label: 'House meeting', hint: 'Introduce the campaign locally' },
  { id: 'coffee', key: 'coffee_meeting', label: 'Coffee meetup', hint: 'Low-lift relationship building' },
  { id: 'block', key: 'coffee_meeting', label: 'Block meetup', hint: 'Use coffee template; add block context in title' },
  { id: 'huddle', key: 'volunteer_recruitment_event', label: 'Volunteer huddle', hint: 'Recruit for shifts' },
  { id: 'canvass', key: 'public_fair_festival', label: 'Canvass launch', hint: 'Pair with fair template until canvass type ships' },
  { id: 'listen', key: 'community_listening_session', label: 'Listening circle', hint: 'Surface issues for the campaign' },
  { id: 'ev', key: 'early_vote_rally', label: 'Early vote trip meetup', hint: 'Staging + rides' },
]

export default function NeighborhoodEventHubContent() {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [preset, setPreset] = useState<(typeof NEIGHBORHOOD_PRESETS)[number] | null>(null)
  const [objective, setObjective] = useState<EventObjective>('listening')
  const [title, setTitle] = useState('')
  const [where, setWhere] = useState('')
  const [when, setWhen] = useState('')
  const [host, setHost] = useState('')
  const [expected, setExpected] = useState(15)
  const [support, setSupport] = useState('')

  const preview = useMemo(() => {
    if (!preset) return null
    const startAt = when ? new Date(when).toISOString() : new Date().toISOString()
    return createEventFromTemplate(preset.key, {
      startAt,
      title: title || preset.label,
      countyId: null,
      precinctId: 'local-precinct',
      overrides: {
        event_objective: objective,
        goals_summary: `${support || 'Support TBD'} — host: ${host || 'TBD'}`,
        venue_name: where || null,
      },
    })
  }, [preset, title, when, objective, support, host, where])

  const miniChecklist = useMemo(() => {
    if (!preset) return []
    const t = getEventTypeTemplate(preset.key)
    return [
      ...t.prepChecklist.items.slice(0, 4).map((i) => i.label),
      ...t.materialsChecklist.items.slice(0, 2).map((i) => i.label),
    ]
  }, [preset])

  return (
    <div className="event-coordinator-desk neighborhood-event-hub" id="neighborhood-event-hub">
      <header className="event-coordinator-desk__command">
        <p className="event-coordinator-desk__eyebrow">Neighborhood activation</p>
        <h1 className="event-coordinator-desk__title">Local event launcher</h1>
        <p className="event-coordinator-desk__lede">
          Precinct captains and hosts: spin up a small event with guided prompts. Saving to Supabase is
          next — preview shows the insert payload the domain layer will use.
        </p>
        <div className="event-coordinator-desk__quick-actions">
          <Link to="/events/county-ops" className="btn-touch btn-touch--ghost">
            County command center
          </Link>
          <Link to="/events" className="btn-touch btn-touch--ghost">
            Coordinator desk
          </Link>
        </div>
      </header>

      {step === 0 ? (
        <section className="event-coordinator-desk__section" aria-labelledby="nh-pick-heading">
          <h2 id="nh-pick-heading" className="event-coordinator-desk__h2">
            What are you running?
          </h2>
          <ul className="neighborhood-preset-grid">
            {NEIGHBORHOOD_PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="neighborhood-preset-card"
                  onClick={() => {
                    setPreset(p)
                    setTitle(p.label)
                    setStep(1)
                  }}
                >
                  <span className="neighborhood-preset-card__title">{p.label}</span>
                  <span className="neighborhood-preset-card__hint">{p.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === 1 && preset ? (
        <section className="event-coordinator-desk__section" aria-labelledby="nh-detail-heading">
          <h2 id="nh-detail-heading" className="event-coordinator-desk__h2">
            Details
          </h2>
          <div className="neighborhood-form">
            <label>
              Main goal
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value as EventObjective)}
              >
                {EVENT_OBJECTIVES.map((o) => (
                  <option key={o} value={o}>
                    {o.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Where
              <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Address or place" />
            </label>
            <label>
              When (local)
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </label>
            <label>
              Host
              <input value={host} onChange={(e) => setHost(e.target.value)} />
            </label>
            <label>
              Expected attendance
              <input
                type="number"
                min={1}
                value={expected}
                onChange={(e) => setExpected(Number(e.target.value))}
              />
            </label>
            <label>
              What support is needed?
              <textarea value={support} onChange={(e) => setSupport(e.target.value)} rows={3} />
            </label>
          </div>
          <div className="neighborhood-form-actions">
            <button type="button" className="btn-touch" onClick={() => setStep(2)}>
              Generate plan
            </button>
            <button type="button" className="btn-touch btn-touch--ghost" onClick={() => setStep(0)}>
              Back
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 && preset && preview ? (
        <section className="event-coordinator-desk__section" aria-labelledby="nh-plan-heading">
          <h2 id="nh-plan-heading" className="event-coordinator-desk__h2">
            Your plan
          </h2>
          <p className="event-coordinator-desk__placeholder">
            Mini checklist (from type template) and insert preview. Agent Jones can consume the same
            structure for briefings later.
          </p>
          <ul className="county-ops-board">
            {miniChecklist.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <details className="event-coordinator-desk__details">
            <summary>Insert payload (dev)</summary>
            <pre className="neighborhood-json">{JSON.stringify(preview, null, 2)}</pre>
          </details>
          <div className="neighborhood-form-actions">
            <Link
              className="btn-touch"
              to={`${campaignEventRecordPath(CAMPAIGN_EVENT_NEW_RECORD_SLUG)}?type=${preset.key}`}
            >
              Open full event scaffold
            </Link>
            <button type="button" className="btn-touch btn-touch--ghost" onClick={() => setStep(1)}>
              Edit
            </button>
          </div>
        </section>
      ) : null}

      <section className="event-coordinator-desk__section" aria-labelledby="nh-dash-heading">
        <h2 id="nh-dash-heading" className="event-coordinator-desk__h2">
          Precinct captain dashboard (preview)
        </h2>
        <ul className="county-ops-kpi-grid" role="list" style={{ listStyle: 'none', padding: 0 }}>
          <li className="county-ops-kpi">
            <span className="county-ops-kpi__k">My upcoming events</span>
            <span className="county-ops-kpi__v">—</span>
          </li>
          <li className="county-ops-kpi">
            <span className="county-ops-kpi__k">Open tasks</span>
            <span className="county-ops-kpi__v">—</span>
          </li>
          <li className="county-ops-kpi">
            <span className="county-ops-kpi__k">Volunteer recruits</span>
            <span className="county-ops-kpi__v">—</span>
          </li>
        </ul>
        <p className="event-coordinator-desk__placeholder">
          Nudges (placeholders): no event in precinct in 21 days · high-support block with low activity ·
          volunteer cluster nearby. Wire to analytics + turf in a later pass.
        </p>
      </section>

      <p className="event-coordinator-desk__foot">
        <Link to="/events">← Event Coordinator Desk</Link>
      </p>
    </div>
  )
}
