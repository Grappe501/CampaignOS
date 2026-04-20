import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import { useProfile } from '../hooks/useProfile'
import { canAccessSignupSheetIngestion } from '../lib/signupSheetAccess'
import {
  refreshSignupRowMatch,
  type SignupMatchCandidate,
} from '../lib/signupSheetImport'
import { normalizeSignupExtracted, type SignupExtractedFields } from '../lib/signupSheetNormalize'
import { supabase } from '../lib/supabaseClient'

type SheetRow = {
  id: string
  sheet_row_index: number
  raw_cells: Record<string, string>
  extracted: SignupExtractedFields
  normalized: Record<string, unknown>
  dob_raw: string | null
  dob_normalized: string | null
  review_status: string
  confidence: number | null
  match_reasons: string[] | null
  match_candidates: SignupMatchCandidate[] | null
  selected_profile_id: string | null
  escalation_note: string | null
  reviewed_at: string | null
  imported_at: string | null
}

type Batch = {
  id: string
  title: string | null
  status: string
  row_count: number
  event_id: string | null
}

type BatchPageProps = {
  onDevSessionClear?: () => void
}

function fieldRows(
  extracted: SignupExtractedFields,
  onChange: (next: SignupExtractedFields) => void,
  disabled: boolean,
) {
  const keys: (keyof SignupExtractedFields)[] = [
    'county',
    'first_name',
    'last_name',
    'address',
    'phone',
    'email',
    'notes',
    'dob',
  ]
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      {keys.map((k) => (
        <label key={k} className="subtitle" style={{ display: 'block' }}>
          {k.replace(/_/g, ' ')}
          <input
            className="btn-touch"
            style={{ width: '100%', display: 'block', marginTop: 4 }}
            value={(extracted[k] as string | undefined) ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...extracted, [k]: e.target.value || null })}
          />
        </label>
      ))}
    </div>
  )
}

export default function SignupSheetBatchPage({ onDevSessionClear }: BatchPageProps) {
  const { batchId = '' } = useParams<{ batchId: string }>()
  const { profile, loading } = useProfile()
  const [batch, setBatch] = useState<Batch | null>(null)
  const [rows, setRows] = useState<SheetRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<SignupExtractedFields | null>(null)
  const [escNote, setEscNote] = useState('')

  const pickRow = useCallback((r: SheetRow) => {
    setSelectedId(r.id)
    setDraft({ ...r.extracted })
    setEscNote(r.escalation_note ?? '')
  }, [])

  const syncDraftFromList = useCallback((mapped: SheetRow[], sid: string | null) => {
    if (!sid) return
    const cur = mapped.find((x) => x.id === sid)
    if (cur) {
      setDraft({ ...cur.extracted })
      setEscNote(cur.escalation_note ?? '')
    }
  }, [])

  const load = useCallback(async (): Promise<SheetRow[] | null> => {
    if (!batchId) return null
    setErr(null)
    const { data: b, error: bErr } = await supabase
      .from('signup_sheet_batches')
      .select('id, title, status, row_count, event_id')
      .eq('id', batchId)
      .maybeSingle()
    if (bErr || !b) {
      setErr(bErr?.message ?? 'Batch not found')
      return null
    }
    setBatch(b as Batch)
    const { data: r, error: rErr } = await supabase
      .from('signup_sheet_rows')
      .select(
        'id, sheet_row_index, raw_cells, extracted, normalized, dob_raw, dob_normalized, review_status, confidence, match_reasons, match_candidates, selected_profile_id, escalation_note, reviewed_at, imported_at',
      )
      .eq('batch_id', batchId)
      .order('sheet_row_index', { ascending: true })
    if (rErr) {
      setErr(rErr.message)
      return null
    }
    const mapped = (r ?? []).map((x) => ({
      ...x,
      raw_cells: (x.raw_cells ?? {}) as Record<string, string>,
      extracted: (x.extracted ?? {}) as SignupExtractedFields,
      match_candidates: (x.match_candidates ?? null) as SignupMatchCandidate[] | null,
      match_reasons: (x.match_reasons ?? null) as string[] | null,
    })) as SheetRow[]
    setRows(mapped)
    return mapped
  }, [batchId])

  useEffect(() => {
    setSelectedId(null)
    setDraft(null)
    setEscNote('')
  }, [batchId])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(
    () => rows.find((x) => x.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const saveDraftAndRematch = async () => {
    if (!selected || !draft || !profile?.id) return
    setBusy(true)
    await refreshSignupRowMatch(supabase, selected.id, 'default', draft)
    setBusy(false)
    const mapped = await load()
    if (mapped) syncDraftFromList(mapped, selected.id)
  }

  const setDecision = async (
    status: 'confirmed_existing' | 'create_new' | 'escalated' | 'unreadable' | 'skipped',
    profileId?: string | null,
  ) => {
    if (!selected || !profile?.id) return
    setBusy(true)
    await supabase
      .from('signup_sheet_rows')
      .update({
        review_status: status,
        selected_profile_id: profileId ?? null,
        escalation_note: status === 'escalated' ? escNote.trim() || null : null,
        reviewed_by_profile_id: String(profile.id),
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selected.id)
    setBusy(false)
    const mapped = await load()
    if (mapped) syncDraftFromList(mapped, selected.id)
  }

  const runImport = async () => {
    if (!selected) return
    setBusy(true)
    const { data, error } = await supabase.rpc('signup_sheet_commit_import', {
      p_row_id: selected.id,
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    const ok = (data as { ok?: boolean })?.ok
    if (!ok) {
      setErr('Import refused — check review status (escalated rows cannot import).')
    }
    const mapped = await load()
    if (mapped && selected) syncDraftFromList(mapped, selected.id)
  }

  if (!loading && profile && !canAccessSignupSheetIngestion(profile.primary_role)) {
    return <Navigate to="/dashboard" replace />
  }

  if (!batchId) {
    return <Navigate to="/ops/signup-sheets" replace />
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell">
        <div
          className="event-coordinator-desk"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 28%) 1fr', gap: '1rem' }}
        >
          <aside style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '0.5rem' }}>
            <p className="subtitle" style={{ marginBottom: '0.5rem' }}>
              <Link to="/ops/signup-sheets">← Ingestion hub</Link>
            </p>
            <h1 className="page-title" style={{ fontSize: '1.15rem' }}>
              {batch?.title ?? 'Batch'}
            </h1>
            <p className="subtitle">
              {batch?.status} · {batch?.row_count ?? rows.length} rows
            </p>
            {err ? (
              <p role="alert" style={{ color: 'var(--danger, #c0392b)' }}>
                {err}
              </p>
            ) : null}
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {rows.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  className="btn-touch"
                  onClick={() => pickRow(r)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: 6,
                    background:
                      r.id === selectedId ? 'rgba(127,127,255,0.15)' : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>#{r.sheet_row_index + 1}</span>{' '}
                  <span className="subtitle">{r.review_status}</span>{' '}
                  {r.confidence != null ? (
                    <span className="subtitle">· {(r.confidence * 100).toFixed(0)}%</span>
                  ) : null}
                </button>
              ))}
            </div>
          </aside>

          <section>
            {!selected || !draft ? (
              <p className="subtitle">Select a row to review.</p>
            ) : (
              <>
                <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
                  Row #{selected.sheet_row_index + 1}
                </h2>
                <p className="subtitle">
                  Matching does not use volunteer-app DOB; sheet DOB is for review/audit only.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    alignItems: 'start',
                  }}
                >
                  <div>
                    <h3 className="subtitle">Extracted (edit + rematch)</h3>
                    {fieldRows(draft, setDraft, selected.imported_at != null)}
                    <button
                      type="button"
                      className="btn-touch"
                      style={{ marginTop: '0.75rem' }}
                      disabled={busy || selected.imported_at != null}
                      onClick={() => void saveDraftAndRematch()}
                    >
                      Save &amp; rematch
                    </button>
                  </div>
                  <div>
                    <h3 className="subtitle">Raw cells</h3>
                    <pre
                      style={{
                        fontSize: '0.8rem',
                        whiteSpace: 'pre-wrap',
                        padding: '0.5rem',
                        background: 'rgba(0,0,0,0.2)',
                      }}
                    >
                      {JSON.stringify(selected.raw_cells, null, 2)}
                    </pre>
                    <h3 className="subtitle">Normalized snapshot</h3>
                    <pre
                      style={{
                        fontSize: '0.8rem',
                        whiteSpace: 'pre-wrap',
                        padding: '0.5rem',
                        background: 'rgba(0,0,0,0.2)',
                      }}
                    >
                      {JSON.stringify(normalizeSignupExtracted(draft), null, 2)}
                    </pre>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <h3 className="subtitle">Match reasons (server)</h3>
                  <ul>
                    {(selected.match_reasons ?? []).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <h3 className="subtitle">Candidates (county → address → names)</h3>
                  <ol>
                    {(selected.match_candidates ?? []).slice(0, 8).map((c) => (
                      <li key={c.profile_id}>
                        {c.display_name ?? c.profile_id}{' '}
                        <span className="subtitle">
                          score {c.score.toFixed(3)} · {c.tier}
                        </span>
                        <ul>
                          {c.reasons.map((re) => (
                            <li key={re} className="subtitle">
                              {re}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="btn-touch"
                          disabled={
                            busy ||
                            selected.review_status === 'imported' ||
                            selected.review_status === 'escalated'
                          }
                          onClick={() => void setDecision('confirmed_existing', c.profile_id)}
                        >
                          Confirm this match
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-touch"
                    disabled={
                      busy ||
                      selected.review_status === 'imported' ||
                      selected.review_status === 'escalated'
                    }
                    onClick={() => void setDecision('create_new', null)}
                  >
                    Mark as new person (staged)
                  </button>
                  <button
                    type="button"
                    className="btn-touch"
                    disabled={busy || selected.review_status === 'imported'}
                    onClick={() => void setDecision('skipped', null)}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className="btn-touch"
                    disabled={busy || selected.review_status === 'imported'}
                    onClick={() => void setDecision('unreadable', null)}
                  >
                    Unreadable
                  </button>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <label className="subtitle" htmlFor="esc-note">
                    Escalation note
                  </label>
                  <textarea
                    id="esc-note"
                    className="btn-touch"
                    rows={2}
                    style={{ width: '100%', display: 'block', marginTop: 4 }}
                    value={escNote}
                    onChange={(e) => setEscNote(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-touch"
                    style={{ marginTop: 6 }}
                    disabled={busy || selected.review_status === 'imported'}
                    onClick={() => void setDecision('escalated', selected.selected_profile_id)}
                  >
                    Escalate (blocks import until resolved upstream)
                  </button>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn-touch"
                    disabled={
                      busy ||
                      selected.review_status === 'escalated' ||
                      selected.review_status === 'unreadable' ||
                      selected.review_status === 'imported'
                    }
                    onClick={() => void runImport()}
                  >
                    Commit import (audited stamp)
                  </button>
                  {selected.imported_at ? (
                    <p className="subtitle" style={{ marginTop: 8 }}>
                      Imported {new Date(selected.imported_at).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <AppFooter />
    </>
  )
}
