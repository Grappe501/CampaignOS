import type { StaffingCoverageFiltersState, StaffingCoverageWindowId } from '../../../lib/staffingCoverageModels'
import { CAMPAIGN_EVENT_TYPE_MATRIX } from '../../../lib/campaignEventTypeMatrix'

type Props = {
  value: StaffingCoverageFiltersState
  onChange: (next: StaffingCoverageFiltersState) => void
  countyOptions?: { id: string; label: string }[]
}

const WINDOWS: { id: StaffingCoverageWindowId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'next_72h', label: 'Next 72h' },
  { id: 'next_7d', label: 'Next 7d' },
  { id: 'next_14d', label: 'Next 14d' },
]

export default function StaffingCoverageFilters({ value, onChange, countyOptions }: Props) {
  return (
    <fieldset className="seg-cal__filters" style={{ marginTop: 8 }}>
      <legend className="subtitle">Coverage filters</legend>
      <div className="seg-cal__filter-grid">
        <label className="seg-cal__filter">
          <span>Window</span>
          <select
            value={value.window}
            onChange={(e) =>
              onChange({ ...value, window: e.target.value as StaffingCoverageWindowId })
            }
          >
            {WINDOWS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className="seg-cal__filter">
          <span>Event type</span>
          <select
            value={value.eventType}
            onChange={(e) => onChange({ ...value, eventType: e.target.value })}
          >
            <option value="">All</option>
            {CAMPAIGN_EVENT_TYPE_MATRIX.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="seg-cal__filter">
          <span>County id</span>
          <select
            value={value.countyId}
            onChange={(e) => onChange({ ...value, countyId: e.target.value })}
          >
            <option value="">All</option>
            {(countyOptions ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="seg-cal__filter seg-cal__filter--grow">
          <span>Owner / id contains</span>
          <input
            type="search"
            value={value.organizerQuery}
            onChange={(e) => onChange({ ...value, organizerQuery: e.target.value })}
            placeholder="profile id substring"
          />
        </label>
        <label className="subtitle" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={value.criticalOnly}
            onChange={(e) => onChange({ ...value, criticalOnly: e.target.checked })}
          />
          Critical roles only
        </label>
      </div>
    </fieldset>
  )
}
