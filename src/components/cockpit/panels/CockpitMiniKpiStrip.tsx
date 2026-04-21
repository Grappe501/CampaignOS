type Kpi = { label: string; value: string | number; tone?: 'neutral' | 'good' | 'watch' | 'bad' }

type Props = {
  items: Kpi[]
}

/** Dense KPI row for tactical tiles / headers. */
export default function CockpitMiniKpiStrip({ items }: Props) {
  return (
    <ul className="cm-cockpit-kpi-strip" aria-label="Key indicators">
      {items.map((k) => (
        <li key={k.label} className="cm-cockpit-kpi-strip__item" data-tone={k.tone ?? 'neutral'}>
          <span className="cm-cockpit-kpi-strip__label">{k.label}</span>
          <span className="cm-cockpit-kpi-strip__value">{k.value}</span>
        </li>
      ))}
    </ul>
  )
}
