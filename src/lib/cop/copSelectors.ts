import type { CampaignOperatingPicture } from './copTypes'

export function getCopMetric(pic: CampaignOperatingPicture, key: string) {
  return pic.metrics.find((m) => m.key === key) ?? null
}
