import type { CSSProperties } from 'react'
import type { MatchedVoterDisplayRow } from '../lib/voterMatch'

const cardStyle: CSSProperties = {
  marginTop: 16,
  padding: 16,
  border: '1px solid var(--border)',
  borderRadius: 8,
  textAlign: 'left',
  background: 'var(--social-bg)',
}

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '6px 16px',
  margin: 0,
  fontSize: 15,
}

export default function VoterWidget({
  voter,
}: {
  voter: MatchedVoterDisplayRow | null
}) {
  if (!voter) return null

  return (
    <section style={cardStyle} aria-label="Matched voter registration">
      <h2 style={{ marginTop: 0 }}>Your voter record</h2>
      <dl style={dlStyle}>
        <dt style={{ color: 'var(--text)' }}>Name</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>
          {voter.name_first} {voter.name_last}
        </dd>
        <dt style={{ color: 'var(--text)' }}>County</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>{voter.county ?? '—'}</dd>
        <dt style={{ color: 'var(--text)' }}>City</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>{voter.res_city ?? '—'}</dd>
        <dt style={{ color: 'var(--text)' }}>State / ZIP</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>
          {[voter.res_state, voter.res_zip5].filter(Boolean).join(' ') || '—'}
        </dd>
        <dt style={{ color: 'var(--text)' }}>Precinct</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>
          {voter.precinct_name ?? '—'}
        </dd>
        <dt style={{ color: 'var(--text)' }}>Status</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>
          {voter.registrant_status ?? '—'}
        </dd>
        <dt style={{ color: 'var(--text)' }}>Congressional</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>
          {voter.congressional_district ?? '—'}
        </dd>
        <dt style={{ color: 'var(--text)' }}>State Senate</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>
          {voter.state_senate_district ?? '—'}
        </dd>
        <dt style={{ color: 'var(--text)' }}>State House</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>
          {voter.state_representative_district ?? '—'}
        </dd>
        <dt style={{ color: 'var(--text)' }}>Match</dt>
        <dd style={{ margin: 0, color: 'var(--text-h)' }}>{voter.match_status}</dd>
      </dl>
    </section>
  )
}
