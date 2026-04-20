import Dashboard from './Dashboard'

type InternDeskProps = {
  onDevSessionClear?: () => void
}

/**
 * Intern experience: same shell as `/dashboard`; scrolls to `#intern-desk` and shows a
 * route hint inside the team desk panel. Core UI: `InternDeskContent`.
 */
export default function InternDesk({ onDevSessionClear }: InternDeskProps) {
  return <Dashboard onDevSessionClear={onDevSessionClear} />
}
