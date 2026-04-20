import { useMemo } from 'react'
import type { CampaignProfile } from '../../hooks/useProfile'
import { getOnboardingActivationCardModel } from '../../lib/onboardingEngine'
import StatusCard from './StatusCard'

export default function OnboardingActivationCard({
  profile,
}: {
  profile: CampaignProfile | null
}) {
  const model = useMemo(
    () => getOnboardingActivationCardModel(profile),
    [profile],
  )

  const openAgentJones = () => {
    window.dispatchEvent(new CustomEvent('campaignos:open-agent-jones'))
  }

  return (
    <StatusCard
      title="Get started"
      compact
      className="onboarding-activation-card"
    >
      <p
        className="subtitle"
        style={{ marginTop: 8, marginBottom: 4, fontWeight: 600 }}
      >
        {model.headline}
      </p>
      <p className="subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
        {model.body}
      </p>
      {model.detail ? (
        <p
          className="subtitle"
          style={{ marginTop: 0, marginBottom: 12, opacity: 0.92 }}
        >
          {model.detail}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-touch btn-primary"
        style={{ width: '100%' }}
        onClick={openAgentJones}
      >
        {model.ctaLabel}
      </button>
    </StatusCard>
  )
}
