import type { ReactNode } from 'react'

function PlaceholderPanel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="admin-desk-panel admin-desk-nested admin-desk-governance-panel">
      <h3 className="admin-desk-panel-title">{title}</h3>
      {children}
    </div>
  )
}

export default function AdminEventGovernance({
  electionMilestoneLabel,
}: {
  electionMilestoneLabel: string
}) {
  return (
    <div className="admin-desk-command-grid">
      <PlaceholderPanel title="Approval queue">
        <p className="subtitle">
          Event submissions and publish requests will appear here when the campaign events engine and
          RLS policies are wired. No synthetic backlog is shown.
        </p>
        <p className="admin-desk-empty-hint">
          Reference: <code>docs/campaign-universal-tasks-and-calendar-architecture.md</code>
        </p>
      </PlaceholderPanel>
      <PlaceholderPanel title="Upcoming campaign pressure">
        <p className="subtitle">
          Next hard milestone from the election clock (shared with all desks):
        </p>
        <p className="admin-desk-countdown admin-desk-countdown--inline">{electionMilestoneLabel}</p>
        <p className="admin-desk-panel-note">
          Fine-grained internal/external calendars and staffing risk rails ship with the universal
          calendar workstream — not yet populated from live event rows.
        </p>
      </PlaceholderPanel>
      <PlaceholderPanel title="Visibility &amp; publication">
        <p className="subtitle">
          Draft vs published state, audience flags, and surrogate visibility will be governed from
          here. Requires event records and admin-grade reads.
        </p>
        <p className="admin-desk-panel-note">
          <a href="#admin-calendar">Jump to calendar rail</a> (same page)
        </p>
      </PlaceholderPanel>
    </div>
  )
}
