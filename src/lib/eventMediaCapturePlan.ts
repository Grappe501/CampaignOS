/** Live coverage plan lives on `EventCommunicationPlan.media_capture` — helpers only. */
import type { EventMediaCapturePlan } from './eventCommsModels'

export function describeMediaCapture(plan: EventMediaCapturePlan): string[] {
  return [
    `Photos: ${plan.photo_owner_role}`,
    `Video: ${plan.video_owner_role}`,
    `Live posts: ${plan.live_post_owner_role}`,
    ...plan.moments_to_capture.map((m) => `Moment: ${m}`),
    ...plan.quotes_to_gather.map((q) => `Quote: ${q}`),
    `Backup: ${plan.backup_if_thin}`,
  ]
}
