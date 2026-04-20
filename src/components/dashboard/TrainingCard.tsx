import type { WorkspaceCardModel } from '../../lib/dashboardState'

function scrollToId(id: string) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function TrainingCard({
  model,
}: {
  model: WorkspaceCardModel
}) {
  const showCta = Boolean(model.primaryCta)

  return (
    <section
      className="card stack-section"
      id="training-card"
      aria-labelledby="training-card-title"
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
        Training
      </p>
      <h3
        id="training-card-title"
        style={{
          margin: 0,
          fontSize: '1.05rem',
          color: 'var(--text-h)',
        }}
      >
        {model.title}
      </h3>
      {model.metaLine ? (
        <p className="subtitle" style={{ margin: '6px 0 0', fontWeight: 600 }}>
          {model.metaLine}
        </p>
      ) : null}
      <p className="subtitle" style={{ margin: 0 }}>
        {model.explanation}
      </p>
      {showCta ? (
        <button
          type="button"
          className="btn-touch btn-primary"
          onClick={() => scrollToId(model.primaryCta!.targetId)}
        >
          {model.primaryCta!.label}
        </button>
      ) : (
        <p
          className="subtitle"
          style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}
        >
          {model.statusLabel}
        </p>
      )}
    </section>
  )
}
