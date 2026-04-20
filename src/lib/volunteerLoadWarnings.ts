import type { VolunteerLoadProfile } from './volunteerLoadModels'

export function formatVolunteerLoadWarning(load: VolunteerLoadProfile): string {
  return `${load.user_id.slice(0, 8)}… — ${load.state.replace(/_/g, ' ')} (${load.load_score}) · ${load.details}`
}

export function warnBeforeAssign(
  targetUserId: string | null | undefined,
  loadMap: Map<string, VolunteerLoadProfile>,
): { level: 'ok' | 'caution' | 'strong'; message: string } | null {
  if (!targetUserId) return null
  const p = loadMap.get(String(targetUserId))
  if (!p) return { level: 'ok', message: 'No recent load data for this volunteer in the current window.' }
  if (p.state === 'burnout_risk' || p.state === 'overloaded') {
    return {
      level: 'strong',
      message: `Elevated load (${p.state.replace(/_/g, ' ')}, score ${p.load_score}). Consider redistributing.`,
    }
  }
  if (p.state === 'elevated_load') {
    return { level: 'caution', message: `Elevated commitments (${p.load_score}). Proceed if intentional.` }
  }
  return { level: 'ok', message: `Load looks balanced (${p.state.replace(/_/g, ' ')}, ${p.load_score}).` }
}
