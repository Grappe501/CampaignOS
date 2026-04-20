import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { VoterCandidateRow } from '../lib/voterMatch'
import type { UseVoterMatchResult } from '../hooks/useVoterMatch'

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
    <div className="card stack-section">
      <div style={{ color: 'var(--text-h)', fontWeight: 600 }}>
        {row.name_first} {row.name_last}
      </div>
      <div className="subtitle">
        <strong>County:</strong> {row.county ?? '—'}
      </div>
      <div className="subtitle">
        <strong>City:</strong> {row.res_city ?? '—'}
      </div>
      <div className="subtitle">
        <strong>Precinct:</strong> {row.precinct_name ?? '—'}
      </div>
      <div className="subtitle">
        <strong>Registration status:</strong> {row.registrant_status ?? '—'}
      </div>
      <button
        type="button"
        className="btn-touch btn-primary"
        onClick={onConfirm}
        disabled={disabled}
      >
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
      <p className="subtitle" role="alert">
        Campaign profile is not loaded; voter match is unavailable.
      </p>
    )
  }

  return (
    <section className="stack-section voter-lookup-form-section" aria-label="Voter look up">
      <h2 className="page-title" style={{ fontSize: 'clamp(1.2rem, 2.5vw + 0.5rem, 1.5rem)', marginBottom: 6 }}>
        Voter look up
      </h2>
      <p className="subtitle" style={{ marginBottom: 10 }}>
        Verify your registration (same lookup we use for filed canvassers). Enter
        your legal name and date of birth as on Arkansas voter records. Add
        county if several people match.
      </p>

      <form className="card stack-section voter-lookup-form" onSubmit={onSubmit}>
        <div className="field-block">
          <label htmlFor="vm-last">Last name</label>
          <input
            id="vm-last"
            value={nameLast}
            onChange={(e) => setNameLast(e.target.value)}
            autoComplete="family-name"
            className="input-stretch"
            required
          />
        </div>
        <div className="field-block">
          <label htmlFor="vm-first">First name</label>
          <input
            id="vm-first"
            value={nameFirst}
            onChange={(e) => setNameFirst(e.target.value)}
            autoComplete="given-name"
            className="input-stretch"
            required
          />
        </div>
        <div className="field-block">
          <label htmlFor="vm-dob">Date of birth</label>
          <input
            id="vm-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="input-stretch"
            required
          />
        </div>

        {(needsCounty || vm.candidates.length > 1) && (
          <div className="field-block">
            <label htmlFor="vm-county">County (to narrow multiple matches)</label>
            <input
              id="vm-county"
              value={vm.countyRefinement}
              onChange={(e) => vm.setCountyRefinement(e.target.value)}
              placeholder="e.g. Pulaski"
              className="input-stretch"
            />
          </div>
        )}

        <button
          type="submit"
          className="btn-touch btn-primary"
          disabled={vm.searching}
        >
          {vm.searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {vm.error ? (
        <p role="alert" className="subtitle" style={{ color: '#b91c1c', fontWeight: 500 }}>
          {vm.error}
        </p>
      ) : null}

      {lastSearch && vm.candidates.length === 0 && !vm.searching ? (
        <div className="card stack-section">
          <p style={{ color: 'var(--text-h)', fontWeight: 600 }}>No exact match found.</p>
          <p className="subtitle">
            Check spelling and date of birth (must match the file exactly). You
            may be registered under a different name, in another county, or not
            yet in this file. Use your clerk or SOS path if you believe you are
            registered.
          </p>
        </div>
      ) : null}

      {vm.candidates.length > 0 ? (
        <div className="stack-section" id="voter-confirm-record">
          <h3 style={{ fontSize: 'clamp(1.1rem, 2vw + 0.5rem, 1.35rem)', margin: 0 }}>
            Confirm your record
          </h3>
          {vm.candidates.length > 1 && !lastSearch?.county ? (
            <p className="subtitle">
              Multiple matches. Enter county above and search again, or if only
              one row below is yours, select it.
            </p>
          ) : null}
          <div className="candidate-grid">
            {vm.candidates.map((row) => (
              <CandidateCard
                key={row.voter_id}
                row={row}
                onConfirm={() => confirmCandidate(row)}
                disabled={vm.confirming}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
