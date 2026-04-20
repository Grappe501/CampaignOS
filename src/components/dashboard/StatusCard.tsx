import type { ReactNode } from 'react'

export default function StatusCard({
  title,
  id,
  children,
}: {
  title: string
  id?: string
  children: ReactNode
}) {
  const baseId = id ?? `status-${title.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <section
      className="card stack-section"
      id={id}
      aria-labelledby={`${baseId}-h`}
    >
      <h2
        id={`${baseId}-h`}
        style={{
          margin: 0,
          fontSize: 'clamp(1.05rem, 2vw + 0.5rem, 1.25rem)',
          color: 'var(--text-h)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
