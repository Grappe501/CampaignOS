import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import { useProfile } from '../hooks/useProfile'
import { campaignEventRecordPath } from '../lib/campaignEventSystem'
import { insertEventAttendance } from '../lib/campaignEventsFromSupabase'
import { supabase } from '../lib/supabaseClient'

type Props = { onDevSessionClear?: () => void }

export default function EventCheckInPage({ onDevSessionClear }: Props) {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const { loading } = useProfile()
  const [name, setName] = useState('')
  const [walkIn, setWalkIn] = useState(true)
  const [volunteer, setVolunteer] = useState(false)
  const [donor, setDonor] = useState(false)
  const [issue, setIssue] = useState(false)
  const [influencer, setInfluencer] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const submit = async () => {
    const n = name.trim()
    if (!n || !eventId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    const { error: err } = await insertEventAttendance(eventId, {
      displayName: n,
      walkIn,
      flags: {
        volunteerInterest: volunteer,
        donorInterest: donor,
        issueConcern: issue,
        influencerOrLeader: influencer,
      },
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setMessage('Checked in.')
    setName('')
  }

  if (loading) {
    return (
      <div className="app-viewport">
        <div className="loading-screen" role="status">
          Loading…
        </div>
      </div>
    )
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell" id="event-checkin">
        <div className="event-coordinator-desk">
          <header className="event-coordinator-desk__command">
            <p className="event-coordinator-desk__eyebrow">Field check-in</p>
            <h1 className="event-coordinator-desk__title">Quick add attendee</h1>
            <p className="event-coordinator-desk__lede">
              Mobile-first capture for walk-ins and supporters. Saves to campaign attendance.
            </p>
            <Link to={campaignEventRecordPath(eventId)} className="btn-touch btn-touch--ghost">
              Event command center
            </Link>
          </header>

          <section className="event-coordinator-desk__section" aria-labelledby="checkin-form">
            <h2 id="checkin-form" className="event-coordinator-desk__h2">
              Attendee
            </h2>
            <div className="neighborhood-form">
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Full name"
                />
              </label>
              <label className="checkin-toggle">
                <input type="checkbox" checked={walkIn} onChange={(e) => setWalkIn(e.target.checked)} />
                Walk-in
              </label>
              <p className="event-coordinator-desk__placeholder">Signals</p>
              <label className="checkin-toggle">
                <input
                  type="checkbox"
                  checked={volunteer}
                  onChange={(e) => setVolunteer(e.target.checked)}
                />
                Volunteer interest
              </label>
              <label className="checkin-toggle">
                <input type="checkbox" checked={donor} onChange={(e) => setDonor(e.target.checked)} />
                Donor interest
              </label>
              <label className="checkin-toggle">
                <input type="checkbox" checked={issue} onChange={(e) => setIssue(e.target.checked)} />
                Issue / concern
              </label>
              <label className="checkin-toggle">
                <input
                  type="checkbox"
                  checked={influencer}
                  onChange={(e) => setInfluencer(e.target.checked)}
                />
                Community leader / influencer
              </label>
            </div>
            <div className="neighborhood-form-actions">
              <button
                type="button"
                className="btn-touch"
                disabled={saving || !name.trim()}
                onClick={() => void submit()}
              >
                {saving ? 'Saving…' : 'Save check-in'}
              </button>
            </div>
            {error ? (
              <p className="subtitle" role="alert" style={{ color: 'var(--danger, #c00)' }}>
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="subtitle" role="status">
                {message}
              </p>
            ) : null}
          </section>
        </div>
      </main>
      <AppFooter />
    </>
  )
}
