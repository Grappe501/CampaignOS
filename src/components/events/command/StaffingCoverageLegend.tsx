import type { StaffingCoverageBucket } from '../../../lib/staffingCoverageModels'

const META: Record<StaffingCoverageBucket, { label: string; color: string }> = {
  fully_covered: { label: 'Fully covered', color: '#3dcb8c' },
  partial: { label: 'Partial / optional gaps', color: '#e6c54f' },
  critical_gap: { label: 'Critical gap', color: '#ff6b6b' },
  overstaffed: { label: 'Over minimum', color: '#8acbff' },
  not_applicable: { label: 'N/A', color: '#888' },
  blocked_pending_approval: { label: 'Pending approval (not live)', color: '#a78bfa' },
  stale_uncertain: { label: 'Stale / uncertain', color: '#c4c4c4' },
}

export default function StaffingCoverageLegend() {
  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: '0.25rem 0 0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.65rem',
        fontSize: '0.82rem',
      }}
    >
      {(
        ['fully_covered', 'partial', 'critical_gap', 'overstaffed', 'blocked_pending_approval'] as const
      ).map((k) => (
        <li key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: META[k].color,
              display: 'inline-block',
            }}
          />
          {META[k].label}
        </li>
      ))}
    </ul>
  )
}
