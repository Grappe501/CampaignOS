import DevStateSwitcher from './DevStateSwitcher'
import { devMockStateDescription } from '../lib/devAuth'
import { useDevMockDashboard } from '../hooks/useDevMockDashboard'

export default function DevModeBanner() {
  const { mockState, setMockState, bypassActive } = useDevMockDashboard()
  if (!bypassActive) return null

  const label = devMockStateDescription(mockState)

  return (
    <div
      className="dev-mode-banner"
      role="status"
      aria-live="polite"
      style={{
        padding: '10px 16px 14px',
        fontSize: '0.875rem',
        fontWeight: 700,
        textAlign: 'center',
        color: '#1a1206',
        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
        borderBottom: '2px solid #b45309',
      }}
    >
      <div>
        DEV MODE — auth bypass (local only). No real Supabase session. Current:{' '}
        <strong>{label}</strong>.
      </div>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: '0.75rem',
          fontWeight: 600,
          opacity: 0.9,
        }}
      >
        Optional initial preset:{' '}
        <code style={{ fontWeight: 700 }}>VITE_DEV_MOCK_DASHBOARD_STATE</code> in{' '}
        <code>.env</code> (restart dev server). UI choice below is saved in{' '}
        <code>sessionStorage</code>.
      </p>
      <DevStateSwitcher state={mockState} onChange={setMockState} />
    </div>
  )
}
