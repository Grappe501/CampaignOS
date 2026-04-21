import { useMemo } from 'react'
import type { CampaignOperatingScope } from '../lib/cop/copTypes'
import type { CampaignKpiRow } from '../lib/kpiEngine'
import { buildCampaignOperatingPicture } from '../lib/cop/copAggregationService'
import { useCampaignOperatingPicture } from './useCampaignOperatingPicture'

/**
 * Same sources as global COP with an alternate scope (desk / war-room label).
 */
export function useScopedCampaignOperatingPicture(
  scope: CampaignOperatingScope,
  kpiRows?: CampaignKpiRow[] | null,
) {
  const { snapshot, profileLoading } = useCampaignOperatingPicture({ kpiRows })

  const cop = useMemo(
    () =>
      buildCampaignOperatingPicture({
        snapshot,
        scope,
        assignmentMapLoaded: true,
        kpiRows: kpiRows ?? undefined,
      }),
    [snapshot, scope, kpiRows],
  )

  return { cop, profileLoading }
}
