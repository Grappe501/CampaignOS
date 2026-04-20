import type { ReactNode } from 'react'

export default function StatusCard({
  title,
  id,
  children,
  compact,
  className,
}: {
  title: string
  id?: string
  children: ReactNode
  /** Tighter padding and heading — for dense dashboard tiles. */
  compact?: boolean
  className?: string
}) {
  const baseId = id ?? `status-${title.replace(/\W+/g, '-').toLowerCase()}`
  const cls = ['card', 'stack-section', compact ? 'card--compact' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <section className={cls} id={id}
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
