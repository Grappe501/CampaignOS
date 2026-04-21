import { useMemo, useState } from 'react'
import type { CampaignNarrativeFramework } from '../../lib/messageFramework'
import { fillScriptPlaceholders } from '../../lib/messageAssist'
import {
  selectScriptsForContext,
  type MessageTargetContext,
} from '../../lib/messageTargeting'

export default function ScriptPanel({
  framework,
  context,
}: {
  framework: CampaignNarrativeFramework
  context: MessageTargetContext
}) {
  const scripts = useMemo(() => selectScriptsForContext(framework, context), [framework, context])
  const [voterName, setVoterName] = useState('')
  const [volName, setVolName] = useState('')

  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Field scripts</h3>
      <p className="subtitle">
        Deterministic templates — replace placeholders before you use them live.
      </p>
      <div className="power5-field-row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <label className="power5-field">
          <span className="power5-field-label">Voter first name</span>
          <input
            className="power5-input"
            value={voterName}
            onChange={(e) => setVoterName(e.target.value)}
            placeholder="Neighbor"
            maxLength={80}
          />
        </label>
        <label className="power5-field">
          <span className="power5-field-label">Your first name</span>
          <input
            className="power5-input"
            value={volName}
            onChange={(e) => setVolName(e.target.value)}
            placeholder="Volunteer"
            maxLength={80}
          />
        </label>
      </div>
      {scripts.map((sc) => (
        <div key={sc.id} style={{ marginTop: '1rem' }}>
          <p className="subtitle" style={{ margin: '0 0 0.35rem' }}>
            <strong>{sc.label}</strong>{' '}
            <span style={{ opacity: 0.75 }}>({sc.channel})</span>
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {fillScriptPlaceholders(sc.lines, { name: voterName, volunteer: volName }).map(
              (line, i) => (
                <li key={i} className="subtitle">
                  {line}
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  )
}
