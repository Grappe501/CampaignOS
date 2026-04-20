/**
 * Template-based message suggestions only. User edits and sends manually.
 * No auto-send, no bulk generation.
 */

function firstNameFromLabel(displayLabel: string): string {
  const t = displayLabel.trim()
  if (!t) return 'there'
  const first = t.split(/\s+/)[0]
  return first.length > 40 ? 'there' : first
}

export function suggestOutreachMessage(displayLabel: string, relationshipKind: string): string {
  const name = firstNameFromLabel(displayLabel)
  const rel = relationshipKind.replace(/_/g, ' ')
  return [
    `Hi ${name} — hope you're doing well.`,
    '',
    `I've been thinking about the campaign and wanted to reconnect (${rel}). When you have a few minutes, I'd love to hear what's on your mind — no pressure.`,
    '',
    `Thanks for being someone I trust.`,
  ].join('\n')
}

export function suggestInviteNote(displayLabel: string): string {
  const name = firstNameFromLabel(displayLabel)
  return [
    `Hey ${name} —`,
    '',
    `I'm building my Power of 5 for Chris Jones. If you're open to learning more (volunteer, donate, or just talk), here's my invite link when you're ready. Totally your call.`,
  ].join('\n')
}
