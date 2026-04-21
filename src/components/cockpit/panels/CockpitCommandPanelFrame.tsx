import type { ReactNode } from 'react'

type Props = {
  title: string
  urgency?: 'ok' | 'info' | 'warn' | 'urgent'
  actions?: ReactNode
  children: ReactNode
}

/** Reusable command chrome for center/full embeds (Phase 3 panel library). */
export default function CockpitCommandPanelFrame({ title, urgency = 'ok', actions, children }: Props) {
  return (
    <section className="cm-cockpit-frame" data-urgency={urgency}>
      <header className="cm-cockpit-frame__head">
        <h2 className="cm-cockpit-frame__title">{title}</h2>
        {actions ? <div className="cm-cockpit-frame__actions">{actions}</div> : null}
      </header>
      <div className="cm-cockpit-frame__body">{children}</div>
    </section>
  )
}
