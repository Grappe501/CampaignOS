import { useState } from 'react'
import type {
  DailyActivationInsight,
  DailyTaskRow,
  UserScoreRow,
} from '../../hooks/useDailyMission'
import type { DailyTeamTierPayload } from '../../lib/dailyMissionEngine'
import DailyTaskItem from './DailyTaskItem'

export default function DailyMissionCard({
  tasks,
  scores,
  tier,
  activationInsight,
  loading,
  error,
  onComplete,
  onSkip,
}: {
  tasks: DailyTaskRow[]
  scores: UserScoreRow | null
  tier: DailyTeamTierPayload | null
  activationInsight: DailyActivationInsight | null
  loading: boolean
  error: string | null
  onComplete: (id: string) => Promise<boolean>
  onSkip: (id: string) => Promise<boolean>
}) {
  const [busy, setBusy] = useState(false)

  const completed = tasks.filter((t) => t.status === 'completed').length
  const total = tasks.length
  const ptsToday = tasks.filter((t) => t.status === 'completed').reduce((s, t) => s + t.points, 0)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack-section daily-mission-card" aria-labelledby="daily-mission-title">
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
        Daily activation
      </p>
      <h3 id="daily-mission-title" style={{ margin: '4px 0 0', color: 'var(--text-h)' }}>
        Today’s activation
      </h3>
      <p className="subtitle" style={{ margin: '6px 0 0' }}>
        Social stays on your list daily; other tasks adapt as you go. Check off what you finish —
        skip if you need to.
      </p>
      {activationInsight ? (
        <p
          className="daily-mission-focus subtitle"
          style={{ margin: '10px 0 0', lineHeight: 1.45 }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>Recommended focus: </span>
          {activationInsight.focus_line}
          {activationInsight.improving_line ? (
            <>
              <br />
              <span className="daily-mission-improving" style={{ opacity: 0.92 }}>
                {activationInsight.improving_line}
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      {error ? (
        <p className="subtitle" role="alert" style={{ margin: '8px 0 0', color: 'var(--accent)' }}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="subtitle" style={{ margin: '10px 0 0' }}>
          Loading today’s activation…
        </p>
      ) : total === 0 ? (
        <p className="subtitle" style={{ margin: '10px 0 0' }}>
          No daily mission yet — check back after roster clearance, or refresh in a moment.
        </p>
      ) : (
        <>
          <p className="daily-mission-progress subtitle" style={{ margin: '12px 0 0', fontWeight: 700 }}>
            {completed} of {total} done today · {ptsToday} pts today
            {scores?.total_points != null ? ` · ${scores.total_points} total` : ''}
            {scores?.weekly_points != null ? ` · ${scores.weekly_points} this week` : ''}
            {scores?.activation_streak_days != null && scores.activation_streak_days > 0
              ? ` · ${scores.activation_streak_days}d streak`
              : ''}
          </p>
          {tier?.tier_label ? (
            <p
              className="daily-mission-tier"
              style={{
                margin: '8px 0 0',
                fontWeight: 800,
                fontSize: '0.95rem',
                color: 'var(--text-h)',
              }}
            >
              {tier.tier_label}
              {tier.team_size != null && tier.rank != null ? (
                <span className="subtitle" style={{ fontWeight: 600, marginLeft: 6 }}>
                  {' '}
                  (rank {tier.rank} of {tier.team_size} on your team)
                </span>
              ) : null}
            </p>
          ) : tier?.team_size != null && tier.team_size >= 3 ? (
            <p className="subtitle" style={{ margin: '6px 0 0' }}>
              Keep climbing — tiers unlock as you stay consistent with your team.
            </p>
          ) : null}
          <ul className="daily-mission-checklist">
            {tasks.map((t) => (
              <DailyTaskItem
                key={t.id}
                task={t}
                busy={busy}
                onComplete={(id) => void run(async () => void (await onComplete(id)))}
                onSkip={(id) => void run(async () => void (await onSkip(id)))}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
