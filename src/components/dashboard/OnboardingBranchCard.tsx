import { useState } from 'react'
import {
  ONBOARDING_BRANCH_OPTIONS,
  REGISTERED_ARKANSAS_VOTER_BRANCH,
  type OnboardingBranchValue,
} from '../../lib/dashboardState'
import { useOnboardingBranch } from '../../hooks/useOnboardingBranch'

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function OnboardingBranchCard({
  profileId,
  currentBranch,
  onSaved,
}: {
  profileId: string | undefined
  currentBranch: string | null | undefined
  onSaved: () => void
}) {
  const { save, saving, error } = useOnboardingBranch(profileId, onSaved)
  const [selected, setSelected] = useState<OnboardingBranchValue | ''>(
    () => (currentBranch as OnboardingBranchValue) || '',
  )

  if (!profileId) return null

  return (
    <section
      className="card stack-section onboarding-branch-card"
      aria-labelledby="onboarding-branch-title"
    >
      <h2
        id="onboarding-branch-title"
        className="page-title"
        style={{
          fontSize: 'clamp(1.15rem, 2.8vw + 0.45rem, 1.55rem)',
          margin: 0,
        }}
      >
        Choose your volunteer path
      </h2>
      <p className="subtitle" style={{ margin: 0 }}>
        Pick one option, then save. Registered Arkansas voters go to voter lookup next;
        other paths use the roster exception block.
      </p>

      <fieldset className="branch-fieldset">
        <legend className="sr-only">Choose your branch</legend>
        <div className="branch-option-list">
          {ONBOARDING_BRANCH_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`branch-option${selected === opt.value ? ' branch-option--selected' : ''}`}
            >
              <input
                type="radio"
                name="onboarding-branch"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
                disabled={saving}
              />
              <span className="branch-option-body">
                <span className="branch-option-label">{opt.label}</span>
                <span className="branch-option-hint">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="subtitle" style={{ color: '#b91c1c', margin: 0 }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="btn-touch btn-primary"
        disabled={saving || !selected}
        onClick={() =>
          void save(selected as OnboardingBranchValue).then((ok) => {
            if (!ok || !selected) return
            if (selected === REGISTERED_ARKANSAS_VOTER_BRANCH) {
              scrollToId('voter-workspace')
            } else {
              scrollToId('exception-request')
            }
          })
        }
      >
        {saving ? 'Saving…' : 'Save and continue'}
      </button>
    </section>
  )
}
