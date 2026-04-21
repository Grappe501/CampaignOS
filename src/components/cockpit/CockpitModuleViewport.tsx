import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CockpitModuleId } from '../../lib/cockpit/cockpitWorkspaceSchemas'
import { getCockpitModuleMeta } from '../../lib/cockpit/cockpitModuleRegistry'
import type { CampaignProfile } from '../../hooks/useProfile'
import { mapProfileRoleToCalendarWidgetPersona } from '../../lib/eventSummaryEngine'
import MultiEventWarRoomContent from '../events/war-room/MultiEventWarRoomContent'
import EventCalendarPage from '../events/calendar/EventCalendarPage'
import LeadershipBriefingContent from '../events/leadership/LeadershipBriefingContent'

function PlaceholderModule({
  title,
  body,
  href,
}: {
  title: string
  body: ReactNode
  href: string
}) {
  return (
    <div className="cm-cockpit-placeholder">
      <h3 className="cm-cockpit-placeholder__title">{title}</h3>
      <p className="cm-cockpit-placeholder__body">{body}</p>
      <Link to={href} className="cm-cockpit-placeholder__link">
        Open full workspace →
      </Link>
    </div>
  )
}

type Props = {
  moduleId: CockpitModuleId
  profile: CampaignProfile | null
}

export default function CockpitModuleViewport({ moduleId, profile }: Props) {
  const meta = getCockpitModuleMeta(moduleId)
  const persona = mapProfileRoleToCalendarWidgetPersona(profile?.primary_role)

  switch (moduleId) {
    case 'war_room':
      return <MultiEventWarRoomContent profile={profile} />
    case 'calendar':
      return <EventCalendarPage persona={persona} />
    case 'leadership_briefing':
      return <LeadershipBriefingContent profile={profile} />
    case 'event_operations':
      return (
        <PlaceholderModule
          title="Event operations"
          body="Coordinator program list, scheduling, and intake. Use the full desk for edits."
          href="/events"
        />
      )
    case 'volunteer_command':
      return (
        <PlaceholderModule
          title="Volunteer command"
          body="Roster, marketplace, and recommendations run on the dedicated volunteer command surface."
          href="/volunteers/command"
        />
      )
    case 'field_operations':
      return (
        <PlaceholderModule
          title="Field operations"
          body="County operations and neighborhood hub — open the dedicated field workspace."
          href="/events/county-ops"
        />
      )
    case 'communications_press':
      return (
        <PlaceholderModule
          title="Communications / press"
          body="Promotion sequencing and media pipeline."
          href="/events/promotion"
        />
      )
    case 'finance_fundraising':
      return (
        <PlaceholderModule
          title="Finance / fundraising"
          body="Financial cockpit module is routed to dashboard KPIs until a dedicated finance board lands."
          href="/dashboard"
        />
      )
    case 'candidate_schedule':
      return (
        <PlaceholderModule
          title="Candidate & schedule"
          body="Candidate desk — schedule focus and surrogate coordination."
          href="/candidate"
        />
      )
    case 'approvals_leadership':
      return (
        <PlaceholderModule
          title="Approvals & leadership"
          body="Governance queue and sign-offs."
          href="/events/review-requests"
        />
      )
    case 'event_coordinator_desk':
      return (
        <PlaceholderModule
          title="Coordinator desk"
          body="Full coordinator workspace — embedded link to preserve performance."
          href="/events"
        />
      )
    case 'analytics':
      return (
        <PlaceholderModule
          title="Analytics"
          body="Event analytics and pressure signals."
          href="/events/analytics"
        />
      )
    default:
      return (
        <PlaceholderModule
          title={meta?.title ?? 'Module'}
          body="This module has no cockpit embed yet."
          href={meta?.fullPageHref ?? '/dashboard'}
        />
      )
  }
}
