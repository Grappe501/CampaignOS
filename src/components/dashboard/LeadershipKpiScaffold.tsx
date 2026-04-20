import { useMemo, useState } from 'react'
import {
  leadershipSetKpiTarget,
  type CampaignKpiRow,
  type CampaignMissionRow,
} from '../../lib/kpiEngine'

export default function LeadershipKpiScaffold({
  kpis,
  missions,
  onUpdated,
}: {
  kpis: CampaignKpiRow[]
  missions: CampaignMissionRow[]
  onUpdated: () => void | Promise<void>
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(kpis.map((k) => [k.id, String(k.target_value)])),
  )

  const missionsByKpi = useMemo(() => {
    const m = new Map<string, CampaignMissionRow[]>()
    for (const row of missions) {
      const list = m.get(row.kpi_id) ?? []
      list.push(row)
      m.set(row.kpi_id, list)
    }
    return m
  }, [missions])

  const saveTarget = async (kpi: CampaignKpiRow) => {
    const raw = drafts[kpi.id] ?? String(kpi.target_value)
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return
    setBusyId(kpi.id)
    try {
      const ok = await leadershipSetKpiTarget(kpi.id, n)
      if (ok) await onUpdated()
    } finally {
      setBusyId(null)
    }
  }

  if (kpis.length === 0) return null

  return (
    <section
      className="card stack-section leadership-kpi-scaffold"
      aria-labelledby="leadership-kpi-title"
    >
      <h2 id="leadership-kpi-title" className="page-title">
        Leadership: KPIs & missions
      </h2>
      <p className="subtitle">
        Adjust campaign targets; global missions mirror KPI targets when you save.
      </p>
      <ul className="leadership-kpi-list">
        {kpis.map((k) => {
          const subs = missionsByKpi.get(k.id) ?? []
          return (
            <li key={k.id} className="leadership-kpi-list__item">
              <div>
                <strong>{k.name}</strong>
                <span className="subtitle" style={{ display: 'block' }}>
                  {k.slug} · current {k.current_value} / target {k.target_value} ({k.unit})
                </span>
                {subs.length > 0 ? (
                  <ul className="subtitle" style={{ margin: '8px 0 0', paddingLeft: '1.1rem' }}>
                    {subs.map((m) => (
                      <li key={m.id}>
                        {m.name} — {m.current_value} / {m.target_value} ({m.assigned_scope})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="subtitle" style={{ margin: '6px 0 0' }}>
                    No mission rows linked.
                  </p>
                )}
              </div>
              <div className="leadership-kpi-adjust">
                <label className="subtitle" style={{ display: 'block' }}>
                  New target
                  <input
                    type="number"
                    min={0}
                    className="input-like"
                    style={{ width: '100%', marginTop: 4 }}
                    value={drafts[k.id] ?? ''}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [k.id]: e.target.value }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn-touch btn-primary"
                  style={{ marginTop: 8 }}
                  disabled={busyId === k.id}
                  onClick={() => void saveTarget(k)}
                >
                  {busyId === k.id ? 'Saving…' : 'Save target'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
