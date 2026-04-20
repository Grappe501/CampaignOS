import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'

export type TimelinePhaseId =
  | 'created'
  | 'planning'
  | 'staffing'
  | 'communications'
  | 'final_prep'
  | 'day_of'
  | 'follow_up'

function hoursUntil(iso: string, nowMs: number): number {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 9999
  return (t - nowMs) / 3600000
}

function mobilizeReady(m: string | null | undefined): boolean {
  const x = String(m ?? '').toLowerCase()
  return x === 'published' || x === 'not_applicable'
}

export function computeTimelineState(record: CampaignCalendarEventRecord, nowMs = Date.now()) {
  const stage = String(record.stage_status ?? 'draft').toLowerCase()
  const staff = String(record.staffing_state ?? 'unstaffed').toLowerCase()
  const h = hoursUntil(record.start_at, nowMs)
  const ended = record.end_at ? new Date(record.end_at).getTime() < nowMs : false
  const sameDay =
    new Date(record.start_at).toDateString() === new Date(nowMs).toDateString()

  const completion: Record<TimelinePhaseId, number> = {
    created: 100,
    planning: stage === 'draft' ? 35 : 85,
    staffing:
      staff === 'staffed'
        ? 92
        : staff === 'partially_staffed'
          ? 68
          : staff === 'at_risk'
            ? 42
            : 18,
    communications: mobilizeReady(record.mobilize_publish_state) ? 88 : 44,
    final_prep: h > 48 ? 55 : h > 6 ? 72 : h > 0 ? 78 : 100,
    day_of: sameDay && !ended ? 90 : ended ? 100 : h > 0 && h <= 18 ? 70 : 25,
    follow_up: ended ? (record.followup_state === 'complete' ? 100 : 45) : 12,
  }

  let active: TimelinePhaseId = 'planning'
  if (ended) active = 'follow_up'
  else if (sameDay && h <= 10 && h >= -2) active = 'day_of'
  else if (h > 0 && h < 48 && h <= 36) active = 'final_prep'
  else if (!mobilizeReady(record.mobilize_publish_state) && ['approved', 'scheduled'].includes(stage))
    active = 'communications'
  else if (staff !== 'staffed' && ['approved', 'scheduled', 'published_internal'].includes(stage))
    active = 'staffing'
  else if (stage === 'draft' || stage === 'submitted') active = 'planning'
  else if (stage === 'completed' || (record.followup_state ?? '').includes('complete')) active = 'follow_up'
  else active = 'communications'

  const blockers: Partial<Record<TimelinePhaseId, string>> = {}
  if (staff !== 'staffed' && ['scheduled', 'approved', 'published_internal'].includes(stage)) {
    blockers.staffing = 'Roles not fully confirmed'
  }
  if (!mobilizeReady(record.mobilize_publish_state) && stage === 'scheduled')
    blockers.communications = 'Publish / Mobilize path not complete'
  if (h > 0 && h < 24 && completion.final_prep < 80) blockers.final_prep = 'Compressed runway'

  return { completion, active, blockers, hoursUntilStart: h }
}
