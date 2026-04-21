/**
 * Offline / API-failure fallbacks — structured from event fields only (no external services).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { EventContentDraft, EventCommsDraftMode, PressMediaRecommendation } from './eventCommsModels'

function safeTitle(record: CampaignCalendarEventRecord): string {
  const t = record.title?.trim()
  return t || 'Event'
}

function whenWhere(record: CampaignCalendarEventRecord): string {
  const parts: string[] = []
  const start = record.start_at?.trim()
  if (start) {
    try {
      parts.push(new Date(start).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }))
    } catch {
      parts.push(start)
    }
  } else {
    parts.push('[Add start date/time]')
  }
  if (record.venue_name?.trim()) parts.push(`Venue: ${record.venue_name.trim()}`)
  if (record.address_or_virtual?.trim()) parts.push(`Location: ${record.address_or_virtual.trim()}`)
  return parts.join(' · ')
}

export function buildDeterministicCommsDraft(
  mode: EventCommsDraftMode,
  record: CampaignCalendarEventRecord,
  press: PressMediaRecommendation,
): EventContentDraft {
  const now = new Date().toISOString()
  const titleBase = safeTitle(record)
  const ww = whenWhere(record)
  const objective = record.event_objective?.trim()
  const pub = record.public_description?.trim()
  const vis = String(record.visibility_scope ?? '')

  let title = `${titleBase} — ${mode.replace(/_/g, ' ')}`
  let body = ''

  switch (mode) {
    case 'press_release':
      title = `Draft: ${titleBase}`
      body = [
        `# ${titleBase}`,
        '',
        `**Release draft (manual / offline)** — fill gaps before external distribution.`,
        '',
        `**When / where:** ${ww}`,
        objective ? `**Objective:** ${objective}` : '',
        pub ? `**Public description (source of truth):** ${pub}` : '',
        `**Visibility context:** ${vis || 'unspecified'}`,
        `**Press posture (deterministic):** ${press.press_level} — ${press.recommendation_reason}`,
        '',
        '## Quote',
        '[Approved speaker quote — do not invent.]',
        '',
        '## Boilerplate',
        '[Campaign boilerplate / contact for media — ]',
        '',
      ]
        .filter(Boolean)
        .join('\n')
      break
    case 'media_advisory':
      body = [
        `# Media advisory — ${titleBase}`,
        '',
        `WHAT: [One sentence tied to objective]`,
        `WHEN / WHERE: ${ww}`,
        'WHO: [Hosts / surrogates — confirm before send]',
        'RSVP / CONTACT: [Comms desk email / phone]',
        '',
        '_Advisory only — not a press release._',
      ].join('\n')
      break
    case 'pitch_email':
      body = [
        `Subject: Story idea — ${titleBase}`,
        '',
        `Hi — quick pitch for ${titleBase} (${ww}).`,
        objective ? `Why it matters: ${objective}` : 'Why it matters: [Add local hook]',
        '',
        'Happy to share on-background detail and access.',
        '',
        '[Signature]',
      ].join('\n')
      break
    case 'talking_points':
      body = [
        `# Talking points — ${titleBase}`,
        '',
        `- Event basics: ${ww}`,
        `- Visibility: ${vis}`,
        `- Stay on message; defer unknowns to communications lead.`,
        '- No speculation on turnout or opponents.',
        '- Respect photo / consent policies.',
      ].join('\n')
      break
    case 'reporter_summary':
      body = [
        `# Reporter fact sheet — ${titleBase}`,
        '',
        `**Schedule:** ${ww}`,
        pub ? `**Program / description:** ${pub}` : '**Program / description:** [Add from approved copy]',
        '**On the record:** [Named spokespeople only]',
        '**Parking / access:** [Add]',
      ].join('\n')
      break
    case 'announcement_email':
      body = [
        `Subject: ${titleBase} — you're invited`,
        '',
        `We're holding **${titleBase}**.`,
        '',
        `**When & where:** ${ww}`,
        objective ? `**Why:** ${objective}` : '',
        '',
        '[CTA button / signup placeholder]',
        '',
      ]
        .filter(Boolean)
        .join('\n')
      break
    case 'social_package':
      body = [
        `## ${titleBase} — social package (manual)`,
        '',
        '**Facebook** (2–3 sentences + CTA)',
        `[${ww}]`,
        '',
        '**X** (1–2 posts)',
        `Save the date: ${titleBase}. ${record.public_title?.trim() ? `Public title: ${record.public_title}` : ''}`,
        '',
        '**Instagram** (caption + graphic prompt)',
        'Graphic: [aspect ratio] — hero photo placeholder',
        '',
      ].join('\n')
      break
    case 'live_coverage_prompts':
      body = [
        `# Live coverage — ${titleBase}`,
        '',
        '- Photo moments: venue wide, crowd energy, signage, volunteers.',
        '- Quote prompts: “why I’m here” (opt-in).',
        '- Backup if turnout is thin: emphasize mission + thank hosts.',
        `- Day-of timing: ${ww}`,
      ].join('\n')
      break
    case 'post_event_recap':
      body = [
        `# Post-event recap — ${titleBase}`,
        '',
        `**Held:** ${ww}`,
        '- Thank-you to: [hosts, volunteers, attendees]',
        '- 2–3 outcomes (factual only)',
        '- Photos: link to internal media library when curated',
        '- Lessons: [internal bullet]',
      ].join('\n')
      break
    default: {
      const _exhaustive: never = mode
      void _exhaustive
      body = `# ${title}\n\n${ww}`
    }
  }

  return {
    id: `draft-local-${mode}-${Date.now()}`,
    kind: mode,
    title: title.slice(0, 200),
    body: body.slice(0, 12000),
    created_at: now,
    updated_at: now,
    version: 1,
    ai_generated: false,
    reviewed: false,
  }
}
