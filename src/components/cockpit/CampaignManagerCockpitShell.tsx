import { useCallback, useEffect, useMemo, useState } from 'react'
import CockpitBottomCommandDeck from './CockpitBottomCommandDeck'
import CockpitCenterCommandArea from './CockpitCenterCommandArea'
import CockpitCommandPalette from './CockpitCommandPalette'
import CockpitFullscreenOverlay from './CockpitFullscreenOverlay'
import CockpitSideRail from './CockpitSideRail'
import CockpitTopTacticalBar from './CockpitTopTacticalBar'
import { useCampaignManagerCockpitIntel } from '../../hooks/useCampaignManagerCockpitIntel'
import { useCampaignManagerCockpit } from '../../context/CampaignManagerCockpitContext'
import { useCockpitTelemetry } from '../../context/CockpitTelemetryContext'
import { useEventAiOrchestration } from '../../context/EventAiOrchestrationContext'
import { buildEventAiOrchestrationBundle } from '../../lib/eventAi/eventAiOrchestrationEngine'
import { compileAgentJonesEventAiOrchestration } from '../../lib/eventAi/eventAiContextCompiler'
import { resolveEventAiCampaignScope } from '../../lib/eventAi/eventAiCorrelationScope'
import { buildAgentJonesCockpitFocus } from '../../lib/cockpit/cockpitModuleAdapter'
import { buildCockpitConsequences } from '../../lib/cockpit/cockpitConsequenceEngine'
import {
  buildCockpitMissionDigest,
  buildMissionStripExtras,
} from '../../lib/cockpit/cockpitAiMissionStrip'
import { getCompareTemplate } from '../../lib/cockpit/cockpitCompareTemplates'
import type { CockpitCompareTemplateId } from '../../lib/cockpit/cockpitCompareTemplates'
import { emitCockpitBus } from '../../lib/cockpit/cockpitEventBus'
import { getCockpitModuleMeta } from '../../lib/cockpit/cockpitModuleRegistry'
import { isCockpitModuleId } from '../../lib/cockpit/cockpitWorkspaceSchemas'
import type { CockpitModuleId } from '../../lib/cockpit/cockpitWorkspaceSchemas'
import type { CampaignProfile } from '../../hooks/useProfile'

type Props = {
  profile: CampaignProfile | null
}

export default function CampaignManagerCockpitShell({ profile }: Props) {
  const { snapshot, programEvents } = useCampaignManagerCockpitIntel(profile)
  const {
    layout,
    setFullscreenModule,
    fullscreenModuleId,
    setCenterModule,
    setCenterSplit,
    loadPreset,
  } = useCampaignManagerCockpit()
  const { setCockpitFocus, setCockpitMissionDigest } = useCockpitTelemetry()
  const { setCockpitEventAiOrchestration } = useEventAiOrchestration()

  const consequences = useMemo(() => buildCockpitConsequences(snapshot), [snapshot])
  const missionDigest = useMemo(
    () =>
      buildCockpitMissionDigest(snapshot, consequences, {
        centerPrimary: layout.centerPrimary,
        centerSecondary: layout.centerSecondary,
        centerMode: layout.centerMode,
      }),
    [snapshot, consequences, layout.centerPrimary, layout.centerSecondary, layout.centerMode],
  )

  const cockpitFocusModel = useMemo(
    () => buildAgentJonesCockpitFocus({ layout, fullscreenModuleId }),
    [layout, fullscreenModuleId],
  )

  const campaignScope = useMemo(
    () => resolveEventAiCampaignScope(programEvents, profile?.id),
    [programEvents, profile?.id],
  )

  const eventAiBundle = useMemo(
    () =>
      buildEventAiOrchestrationBundle({
        campaign_id: campaignScope,
        leadership_snapshot: snapshot,
        cockpit_focus: cockpitFocusModel,
        cockpit_mission_digest: missionDigest,
        event_desk_layer: null,
        calendar_pool: programEvents,
        focused_event_record: null,
      }),
    [snapshot, missionDigest, cockpitFocusModel, programEvents, campaignScope],
  )

  const cockpitEventAiWire = useMemo(
    () =>
      compileAgentJonesEventAiOrchestration(eventAiBundle, {
        scope: 'cockpit_campaign',
        completeness_pct: Math.min(
          95,
          45 + (programEvents.length > 0 ? 25 : 0) + (missionDigest.top_consequences.length ? 15 : 0),
        ),
        data_gap_warnings:
          programEvents.length === 0
            ? ['No program events in session — mesh uses cockpit digest only.']
            : [],
      }),
    [eventAiBundle, programEvents.length, missionDigest.top_consequences.length],
  )

  useEffect(() => {
    setCockpitEventAiOrchestration(cockpitEventAiWire)
    return () => setCockpitEventAiOrchestration(null)
  }, [cockpitEventAiWire, setCockpitEventAiOrchestration])

  useEffect(() => {
    setCockpitFocus(
      buildAgentJonesCockpitFocus({
        layout,
        fullscreenModuleId,
      }),
    )
    return () => setCockpitFocus(null)
  }, [layout, fullscreenModuleId, setCockpitFocus])

  useEffect(() => {
    setCockpitMissionDigest(missionDigest)
  }, [missionDigest, setCockpitMissionDigest])

  useEffect(
    () => () => {
      setCockpitMissionDigest(null)
    },
    [setCockpitMissionDigest],
  )

  useEffect(() => {
    emitCockpitBus({ type: 'mission_digest_tick', generatedAtMs: snapshot.generated_at_ms })
  }, [snapshot.generated_at_ms])

  const [paletteOpen, setPaletteOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'k' && e.key !== 'K')) return
      const el = e.target
      const inPalette =
        el instanceof HTMLElement && Boolean(el.closest?.('.cm-cockpit-palette'))
      if (
        !inPalette &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          (el instanceof HTMLElement && el.isContentEditable))
      ) {
        return
      }
      e.preventDefault()
      setPaletteOpen((o) => !o)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const focusTarget: CockpitModuleId = isCockpitModuleId(missionDigest.recommended_center_module_id)
    ? missionDigest.recommended_center_module_id
    : 'leadership_briefing'

  /** Avoid attention fatigue when the recommended module already owns center. */
  const recommendedRailId =
    layout.centerPrimary === focusTarget && layout.centerMode === 'single' ? null : focusTarget

  const stripExtrasSafe = useMemo(() => {
    const recId: CockpitModuleId = isCockpitModuleId(missionDigest.recommended_center_module_id)
      ? missionDigest.recommended_center_module_id
      : 'leadership_briefing'
    const title = getCockpitModuleMeta(recId)?.shortTitle ?? recId
    return buildMissionStripExtras(missionDigest, title)
  }, [missionDigest])

  const handleApplyCompare = useCallback(
    (id: CockpitCompareTemplateId) => {
      const t = getCompareTemplate(id)
      if (!t) return
      setCenterSplit(t.primary, t.secondary, t.mode)
      emitCockpitBus({ type: 'apply_compare_template', templateId: id })
    },
    [setCenterSplit],
  )

  return (
    <div className="cm-cockpit" id="cm-cockpit-root">
      <CockpitTopTacticalBar snapshot={snapshot} missionExtras={stripExtrasSafe} />
      <div className="cm-cockpit__workspace">
        <CockpitSideRail
          side="left"
          moduleIds={layout.leftRail}
          snapshot={snapshot}
          recommendedModuleId={recommendedRailId}
        />
        <CockpitCenterCommandArea profile={profile} />
        <CockpitSideRail
          side="right"
          moduleIds={layout.rightRail}
          snapshot={snapshot}
          recommendedModuleId={recommendedRailId}
        />
      </div>
      <CockpitBottomCommandDeck />
      <CockpitCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onPromoteCenter={(id) => setCenterModule(id)}
        onApplyCompare={handleApplyCompare}
        onLoadPreset={loadPreset}
      />
      {fullscreenModuleId ? (
        <CockpitFullscreenOverlay
          moduleId={fullscreenModuleId}
          profile={profile}
          onClose={() => setFullscreenModule(null)}
        />
      ) : null}
    </div>
  )
}
