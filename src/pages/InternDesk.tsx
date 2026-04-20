import InternDashboard from '../components/intern/InternDashboard'

type InternDeskProps = {
  onDevSessionClear?: () => void
}

export default function InternDesk({ onDevSessionClear }: InternDeskProps) {
  return <InternDashboard onDevSessionClear={onDevSessionClear} />
}
