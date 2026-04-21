/**
 * Cockpit-native module metadata and Agent Jones focus packing (Phase 2 bridge).
 */

import type {
  CockpitModuleId,
  CockpitPersistedLayout,
  CockpitQuadrantSlots,
} from './cockpitWorkspaceSchemas'
import type { AgentJonesCockpitFocus } from '../agentJonesContextV2'
import { getCockpitModuleMeta } from './cockpitModuleRegistry'

export type CockpitModuleRenderMode = 'micro' | 'tactical' | 'command' | 'fullscreen'

/** Resolve quadrant slots when user has not customized. */
export function defaultQuadrantSlots(layout: CockpitPersistedLayout): CockpitQuadrantSlots {
  const q = layout.quadrantSlots
  if (q && q.length === 4) return q
  const a = layout.centerPrimary
  const b = layout.centerSecondary ?? 'calendar'
  return [a, b, 'war_room', 'leadership_briefing']
}

export function buildAgentJonesCockpitFocus(args: {
  layout: CockpitPersistedLayout
  fullscreenModuleId: CockpitModuleId | null
}): AgentJonesCockpitFocus {
  const { layout, fullscreenModuleId } = args
  const primaryMeta = getCockpitModuleMeta(layout.centerPrimary)
  const sec = layout.centerSecondary
    ? getCockpitModuleMeta(layout.centerSecondary)
    : null
  const hintParts = [
    primaryMeta ? `Center: ${primaryMeta.title}` : null,
    sec ? `Split: ${sec.title}` : null,
    layout.centerMode === 'quad' ? 'Layout: 4-up quadrant' : null,
    fullscreenModuleId
      ? `Fullscreen module: ${getCockpitModuleMeta(fullscreenModuleId)?.title ?? fullscreenModuleId}`
      : null,
  ].filter(Boolean)
  return {
    center_primary_module_id: layout.centerPrimary,
    center_secondary_module_id: layout.centerSecondary,
    center_mode: layout.centerMode,
    fullscreen_module_id: fullscreenModuleId,
    module_hint: hintParts.length ? hintParts.join(' · ') : null,
  }
}
