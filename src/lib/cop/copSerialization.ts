import type { CampaignOperatingPicture } from './copTypes'

export function serializeCampaignOperatingPicture(pic: CampaignOperatingPicture): string {
  return JSON.stringify(pic)
}
