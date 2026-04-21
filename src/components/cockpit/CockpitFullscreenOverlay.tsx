import CockpitModuleViewport from './CockpitModuleViewport'
import type { CockpitModuleId } from '../../lib/cockpit/cockpitWorkspaceSchemas'
import { getCockpitModuleMeta } from '../../lib/cockpit/cockpitModuleRegistry'
import type { CampaignProfile } from '../../hooks/useProfile'

type Props = {
  moduleId: CockpitModuleId
  profile: CampaignProfile | null
  onClose: () => void
}

export default function CockpitFullscreenOverlay({ moduleId, profile, onClose }: Props) {
  const meta = getCockpitModuleMeta(moduleId)
  return (
    <div className="cm-cockpit-fs-overlay" role="dialog" aria-modal aria-labelledby="cm-fs-title">
      <header className="cm-cockpit-fs-overlay__head">
        <h2 id="cm-fs-title">{meta?.title ?? 'Module'}</h2>
        <button type="button" className="cm-cockpit-fs-overlay__close" onClick={onClose}>
          Exit fullscreen
        </button>
      </header>
      <div className="cm-cockpit-fs-overlay__body cm-cockpit__embed">
        <CockpitModuleViewport moduleId={moduleId} profile={profile} />
      </div>
    </div>
  )
}
