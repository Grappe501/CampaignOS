import type { CampaignOperatingScope, CampaignOperatingScopeKind } from './copTypes'

const LABELS: Record<CampaignOperatingScopeKind, string> = {
  campaign_global: 'Campaign (global)',
  district: 'District',
  county: 'County',
  city: 'City',
  turf: 'Turf',
  event: 'Event',
  role_desk: 'Desk',
  volunteer_operations: 'Volunteer operations',
  leadership: 'Leadership',
  war_room: 'War room',
}

export function globalScope(): CampaignOperatingScope {
  return { kind: 'campaign_global', label: LABELS.campaign_global }
}

export function leadershipScope(): CampaignOperatingScope {
  return { kind: 'leadership', label: LABELS.leadership }
}

export function warRoomScope(): CampaignOperatingScope {
  return { kind: 'war_room', label: LABELS.war_room }
}

export function deskScope(roleKey: string): CampaignOperatingScope {
  return { kind: 'role_desk', label: `Desk: ${roleKey}`, entityId: roleKey }
}

export function scopeLabel(k: CampaignOperatingScopeKind): string {
  return LABELS[k] ?? k
}
