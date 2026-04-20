import { useProfile } from '../hooks/useProfile'
import { useVoterMatch } from '../hooks/useVoterMatch'
import AgentJones from '../components/AgentJones'
import VoterMatchForm from '../components/VoterMatchForm'
import VoterWidget from '../components/VoterWidget'

export default function Dashboard() {
  const { profile, loading } = useProfile()
  const profileId =
    profile?.id != null && profile.id !== '' ? String(profile.id) : undefined
  const voterMatch = useVoterMatch(profileId)

  if (loading) return <div>Loading...</div>

  return (
    <div style={{ padding: 20, textAlign: 'left' }}>
      <h1>Campaign Dashboard</h1>

      <div>
        <strong>Role:</strong> {profile?.primary_role ?? 'Volunteer'}
      </div>

      <div>
        <strong>Team:</strong> {profile?.primary_team ?? 'Unassigned'}
      </div>

      <div>
        <strong>Voter Status:</strong>{' '}
        {profile?.voter_status != null && profile.voter_status !== ''
          ? String(profile.voter_status)
          : '—'}
      </div>

      <hr />

      {voterMatch.matchedLoading ? (
        <p>Loading voter match…</p>
      ) : voterMatch.matched ? (
        <VoterWidget voter={voterMatch.matched} />
      ) : (
        <VoterMatchForm vm={voterMatch} campaignProfileId={profileId} />
      )}

      <hr />

      <AgentJones />
    </div>
  )
}
