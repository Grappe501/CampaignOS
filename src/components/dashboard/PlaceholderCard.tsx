import type { ReactNode } from 'react'

export default function PlaceholderCard({
  title,
  description,
  footer,
}: {
  title: string
  description: string
  footer?: ReactNode
}) {
  return (
    <section
      className="card stack-section"
      style={{ opacity: 0.95 }}
      aria-label={title}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '1.05rem',
          color: 'var(--text-h)',
        }}
      >
        {title}
      </h3>
      <p className="subtitle" style={{ margin: 0 }}>
        {description}
      </p>
      {footer ?? (
        <p
          className="subtitle"
          style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem' }}
        >
          Coming soon
        </p>
      )}
    </section>
  )
}
