import type { ReactNode } from 'react'

export default function StatusCard({
  title,
  id,
  children,
  compact,
}: {
  title: string
  id?: string
  children: ReactNode
  /** Tighter padding and heading — for dense dashboard tiles. */
  compact?: boolean
}) {
  const baseId = id ?? `status-${title.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <section
      className={`card stack-section${compact ? ' card--compact' : ''}`}
      id={id}
      aria-labelledby={`${baseId}-h`}
    >
      <h2
        id={`${baseId}-h`}
        className={compact ? 'status-card-title--compact' : undefined}
        style={
          compact
            ? { margin: 0, color: 'var(--text-h)' }
            : {
                margin: 0,
                fontSize: 'clamp(1.05rem, 2vw + 0.5rem, 1.25rem)',
                color: 'var(--text-h)',
              }
        }
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
