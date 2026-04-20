import type { VolunteerPathCard } from '../../lib/volunteerDashboardCards'

export default function VolunteerPathCardGrid({
  headingId,
  heading,
  intro,
  cards,
}: {
  headingId: string
  heading: string
  intro?: string
  cards: readonly VolunteerPathCard[]
}) {
  if (cards.length === 0) return null

  return (
    <section className="stack-section" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="page-title"
        style={{
          fontSize: 'clamp(1.15rem, 2.5vw + 0.45rem, 1.45rem)',
          margin: 0,
          marginBottom: intro ? 8 : 14,
        }}
      >
        {heading}
      </h2>
      {intro ? (
        <p className="subtitle" style={{ margin: '0 0 16px' }}>
          {intro}
        </p>
      ) : null}
      <div className="dash-placeholder-grid">
        {cards.map((c) => (
          <section
            key={c.id}
            className="card stack-section volunteer-path-card"
            style={{ opacity: 0.95 }}
            aria-label={c.title}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1.05rem',
                color: 'var(--text-h)',
              }}
            >
              {c.title}
            </h3>
            <p className="subtitle" style={{ margin: 0 }}>
              {c.description}
            </p>
            {c.detail ? (
              <p
                className="subtitle"
                style={{ margin: '10px 0 0', fontWeight: 600 }}
              >
                {c.detail}
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </section>
  )
}
