import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import {
  CALENDAR_FUNCTION_SEGMENTS,
  CALENDAR_GEO_SCOPE_SEGMENTS,
  CALENDAR_LIFECYCLE_STATUSES,
  CALENDAR_VISIBILITY_SEGMENTS,
} from '../../../lib/campaignCalendarArchitecture'
import { CAMPAIGN_EVENT_TYPE_MATRIX } from '../../../lib/campaignEventTypeMatrix'
import {
  DEFAULT_EVENT_CALENDAR_UI,
  type EventCalendarDatePreset,
  type EventCalendarUiState,
} from '../../../lib/eventCalendarPageFilters'

function formatSegmentLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

type EventCalendarFiltersProps = {
  value: EventCalendarUiState
  onChange: (next: EventCalendarUiState) => void
  sourceEvents: readonly CampaignCalendarEventRecord[]
}

function distinctCounties(events: readonly CampaignCalendarEventRecord[]): string[] {
  const s = new Set<string>()
  for (const e of events) {
    const c = (e.county_id ?? '').trim()
    if (c) s.add(c)
  }
  return [...s].sort()
}

export default function EventCalendarFilters({
  value,
  onChange,
  sourceEvents,
}: EventCalendarFiltersProps) {
  const counties = distinctCounties(sourceEvents)

  const setPreset = (datePreset: EventCalendarDatePreset) => {
    onChange({
      ...value,
      datePreset,
      ...(datePreset !== 'custom'
        ? { dateFrom: '', dateTo: '' }
        : {}),
    })
  }

  const toggleType = (key: string) => {
    const has = value.eventTypes.includes(key)
    onChange({
      ...value,
      eventTypes: has ? value.eventTypes.filter((k) => k !== key) : [...value.eventTypes, key],
    })
  }

  const toggleVis = (v: string) => {
    const has = value.visibilityScopes.includes(v)
    onChange({
      ...value,
      visibilityScopes: has
        ? value.visibilityScopes.filter((x) => x !== v)
        : [...value.visibilityScopes, v],
    })
  }

  const toggleCounty = (c: string) => {
    const has = value.countyIds.includes(c)
    onChange({
      ...value,
      countyIds: has ? value.countyIds.filter((x) => x !== c) : [...value.countyIds, c],
    })
  }

  return (
    <fieldset className="seg-cal__filters ec-cal-filters" id="event-calendar-filters">
      <legend className="seg-cal__filters-legend">Filters (shared calendar engine)</legend>

      <div className="ec-cal-filters__presets" role="group" aria-label="Date range preset">
        <span className="ec-cal-filters__presets-label">Range</span>
        {(
          [
            ['7', '7 days'],
            ['14', '14 days'],
            ['30', '30 days'],
            ['all', 'All dates'],
            ['custom', 'Custom'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              value.datePreset === id ? 'ec-cal-filters__preset is-active' : 'ec-cal-filters__preset'
            }
            onClick={() => setPreset(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {value.datePreset === 'custom' ? (
        <div className="ec-cal-filters__custom-range">
          <label className="ec-cal-filters__date">
            <span>From</span>
            <input
              type="date"
              value={value.dateFrom}
              onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            />
          </label>
          <label className="ec-cal-filters__date">
            <span>To</span>
            <input
              type="date"
              value={value.dateTo}
              onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
            />
          </label>
        </div>
      ) : null}

      <div className="seg-cal__filter-grid">
        <label className="seg-cal__filter">
          <span>Function (inferred)</span>
          <select
            value={value.functionSegment}
            onChange={(e) =>
              onChange({
                ...value,
                functionSegment: e.target.value as EventCalendarUiState['functionSegment'],
              })
            }
          >
            <option value="">All</option>
            {CALENDAR_FUNCTION_SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {formatSegmentLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="seg-cal__filter">
          <span>Geography (inferred)</span>
          <select
            value={value.geoScope}
            onChange={(e) =>
              onChange({
                ...value,
                geoScope: e.target.value as EventCalendarUiState['geoScope'],
              })
            }
          >
            <option value="">All</option>
            {CALENDAR_GEO_SCOPE_SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {formatSegmentLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="seg-cal__filter">
          <span>Lifecycle</span>
          <select
            value={value.lifecycle}
            onChange={(e) =>
              onChange({
                ...value,
                lifecycle: e.target.value as EventCalendarUiState['lifecycle'],
              })
            }
          >
            <option value="">All</option>
            {CALENDAR_LIFECYCLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatSegmentLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="seg-cal__filter seg-cal__filter--grow">
          <span>Owner (id or role contains)</span>
          <input
            type="search"
            value={value.ownerQuery}
            onChange={(e) => onChange({ ...value, ownerQuery: e.target.value })}
            placeholder="e.g. coord-alex"
            autoComplete="off"
          />
        </label>
      </div>

      <details className="ec-cal-filters__details">
        <summary>Event types ({value.eventTypes.length || 'all'})</summary>
        <div className="ec-cal-filters__chips">
          {CAMPAIGN_EVENT_TYPE_MATRIX.map((t) => (
            <label key={t.key} className="ec-cal-filters__chip">
              <input
                type="checkbox"
                checked={value.eventTypes.includes(t.key)}
                onChange={() => toggleType(t.key)}
              />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </details>

      <details className="ec-cal-filters__details">
        <summary>Visibility ({value.visibilityScopes.length || 'all'})</summary>
        <div className="ec-cal-filters__chips">
          {CALENDAR_VISIBILITY_SEGMENTS.map((v) => (
            <label key={v} className="ec-cal-filters__chip">
              <input
                type="checkbox"
                checked={value.visibilityScopes.includes(v)}
                onChange={() => toggleVis(v)}
              />
              <span>{formatSegmentLabel(v)}</span>
            </label>
          ))}
        </div>
      </details>

      {counties.length > 0 ? (
        <details className="ec-cal-filters__details">
          <summary>Counties ({value.countyIds.length || 'all'})</summary>
          <div className="ec-cal-filters__chips">
            {counties.map((c) => (
              <label key={c} className="ec-cal-filters__chip">
                <input
                  type="checkbox"
                  checked={value.countyIds.includes(c)}
                  onChange={() => toggleCounty(c)}
                />
                <span>{c.replace(/-/g, ' ')}</span>
              </label>
            ))}
          </div>
        </details>
      ) : null}

      <div className="ec-cal-filters__relevance" role="group" aria-label="Relevance">
        <label className="ec-cal-filters__toggle">
          <input
            type="checkbox"
            checked={value.candidateOnly}
            onChange={(e) => onChange({ ...value, candidateOnly: e.target.checked })}
          />
          <span>Candidate-touched only</span>
        </label>
        <label className="ec-cal-filters__toggle">
          <input
            type="checkbox"
            checked={value.fundraisingOnly}
            onChange={(e) => onChange({ ...value, fundraisingOnly: e.target.checked })}
          />
          <span>Fundraising touchpoints</span>
        </label>
        <label className="ec-cal-filters__toggle">
          <input
            type="checkbox"
            checked={value.publicOnly}
            onChange={(e) => onChange({ ...value, publicOnly: e.target.checked })}
          />
          <span>Public / field / volunteer surface</span>
        </label>
      </div>

      <button type="button" className="seg-cal__clear" onClick={() => onChange(DEFAULT_EVENT_CALENDAR_UI)}>
        Reset filters
      </button>
    </fieldset>
  )
}
