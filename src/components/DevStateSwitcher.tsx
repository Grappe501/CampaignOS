import type { DevMockDashboardState } from '../lib/devAuth'
import { devMockStateDescription } from '../lib/devAuth'

const OPTIONS: { value: DevMockDashboardState; hint: string }[] = [
  { value: 'unmatched', hint: 'Next step: verify voter' },
  { value: 'matched_no_branch', hint: 'Next step: select branch' },
  { value: 'exception_pending', hint: 'Next step: exception review' },
  { value: 'matched_ready', hint: 'Next step: ready' },
]

type DevStateSwitcherProps = {
  state: DevMockDashboardState
  onChange: (s: DevMockDashboardState) => void
}

export default function DevStateSwitcher({
  state,
  onChange,
}: DevStateSwitcherProps) {
  return (
    <fieldset
      className="dev-state-switcher"
      style={{
        margin: 0,
        marginTop: 8,
        padding: '10px 12px',
        border: '1px solid #b45309',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.55)',
      }}
    >
      <legend
        style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '0 6px',
          color: '#1a1206',
        }}
      >
        Mock progression
      </legend>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 14px',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {OPTIONS.map(({ value, hint }) => (
          <label
            key={value}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              gap: 2,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#1a1206',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input
                type="radio"
                name="dev-mock-dashboard-state"
                value={value}
                checked={state === value}
                onChange={() => onChange(value)}
              />
              {devMockStateDescription(value)}
            </span>
            <span style={{ fontWeight: 500, opacity: 0.85, paddingLeft: 22 }}>
              {hint}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
