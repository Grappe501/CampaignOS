import type { NextStep } from '../../lib/dashboardState'

type DashboardAiGuideStripProps = {
  nextStep: NextStep
  onOpenAgent: () => void
}

/**
 * Deterministic “AI conductor” strip — guides next action; opens Agent for deeper help.
 * Advisory only; does not replace workflows.
 */
export default function DashboardAiGuideStrip({ nextStep, onOpenAgent }: DashboardAiGuideStripProps) {
  const busy = nextStep.kind === 'loading'
  const primary = nextStep.ctaTargetId

  const jump = () => {
    if (!primary) {
      onOpenAgent()
      return
    }
    document.getElementById(primary)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="dashboard-ai-guide" aria-labelledby="dashboard-ai-guide-title">
      <div className="dashboard-ai-guide__icon" aria-hidden>
        <span className="dashboard-ai-guide__pulse" />
      </div>
      <div className="dashboard-ai-guide__body">
        <h2 id="dashboard-ai-guide-title" className="dashboard-ai-guide__title">
          Next for you
        </h2>
        {busy ? (
          <p className="dashboard-ai-guide__desc">Loading your workspace…</p>
        ) : (
          <>
            <p className="dashboard-ai-guide__lead">{nextStep.title}</p>
            <p className="dashboard-ai-guide__desc">{nextStep.description}</p>
          </>
        )}
      </div>
      <div className="dashboard-ai-guide__actions">
        {nextStep.ctaLabel && !busy ? (
          <button type="button" className="btn-touch dashboard-ai-guide__primary" onClick={jump}>
            {nextStep.ctaLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="btn-touch btn-touch--ghost dashboard-ai-guide__secondary"
          onClick={onOpenAgent}
        >
          Ask Jones AI
        </button>
      </div>
    </section>
  )
}
