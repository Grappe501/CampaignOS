import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import { useProfile } from '../hooks/useProfile'
import { canAccessSignupSheetIngestion } from '../lib/signupSheetAccess'
import { createSignupBatchFromTable } from '../lib/signupSheetImport'
import { supabase } from '../lib/supabaseClient'

type BatchRow = {
  id: string
  title: string | null
  status: string
  row_count: number
  created_at: string
  event_id: string | null
}

type IngestionPageProps = {
  onDevSessionClear?: () => void
}

export default function SignupSheetIngestionPage({ onDevSessionClear }: IngestionPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const linkedEventId = searchParams.get('eventId')
  const { profile, loading } = useProfile()
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteBody, setPasteBody] = useState('')
  const [ingestError, setIngestError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setListError(null)
    const { data, error } = await supabase
      .from('signup_sheet_batches')
      .select('id, title, status, row_count, created_at, event_id')
      .order('created_at', { ascending: false })
      .limit(80)
    if (error) {
      setListError(error.message)
      return
    }
    setBatches((data ?? []) as BatchRow[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const runIngest = async () => {
    if (!profile?.id) return
    setBusy(true)
    setIngestError(null)
    const res = await createSignupBatchFromTable(supabase, {
      campaignId: 'default',
      profileId: String(profile.id),
      title: pasteTitle.trim(),
      eventId: linkedEventId,
      tableText: pasteBody,
    })
    setBusy(false)
    if (res.error) {
      setIngestError(res.error)
      return
    }
    setPasteBody('')
    await load()
    navigate(`/ops/signup-sheets/${res.batchId}`)
  }

  if (!loading && profile && !canAccessSignupSheetIngestion(profile.primary_role)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell">
        <div className="event-coordinator-desk" style={{ maxWidth: 960, margin: '0 auto' }}>
          <header style={{ marginBottom: '1.5rem' }}>
            <p className="event-coordinator-desk__eyebrow">Operations</p>
            <h1 className="event-coordinator-desk__title">Signup sheet ingestion</h1>
            <p className="event-coordinator-desk__lede">
              Paste tab- or comma-separated rows with a header (county, first name, last name, address,
              phone, email, notes; optional dob on paper for review only — matching uses county, address,
              then names).
              {linkedEventId ? (
                <>
                  {' '}
                  New batches from this screen are linked to event <code>{linkedEventId}</code>.
                </>
              ) : null}
            </p>
          </header>

          <section
            className="event-coordinator-desk__panel"
            style={{ padding: '1rem', marginBottom: '1.5rem' }}
          >
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              New batch from paste
            </h2>
            <label className="subtitle" htmlFor="ss-title">
              Title
            </label>
            <input
              id="ss-title"
              className="btn-touch"
              style={{ display: 'block', width: '100%', marginBottom: '0.75rem' }}
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="e.g. Pulaski fair — Sept signup"
            />
            <label className="subtitle" htmlFor="ss-paste">
              Table
            </label>
            <textarea
              id="ss-paste"
              rows={10}
              className="btn-touch"
              style={{ width: '100%', fontFamily: 'inherit', marginBottom: '0.75rem' }}
              value={pasteBody}
              onChange={(e) => setPasteBody(e.target.value)}
              placeholder={
                'County\tFirst name\tLast name\tAddress\tPhone\tEmail\nPulaski\tJane\tDoe\t123 Main, Little Rock\t5015550100\tj@example.com'
              }
            />
            {ingestError ? (
              <p role="alert" style={{ color: 'var(--danger, #c0392b)' }}>
                {ingestError}
              </p>
            ) : null}
            <button
              type="button"
              className="btn-touch"
              disabled={busy || !pasteBody.trim()}
              onClick={() => void runIngest()}
            >
              {busy ? 'Processing…' : 'Create batch & match'}
            </button>
          </section>

          <section>
            <h2 className="page-title" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              Recent batches
            </h2>
            {listError ? (
              <p role="alert">{listError}</p>
            ) : null}
            {loading && !profile ? (
              <div className="loading-screen" role="status" aria-live="polite">
                Loading…
              </div>
            ) : batches.length === 0 ? (
              <p className="subtitle">No batches yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {batches.map((b) => (
                  <li
                    key={b.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      padding: '0.65rem 0',
                    }}
                  >
                    <Link to={`/ops/signup-sheets/${b.id}`}>{b.title ?? 'Untitled batch'}</Link>
                    <span className="subtitle" style={{ marginLeft: '0.5rem' }}>
                      {b.status} · {b.row_count} rows · {new Date(b.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="subtitle" style={{ marginTop: '2rem' }}>
            <Link to="/events">← Event coordinator desk</Link>
            {' · '}
            <Link to="/intern">Intern workspace</Link>
          </p>
        </div>
      </main>
      <AppFooter />
    </>
  )
}
