import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import TalkingPointCard from '../components/messaging/TalkingPointCard'
import ScriptPanel from '../components/messaging/ScriptPanel'
import ObjectionHandlerPanel from '../components/messaging/ObjectionHandlerPanel'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabaseClient'
import { buildCampaignMessageFramework } from '../lib/messageFramework'
import type { MessageTone } from '../lib/messageFramework'
import {
  buildFrameworkExcerptForDraft,
  selectTalkingPointsForContext,
  type MessageTargetContext,
  type VoterMessageSegment,
  type OutreachChannelKind,
  type EventTypeHint,
} from '../lib/messageTargeting'
import { applyToneToTalkingPoint, requestBoundedMessageDraft } from '../lib/messageAssist'
import { evaluateMessageDiscipline, explainDisciplineReport } from '../lib/messageDiscipline'
import type { MessageDraftMode } from '../lib/api/messageDraft'

type FieldNarrativePageProps = {
  onDevSessionClear?: () => void
}

export default function FieldNarrativePage({ onDevSessionClear }: FieldNarrativePageProps) {
  const { profile, loading } = useProfile()
  const framework = useMemo(() => buildCampaignMessageFramework(), [])
  const [county, setCounty] = useState('')
  const [segment, setSegment] = useState<VoterMessageSegment>('base')
  const [channel, setChannel] = useState<OutreachChannelKind>('canvass')
  const [eventType, setEventType] = useState<EventTypeHint>('other')
  const [tone, setTone] = useState<MessageTone>('volunteer')
  const [draftMode, setDraftMode] = useState<MessageDraftMode>('field_canvass_intro')
  const [operatorNote, setOperatorNote] = useState('')
  const [draftOut, setDraftOut] = useState<string | null>(null)
  const [draftErr, setDraftErr] = useState<string | null>(null)
  const [draftBusy, setDraftBusy] = useState(false)
  const [disciplineDraft, setDisciplineDraft] = useState('')

  const ctx: MessageTargetContext = useMemo(
    () => ({
      county: county.trim() || null,
      segment,
      channel,
      event_type: eventType,
    }),
    [county, segment, channel, eventType],
  )

  const points = useMemo(() => selectTalkingPointsForContext(framework, ctx, 6), [framework, ctx])

  const discipline = useMemo(
    () =>
      evaluateMessageDiscipline(
        disciplineDraft,
        framework,
        points[0] ? [points[0].pillar_key] : [],
      ),
    [disciplineDraft, framework, points],
  )

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const runAiDraft = async () => {
    setDraftBusy(true)
    setDraftErr(null)
    setDraftOut(null)
    try {
      const excerpt = buildFrameworkExcerptForDraft(framework, ctx)
      const res = await requestBoundedMessageDraft({
        mode: draftMode,
        tone,
        framework_excerpt: excerpt,
        operator_note: operatorNote || undefined,
      })
      setDraftOut(`**${res.title}**\n\n${res.body}`)
    } catch (e) {
      setDraftErr(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDraftBusy(false)
    }
  }

  if (loading && !profile) {
    return (
      <>
        <AppHeader onSignOut={handleSignOut} />
        <main className="app-shell">
          <div className="loading-screen" role="status">
            Loading…
          </div>
        </main>
        <AppFooter />
      </>
    )
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell dashboard-workspace event-coordinator-desk-shell">
        <header className="event-coordinator-desk__command">
          <p className="event-coordinator-desk__eyebrow">Message discipline</p>
          <h1 className="event-coordinator-desk__title">Field narrative workbench</h1>
          <p className="event-coordinator-desk__lede">
            One voice in the field: canonical pillars, targeted talking points, scripts, and bounded AI
            drafts — human review required before send or publish.
          </p>
          <div className="event-coordinator-desk__quick-actions">
            <Link to="/dashboard" className="btn-touch btn-touch--ghost">
              Dashboard
            </Link>
            <Link to="/power5" className="btn-touch btn-touch--ghost">
              Power5
            </Link>
            <Link to="/coordinator" className="btn-touch btn-touch--ghost">
              Coordinator desk
            </Link>
          </div>
        </header>

        <section className="event-coordinator-desk__section" aria-labelledby="fn-controls">
          <h2 id="fn-controls" className="event-coordinator-desk__h2">
            Targeting
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <label className="power5-field">
              <span className="power5-field-label">County hint</span>
              <input
                className="power5-input"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g. Pulaski"
                maxLength={80}
              />
            </label>
            <label className="power5-field">
              <span className="power5-field-label">Segment</span>
              <select
                className="power5-select"
                value={segment}
                onChange={(e) => setSegment(e.target.value as VoterMessageSegment)}
              >
                <option value="base">Base</option>
                <option value="persuadable">Persuadable</option>
                <option value="turnout">Turnout</option>
                <option value="volunteer">Volunteer</option>
                <option value="surrogate">Surrogate</option>
              </select>
            </label>
            <label className="power5-field">
              <span className="power5-field-label">Channel</span>
              <select
                className="power5-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as OutreachChannelKind)}
              >
                <option value="canvass">Canvass</option>
                <option value="phone">Phone</option>
                <option value="event">Event</option>
                <option value="text">Text</option>
                <option value="social">Social</option>
                <option value="relational">Relational</option>
              </select>
            </label>
            <label className="power5-field">
              <span className="power5-field-label">Event type</span>
              <select
                className="power5-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventTypeHint)}
              >
                <option value="other">Other</option>
                <option value="house_party">House party</option>
                <option value="canvass_launch">Canvass launch</option>
                <option value="town_hall">Town hall</option>
                <option value="early_vote">Early vote</option>
                <option value="phone_bank">Phone bank</option>
                <option value="training">Training</option>
              </select>
            </label>
          </div>
        </section>

        <section className="event-coordinator-desk__section" aria-labelledby="fn-points">
          <h2 id="fn-points" className="event-coordinator-desk__h2">
            Talking points (ranked for this target)
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {points.map((p) => (
              <TalkingPointCard
                key={p.id}
                framework={framework}
                point={p}
                tonePreview={applyToneToTalkingPoint(p.headline, tone)}
              />
            ))}
          </div>
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          <ScriptPanel framework={framework} context={ctx} />
          <ObjectionHandlerPanel framework={framework} context={ctx} />
        </div>

        <section className="event-coordinator-desk__section" aria-labelledby="fn-ai">
          <h2 id="fn-ai" className="event-coordinator-desk__h2">
            Bounded AI draft (review only)
          </h2>
          <p className="subtitle">
            Uses <code>message-draft</code> with a capped framework excerpt — no new pillars or policy.
          </p>
          <div className="power5-field-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <label className="power5-field">
              <span className="power5-field-label">Mode</span>
              <select
                className="power5-select"
                value={draftMode}
                onChange={(e) => setDraftMode(e.target.value as MessageDraftMode)}
              >
                <option value="field_canvass_intro">Canvass intro</option>
                <option value="field_phone_bank">Phone bank</option>
                <option value="event_host_remarks">Event host</option>
                <option value="talking_point_compress">Compress bullets</option>
                <option value="talking_point_expand">Expand for training</option>
                <option value="objection_reply">Objection replies</option>
              </select>
            </label>
            <label className="power5-field">
              <span className="power5-field-label">Tone</span>
              <select
                className="power5-select"
                value={tone}
                onChange={(e) => setTone(e.target.value as MessageTone)}
              >
                <option value="volunteer">Volunteer</option>
                <option value="surrogate">Surrogate</option>
                <option value="candidate">Candidate</option>
                <option value="staff">Staff</option>
              </select>
            </label>
          </div>
          <label className="power5-field">
            <span className="power5-field-label">Local note (optional)</span>
            <input
              className="power5-input"
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              maxLength={500}
              placeholder="Precinct, event name, etc."
            />
          </label>
          <p>
            <button type="button" className="btn-touch" disabled={draftBusy} onClick={() => void runAiDraft()}>
              {draftBusy ? 'Generating…' : 'Generate draft'}
            </button>
          </p>
          {draftErr ? (
            <p className="subtitle" role="alert">
              {draftErr}
            </p>
          ) : null}
          {draftOut ? (
            <pre
              className="subtitle"
              style={{
                whiteSpace: 'pre-wrap',
                background: 'var(--surface-elevated, #f6f6f6)',
                padding: '0.75rem',
                borderRadius: 8,
              }}
            >
              {draftOut}
            </pre>
          ) : null}
        </section>

        <section className="event-coordinator-desk__section" aria-labelledby="fn-discipline">
          <h2 id="fn-discipline" className="event-coordinator-desk__h2">
            Discipline check
          </h2>
          <textarea
            className="power5-input"
            style={{ minHeight: 120, width: '100%' }}
            value={disciplineDraft}
            onChange={(e) => setDisciplineDraft(e.target.value)}
            placeholder="Paste a draft script to score against pillar anchors and drift watchlist…"
          />
          <ul style={{ marginTop: '0.75rem' }}>
            {explainDisciplineReport(discipline).map((line) => (
              <li key={line} className="subtitle">
                {line}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <AppFooter />
    </>
  )
}
