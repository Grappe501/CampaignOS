import { Link } from 'react-router-dom'
import { COCKPIT_MODULE_REGISTRY } from '../../lib/cockpit/cockpitModuleRegistry'
import { useCampaignManagerCockpit } from '../../context/CampaignManagerCockpitContext'
import { useEventAiOrchestration } from '../../context/EventAiOrchestrationContext'

export default function CockpitBottomCommandDeck() {
  const { setCenterModule, layout } = useCampaignManagerCockpit()
  const { effectiveOrchestration: eventAi } = useEventAiOrchestration()

  return (
    <footer className="cm-cockpit-deck" role="navigation" aria-label="Command launch rail">
      <div className="cm-cockpit-deck__health">
        <span className="cm-cockpit-deck__health-label">Layout</span>
        <span className="cm-cockpit-deck__health-value">
          Center: {layout.centerPrimary}
          {layout.centerSecondary ? ` + ${layout.centerSecondary}` : ''}
        </span>
        <span
          className="cm-cockpit-deck__health-hint"
          title={
            eventAi
              ? [eventAi.mesh_headline, eventAi.retrieval_fallback_note].filter(Boolean).join(' — ')
              : undefined
          }
        >
          {eventAi ? (
            <>
              Event AI · {eventAi.scope.replace(/_/g, ' ')} · {eventAi.completeness_pct}% mesh ·{' '}
            </>
          ) : null}
          Alt+K
        </span>
      </div>
      <div className="cm-cockpit-deck__launch">
        {COCKPIT_MODULE_REGISTRY.map((m) => (
          <button
            key={m.id}
            type="button"
            className="cm-cockpit-deck__btn"
            title={m.description}
            onClick={() => setCenterModule(m.id)}
          >
            <span className="cm-cockpit-deck__btn-icon" aria-hidden>
              {m.icon}
            </span>
            <span className="cm-cockpit-deck__btn-label">{m.shortTitle}</span>
          </button>
        ))}
      </div>
      <Link to="/events" className="cm-cockpit-deck__aux">
        Classic event desk
      </Link>
    </footer>
  )
}
