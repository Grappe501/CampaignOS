/**
 * Post-event communications / documentation completeness (client-side signals for the event page).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { EventCommunicationsWorkspace } from './eventCommsModels'
import { isEventCompleteForComms } from './eventCommsLifecycle'

export type PostEventCommsRisk = {
  level: 'ok' | 'warn' | 'high'
  messages: string[]
}

export function evaluatePostEventCommsRisk(
  record: CampaignCalendarEventRecord,
  workspace: EventCommunicationsWorkspace,
): PostEventCommsRisk {
  const messages: string[] = []
  if (!isEventCompleteForComms(record)) {
    return { level: 'ok', messages: [] }
  }

  const { post_event: pe, media_capture: mc } = workspace.plan
  if (pe.recap_status !== 'published') {
    messages.push('Recap is not marked published in the post-event content plan.')
  }
  if (pe.thank_you_status !== 'sent' && pe.thank_you_status !== 'skipped') {
    messages.push('Thank-you messaging is not marked sent or explicitly skipped.')
  }

  const nMedia = workspace.media_library.length
  if (nMedia === 0) {
    messages.push('No files in the on-page media library yet — recap may lack visuals.')
  } else if (pe.gallery_status === 'collecting' && nMedia < 2) {
    messages.push('Gallery still collecting; consider adding more assets for recap curation.')
  }

  const draftReviewBacklog = workspace.drafts.filter((d) => d.ai_generated && !d.reviewed).length
  if (draftReviewBacklog > 0) {
    messages.push(`${draftReviewBacklog} draft(s) still need human review before distribution.`)
  }

  if (mc.moments_to_capture.length > 0 && nMedia === 0) {
    messages.push('Capture plan lists expected moments but the library is empty — confirm day-of capture or upload.')
  }

  let level: PostEventCommsRisk['level'] = 'ok'
  if (messages.length >= 2) level = 'high'
  else if (messages.length === 1) level = 'warn'

  return { level, messages }
}
