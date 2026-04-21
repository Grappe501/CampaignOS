/**
 * Route hints for orchestration actions (internal navigation only).
 */

import { campaignEventRecordPath } from './campaignEventSystem'

export const AUTOMATION_ROUTES = {
  coordinator_desk: '/events',
  war_room: '/events/war-room',
  county_ops: '/events/county-ops',
  leadership_briefing: '/events/leadership-briefing',
  event_analytics: '/events/analytics',
  volunteer_command: '/volunteers/command',
} as const

export function routeForEventRecord(eventId: string): string {
  return campaignEventRecordPath(eventId)
}

export function routeForCountyFilter(countyId: string): string {
  const q = encodeURIComponent(countyId)
  return `${AUTOMATION_ROUTES.county_ops}?county=${q}`
}
