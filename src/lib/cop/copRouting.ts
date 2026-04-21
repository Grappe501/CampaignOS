import type { CopRouteTarget } from './copTypes'

export const COP_ROUTES = {
  warRoom: (): CopRouteTarget => ({
    href: '/events/war-room',
    label: 'War room',
    fallbackHref: '/events',
  }),
  approvals: (): CopRouteTarget => ({
    href: '/events/review-requests',
    label: 'Approvals',
    fallbackHref: '/events',
  }),
  calendar: (): CopRouteTarget => ({
    href: '/events/calendar',
    label: 'Calendar',
    fallbackHref: '/events',
  }),
  volunteerCommand: (): CopRouteTarget => ({
    href: '/volunteers/command',
    label: 'Volunteer command',
    fallbackHref: '/dashboard',
  }),
  eventsDesk: (): CopRouteTarget => ({
    href: '/events',
    label: 'Event coordinator desk',
    fallbackHref: '/events',
  }),
  leadership: (): CopRouteTarget => ({
    href: '/events/leadership',
    label: 'Leadership briefing',
    fallbackHref: '/dashboard',
  }),
  dashboard: (): CopRouteTarget => ({
    href: '/dashboard',
    label: 'Dashboard',
    fallbackHref: '/dashboard',
  }),
  cockpit: (): CopRouteTarget => ({
    href: '/cockpit/campaign-manager',
    label: 'Campaign Manager cockpit',
    fallbackHref: '/events/war-room',
  }),
  eventRecord: (eventId: string): CopRouteTarget => ({
    href: `/events/${encodeURIComponent(eventId)}`,
    label: 'Event command',
    entityId: eventId,
    fallbackHref: '/events/war-room',
  }),
} as const
