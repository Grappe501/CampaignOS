/**
 * Template-based message suggestions only. User edits and sends manually.
 * No auto-send, no bulk generation.
 *
 * Extended: field narrative helpers + optional server draft via `message-draft` function
 * (framework bundle must be supplied — AI does not invent new pillars).
 */

import type { MessageTone } from './messageFramework'
import { requestMessageDraft, type MessageDraftMode } from './api/messageDraft'

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

/** Replace {{name}} / {{volunteer}} placeholders in script lines. */
export function fillScriptPlaceholders(
  lines: string[],
  vars: { name?: string; volunteer?: string },
): string[] {
  const name = vars.name?.trim() || 'there'
  const volunteer = vars.volunteer?.trim() || 'a volunteer'
  return lines.map((line) =>
    line.replace(/\{\{name\}\}/g, name).replace(/\{\{volunteer\}\}/g, volunteer),
  )
}

/** Deterministic tone nudge (bounded — not generative). */
export function applyToneToTalkingPoint(headline: string, tone: MessageTone): string {
  const t = headline.trim()
  if (!t) return t
  if (tone === 'candidate') return t
  if (tone === 'surrogate') {
    return t.startsWith('Chris') ? t : `Chris focuses on this: ${t.charAt(0).toLowerCase()}${t.slice(1)}`
  }
  if (tone === 'volunteer') {
    return `I'm volunteering because ${t.charAt(0).toLowerCase()}${t.slice(1)}`
  }
  return t
}

export type MessageDraftAssistInput = {
  mode: MessageDraftMode
  tone: MessageTone
  framework_excerpt: Record<string, unknown>
  operator_note?: string
}

/** Server-side bounded draft (OpenAI). Falls back to throwing on misconfig — caller handles. */
export async function requestBoundedMessageDraft(input: MessageDraftAssistInput): Promise<{
  title: string
  body: string
  mode: MessageDraftMode
}> {
  return requestMessageDraft({
    mode: input.mode,
    tone: input.tone,
    framework_excerpt: input.framework_excerpt,
    operator_note: input.operator_note,
  })
}
