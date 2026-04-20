import type { CSSProperties, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { VoterCandidateRow } from '../lib/voterMatch'
import type { UseVoterMatchResult } from '../hooks/useVoterMatch'

const fieldStyle: CSSProperties = {
  width: '100%',
  maxWidth: 360,
  padding: 8,
  boxSizing: 'border-box',
}

const cardStyle: CSSProperties = {
  marginTop: 12,
  padding: 12,
  border: '1px solid var(--border)',
  borderRadius: 8,
  textAlign: 'left',
  background: 'var(--social-bg)',
}

function CandidateCard({
  row,
  onConfirm,
  disabled,
}: {
  row: VoterCandidateRow
  onConfirm: () => void
  disabled: boolean
}) {
  return (
    <div style={cardStyle}>
      <div style={{ color: 'var(--text-h)', marginBottom: 8 }}>
        {row.name_first} {row.name_last}
      </div>
      <div style={{ fontSize: 15, marginBottom: 6 }}>
        <strong>County:</strong> {row.county ?? '—'}
      </div>
      <div style={{ fontSize: 15, marginBottom: 6 }}>
        <strong>City:</strong> {row.res_city ?? '—'}
      </div>
      <div style={{ fontSize: 15, marginBottom: 6 }}>
        <strong>Precinct:</strong> {row.precinct_name ?? '—'}
      </div>
      <div style={{ fontSize: 15, marginBottom: 12 }}>
        <strong>Registration status:</strong> {row.registrant_status ?? '—'}
      </div>
      <button type="button" onClick={onConfirm} disabled={disabled}>
        That&apos;s me
      </button>
    </div>
  )
}

export default function VoterMatchForm({
  vm,
  campaignProfileId,
}: {
  vm: UseVoterMatchResult
  campaignProfileId: string | undefined
}) {
  const [nameLast, setNameLast] = useState('')
  const [nameFirst, setNameFirst] = useState('')
  const [dob, setDob] = useState('')
  const [lastSearch, setLastSearch] = useState<{
    nameLast: string
    nameFirst: string
    dateOfBirth: string
    county: string | null
    count: number
  } | null>(null)

  const needsCounty = useMemo(
    () => vm.candidates.length > 1 && !vm.usedCountyRefinement,
    [vm.candidates.length, vm.usedCountyRefinement],
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const countyTrim = vm.countyRefinement.trim()
    void (async () => {
      const rows = await vm.search({
        nameLast,
        nameFirst,
        dateOfBirth: dob,
        county: countyTrim || undefined,
      })
      setLastSearch({
        nameLast: nameLast.trim(),
        nameFirst: nameFirst.trim(),
        dateOfBirth: dob,
        county: countyTrim || null,
        count: rows.length,
      })
    })()
  }

  const confirmCandidate = (row: VoterCandidateRow) => {
    if (!lastSearch) return
    void vm.confirm({
      voterId: row.voter_id,
      nameLast: lastSearch.nameLast,
      nameFirst: lastSearch.nameFirst,
      dateOfBirth: lastSearch.dateOfBirth,
      county: lastSearch.county,
      candidateCountAtSearch: lastSearch.count,
    })
  }

  if (!campaignProfileId) {
    return (
      <p style={{ color: 'var(--text)' }}>
        Campaign profile is not loaded; voter match is unavailable.
      </p>
    )
  }

  return (
    <section style={{ marginTop: 24, textAlign: 'left' }} aria-label="Voter match">
      <h2 style={{ marginTop: 0 }}>Verify your voter registration</h2>
      <p style={{ fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>
        Enter your legal name and date of birth as they appear on Arkansas voter
        records. County is optional at first; if several people match, you can
        narrow by county.
      </p>

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="vm-last" style={{ display: 'block', marginBottom: 4 }}>
            Last name
          </label>
          <input
            id="vm-last"
            value={nameLast}
            onChange={(e) => setNameLast(e.target.value)}
            autoComplete="family-name"
            style={fieldStyle}
            required
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="vm-first" style={{ display: 'block', marginBottom: 4 }}>
            First name
          </label>
          <input
            id="vm-first"
            value={nameFirst}
            onChange={(e) => setNameFirst(e.target.value)}
            autoComplete="given-name"
            style={fieldStyle}
            required
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="vm-dob" style={{ display: 'block', marginBottom: 4 }}>
            Date of birth
          </label>
          <input
            id="vm-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            style={fieldStyle}
            required
          />
        </div>

        {(needsCounty || vm.candidates.length > 1) && (
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="vm-county" style={{ display: 'block', marginBottom: 4 }}>
              County (to narrow multiple matches)
            </label>
            <input
              id="vm-county"
              value={vm.countyRefinement}
              onChange={(e) => vm.setCountyRefinement(e.target.value)}
              placeholder="e.g. Pulaski"
              style={fieldStyle}
            />
          </div>
        )}

        <button type="submit" disabled={vm.searching}>
          {vm.searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {vm.error ? (
        <p role="alert" style={{ marginTop: 12, color: '#b91c1c' }}>
          {vm.error}
        </p>
      ) : null}

      {lastSearch && vm.candidates.length === 0 && !vm.searching ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: 'var(--text-h)' }}>No exact match found.</p>
          <p style={{ fontSize: 15, color: 'var(--text)' }}>
            Check spelling and date of birth (must match the file exactly). You
            may be registered under a different name, in another county, or not
            yet in this file. Use your clerk or SOS path if you believe you are
            registered.
          </p>
        </div>
      ) : null}

      {vm.candidates.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 18 }}>Confirm your record</h3>
          {vm.candidates.length > 1 && !lastSearch?.county ? (
            <p style={{ fontSize: 15, color: 'var(--text)' }}>
              Multiple matches. Enter county above and search again, or if only
              one row below is yours, select it.
            </p>
          ) : null}
          {vm.candidates.map((row) => (
            <CandidateCard
              key={row.voter_id}
              row={row}
              onConfirm={() => confirmCandidate(row)}
              disabled={vm.confirming}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
