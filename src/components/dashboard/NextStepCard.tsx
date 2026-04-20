import type { NextStep } from '../../lib/dashboardState'

function scrollToId(id: string) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function NextStepCard({
  step,
}: {
  step: NextStep
}) {
  const showCta =
    step.ctaLabel &&
    step.ctaTargetId &&
    step.kind !== 'loading'

  return (
    <section
      className="card stack-section next-step-card"
      aria-labelledby="next-step-title"
    >
      <p
        className="subtitle"
        style={{
          margin: 0,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          color: 'var(--accent)',
        }}
      >
        Next step
      </p>
      <h2
        id="next-step-title"
        className="page-title"
        style={{
          fontSize: 'clamp(1.35rem, 3.2vw + 0.5rem, 1.85rem)',
          margin: '4px 0 0',
        }}
      >
        {step.title}
      </h2>
      <p className="subtitle" style={{ margin: 0 }}>
        {step.description}
      </p>
      {showCta ? (
        <button
          type="button"
          className="btn-touch btn-primary"
          onClick={() => scrollToId(step.ctaTargetId!)}
        >
          {step.ctaLabel}
        </button>
      ) : null}
    </section>
  )
}
