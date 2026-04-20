import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { RapidActionContext } from './rapidActionSchemas'

export function buildRapidActionContextFromEvent(
  source: RapidActionContext['source'],
  record: CampaignCalendarEventRecord | null,
  extras?: Partial<RapidActionContext>,
): RapidActionContext {
  return {
    source,
    event_id: record?.event_id ?? null,
    event_title: record?.title ?? null,
    staff_role_slug: extras?.staff_role_slug ?? null,
    volunteer_user_id: extras?.volunteer_user_id ?? null,
    approval_request_event_id: extras?.approval_request_event_id ?? null,
    issue_summary: extras?.issue_summary ?? null,
    county_id: record?.county_id ?? extras?.county_id ?? null,
    owner_user_id: record?.owner_user_id ?? extras?.owner_user_id ?? null,
  }
}

export function mergeRapidActionContext(
  base: RapidActionContext,
  patch: Partial<RapidActionContext>,
): RapidActionContext {
  return { ...base, ...patch }
}
