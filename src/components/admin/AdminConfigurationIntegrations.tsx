import { getNetlifyFunctionsOrigin } from '../../lib/api/agentJones'

export default function AdminConfigurationIntegrations() {
  const fnOrigin = getNetlifyFunctionsOrigin()
  const fnLabel = fnOrigin ? fnOrigin : 'Same origin (production default)'

  return (
    <div className="admin-governance-grid">
      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Edge functions &amp; API origin</h3>
        <p className="subtitle" style={{ marginTop: 0 }}>
          Agent Jones and related Netlify functions resolve from the configured origin (read-only
          display).
        </p>
        <dl className="admin-governance-dl">
          <dt>Netlify functions origin</dt>
          <dd>
            <code className="admin-governance-mono">{fnLabel}</code>
          </dd>
        </dl>
        <p className="admin-desk-empty-hint">
          Changing origins or rotating keys is environment / deployment work — not toggled from
          this UI.
        </p>
      </div>

      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Calendar &amp; messaging</h3>
        <p className="subtitle" style={{ marginTop: 0 }}>
          Google Calendar, SMS/email providers, and third-party messaging integrations are not
          connected in this client. Universal calendar architecture is documented; admin will
          govern those connections here once OAuth and webhooks are implemented server-side.
        </p>
        <ul className="admin-desk-list">
          <li>
            <strong>Google Calendar sync:</strong> Not connected — no OAuth state in CampaignOS UI.
          </li>
          <li>
            <strong>Campaign messaging rails:</strong> Not configured — no send keys or templates
            exposed here.
          </li>
        </ul>
      </div>

      <div className="admin-desk-panel admin-desk-nested admin-governance-roadmap">
        <h3 className="admin-desk-panel-title">Feature flags &amp; desk rollout</h3>
        <p className="subtitle" style={{ marginTop: 0 }}>
          Desk visibility and experimental widgets should eventually be driven by service-held flags.
          Today, routing and nav rely on <code>primary_role</code> and client gates only.
        </p>
        <p className="admin-desk-empty-hint">
          A future pass can add read-only flag status from a <code>system_config</code> or edge
          config endpoint — still no blind client-side toggles for production safety.
        </p>
      </div>
    </div>
  )
}
