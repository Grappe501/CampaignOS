/**
 * Bounded field narrative / message discipline digest for Agent Jones (advisory only).
 * Does not grant authority to invent narrative — framework stays canonical in code.
 */

import { buildCampaignMessageFramework } from './messageFramework'
import {
  rollupMessageUsage,
  topMessagesInUse,
  weakMessagingZones,
  type MessageUsageEvent,
} from './messageAnalytics'

export type AgentJonesFieldNarrativeSnapshot = {
  source: 'field_narrative_command_v1'
  generated_at_ms: number
  framework_version: string
  slogan: string
  pillar_keys: string[]
  discipline_reminders: string[]
  advisory_lines: string[]
  usage_top_lines: string[]
  weak_zone_lines: string[]
}

export function buildAgentJonesFieldNarrativeSnapshot(input: {
  generatedAtMs: number
  usageEvents?: readonly MessageUsageEvent[]
}): AgentJonesFieldNarrativeSnapshot {
  const fw = buildCampaignMessageFramework()
  const rollups = rollupMessageUsage(input.usageEvents ?? [])
  const top = topMessagesInUse(rollups, 5)
  const weak = weakMessagingZones(rollups)

  const usage_top_lines = top.map((r) => `${r.kind} ${r.message_key}: ${r.count} touches`)
  const weak_zone_lines = weak

  return {
    source: 'field_narrative_command_v1',
    generated_at_ms: input.generatedAtMs,
    framework_version: fw.version,
    slogan: fw.narrative.slogan,
    pillar_keys: fw.pillars.map((p) => p.key),
    discipline_reminders: [
      'Agent Jones recommends messaging only within the campaign framework — no new pillars or policy inventions.',
      'Volunteer tone: neighbor-to-neighbor; surrogate tone: accurate third-person; candidate tone: first-person when scripted.',
      'Run drafts through discipline checks before high-visibility use.',
    ],
    advisory_lines: [
      `Active narrative: ${fw.narrative.north_star.slice(0, 220)}${fw.narrative.north_star.length > 220 ? '…' : ''}`,
      rollups.length
        ? 'Usage telemetry present — see top lines and weak zones below.'
        : 'No usage telemetry in this session — leadership rollups fill in as volunteers log touches.',
    ],
    usage_top_lines,
    weak_zone_lines,
  }
}
