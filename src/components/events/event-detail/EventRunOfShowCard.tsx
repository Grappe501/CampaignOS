import { useState } from 'react'

const DEFAULT_BLOCKS = [
  { key: 'arrival', label: 'Arrival / greeter window', value: 'T-30 — doors' },
  { key: 'setup', label: 'Setup', value: 'Signage, table, literature' },
  { key: 'welcome', label: 'Welcome', value: 'Host welcome + ground rules' },
  { key: 'remarks', label: 'Candidate / host remarks', value: '5–7 minutes' },
  { key: 'volunteer', label: 'Volunteer ask', value: 'Shifts + next training' },
  { key: 'voter', label: 'Voter ask', value: 'Check registration + plan to vote' },
  { key: 'fundraising', label: 'Fundraising ask (if applicable)', value: '—' },
  { key: 'close', label: 'Close + next step', value: 'Thank you + follow-up owner' },
]

export default function EventRunOfShowCard() {
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS)

  return (
    <section className="event-panel" id="event-run-of-show" aria-labelledby="ros-heading">
      <h2 id="ros-heading" className="event-panel__title">
        Run of show
      </h2>
      <p className="event-panel__placeholder">
        Editable blocks for field use. Persist to Supabase when event program JSON lands.
      </p>
      <ul className="event-ros-list">
        {blocks.map((b, i) => (
          <li key={b.key} className="event-ros-row">
            <label className="event-ros-label">{b.label}</label>
            <textarea
              className="event-ros-input"
              value={b.value}
              onChange={(e) => {
                const v = e.target.value
                setBlocks((prev) => prev.map((x, j) => (j === i ? { ...x, value: v } : x)))
              }}
              rows={2}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
