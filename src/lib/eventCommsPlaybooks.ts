/**
 * Event-type aware communications playbooks — defaults merged with per-event edits.
 */

import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import type {
  EventCommunicationPlan,
  EventGraphicsRequest,
  EventMediaCapturePlan,
  EventPostEventContentPlan,
  EventPressPlan,
  EventRecapPackage,
  EventSocialSlot,
} from './eventCommsModels'

function id(prefix: string, n: number): string {
  return `${prefix}-${n}`
}

type PlaybookSeed = {
  playbook_id: string
  announcement_cadence: string
  volunteer_cadence: string
  attendee_reminder_cadence: string
  internal_cadence: string
  media_advisory_likely: boolean
  press_release_likely: boolean
  social_sequence: string[]
  graphics_notes: string[]
  post_event_expectations: string[]
  default_press: Partial<EventPressPlan>
  social_slots: Omit<EventSocialSlot, 'id'>[]
  graphics: Omit<EventGraphicsRequest, 'id'>[]
  media_capture: EventMediaCapturePlan
  post_event: Partial<EventPostEventContentPlan>
  recap: Partial<EventRecapPackage>
}

const BASE_SOCIAL: Omit<EventSocialSlot, 'id'>[] = [
  {
    channel: 'social_facebook',
    purpose: 'announce',
    headline: 'Announcement post',
    body_prompt: 'Why this event matters locally; date/time/location; RSVP or sign-up CTA.',
    owner_role: 'communications_lead',
    draft_status: 'empty',
    publish_timing: '-10d',
  },
  {
    channel: 'social_instagram',
    purpose: 'reminder',
    headline: 'Reminder graphic',
    body_prompt: 'Short reminder with urgency; highlight volunteers welcome.',
    owner_role: 'communications_lead',
    draft_status: 'empty',
    publish_timing: '-2d',
  },
  {
    channel: 'social_x',
    purpose: 'live',
    headline: 'Day-of live thread',
    body_prompt: 'Key moments, quotes, photos (respect photo policy).',
    owner_role: 'communications_lead',
    draft_status: 'empty',
    publish_timing: '0',
  },
  {
    channel: 'social_facebook',
    purpose: 'recap',
    headline: 'Recap post',
    body_prompt: 'Thank attendees; 2–3 outcomes; next ask.',
    owner_role: 'communications_lead',
    draft_status: 'empty',
    publish_timing: '+1d',
  },
]

const PLAYBOOKS: Partial<Record<CampaignEventTypeKey, PlaybookSeed>> = {
  public_fair_festival: {
    playbook_id: 'public_fair_festival_v1',
    announcement_cadence: 'T-21d save the date · T-10d RSVP push · T-3d weather + logistics',
    volunteer_cadence: 'Weekly invites · T-7d shift reminders · T-1d pack list',
    attendee_reminder_cadence: 'T-7d · T-2d SMS/email',
    internal_cadence: 'Weekly huddle · T-3d all-hands · day-of 7a standup',
    media_advisory_likely: true,
    press_release_likely: true,
    social_sequence: ['County fair energy', 'Vendor/volunteer hero', 'Day-of carousel', 'Recap + donate'],
    graphics_notes: ['Banner', 'Instagram square', 'Wayfinding'],
    post_event_expectations: ['Photo dump curated', 'Press pull quotes', 'List growth report'],
    default_press: { target_level: 'advisory', owner_role: 'communications_lead' },
    social_slots: BASE_SOCIAL,
    graphics: [
      {
        asset_type: 'flyer',
        title: 'Public fair flyer',
        brief: 'Date, venue, free admission, accessibility note',
        due_at: null,
        owner_role: 'communications_lead',
        status: 'requested',
        linked_channels: ['email', 'social_facebook'],
      },
    ],
    media_capture: {
      photo_owner_role: 'communications_lead',
      video_owner_role: 'volunteer_coordinator',
      live_post_owner_role: 'communications_lead',
      moments_to_capture: ['Crowd shot', 'Candidate handshake', 'Volunteer HQ'],
      quotes_to_gather: ['Attendee “why I’m here”', 'Volunteer spotlight'],
      backup_if_thin: 'Use B-roll from similar past fair + strong text recap',
    },
    post_event: { recap_status: 'not_started', gallery_status: 'missing', press_followup: true },
    recap: { recap_post: '', thank_you: '', quote_highlights: [], internal_summary: '' },
  },
  campaign_rally: {
    playbook_id: 'campaign_rally_v1',
    announcement_cadence: 'T-28d teaser · T-14d full promo · T-3d earned media',
    volunteer_cadence: 'Marshal recruitment T-21d · T-7d final roster',
    attendee_reminder_cadence: 'T-4d · day-of gates',
    internal_cadence: 'Daily stand-up final week',
    media_advisory_likely: true,
    press_release_likely: true,
    social_sequence: ['Hype trailer', 'Speaker roll', 'Livestream link', 'Highlight reel'],
    graphics_notes: ['Stage backdrop', 'IG story stickers'],
    post_event_expectations: ['Press clips folder', 'Top quotes doc'],
    default_press: { target_level: 'full_package', owner_role: 'communications_lead' },
    social_slots: BASE_SOCIAL,
    graphics: [
      {
        asset_type: 'speaker_card',
        title: 'Speaker / special guest card',
        brief: 'Name, title, one-line bio',
        due_at: null,
        owner_role: 'communications_lead',
        status: 'requested',
        linked_channels: ['social_x', 'social_facebook'],
      },
    ],
    media_capture: {
      photo_owner_role: 'communications_lead',
      video_owner_role: 'communications_lead',
      live_post_owner_role: 'communications_lead',
      moments_to_capture: ['Walk-on', 'Crowd wide', 'Signs'],
      quotes_to_gather: ['Candidate 15s', 'Surrogate line'],
      backup_if_thin: 'Pool photos from prior rally same county',
    },
    post_event: { recap_status: 'not_started', gallery_status: 'missing', press_followup: true },
    recap: { recap_post: '', thank_you: '', quote_highlights: [], internal_summary: '' },
  },
  house_party_intro_candidate: {
    playbook_id: 'house_party_intro_v1',
    announcement_cadence: 'Host-only first · T-10d guest list · T-3d confirm',
    volunteer_cadence: 'Host kit · signup links',
    attendee_reminder_cadence: 'T-2d reminder + address gate',
    internal_cadence: 'Host ↔ coordinator sync',
    media_advisory_likely: false,
    press_release_likely: false,
    social_sequence: ['Private thank-you template (no location in public copy)'],
    graphics_notes: ['Private invite graphic — no address'],
    post_event_expectations: ['Host debrief note', 'Names to CRM'],
    default_press: { target_level: 'local', owner_role: 'event_coordinator' },
    social_slots: BASE_SOCIAL.slice(0, 2).map((s) => ({
      ...s,
      body_prompt: s.body_prompt + ' — enforce privacy; no precise address in public posts.',
    })),
    graphics: [],
    media_capture: {
      photo_owner_role: 'host',
      video_owner_role: 'host',
      live_post_owner_role: 'communications_lead',
      moments_to_capture: ['Intimate group'],
      quotes_to_gather: ['Guest reflection (opt-in)'],
      backup_if_thin: 'Written recap from host notes',
    },
    post_event: { recap_status: 'not_started', gallery_status: 'collecting', press_followup: false },
    recap: { recap_post: '', thank_you: '', quote_highlights: [], internal_summary: '' },
  },
}

const FALLBACK: PlaybookSeed = {
  playbook_id: 'generic_v1',
  announcement_cadence: 'T-14d notice · T-7d RSVP · T-2d reminder',
  volunteer_cadence: 'Roll weekly until staffed',
  attendee_reminder_cadence: 'T-3d · T-1d',
  internal_cadence: 'Weekly coordinator sync',
  media_advisory_likely: false,
  press_release_likely: false,
  social_sequence: ['Announce', 'Reminder', 'Recap'],
  graphics_notes: ['Event graphic', 'Reminder'],
  post_event_expectations: ['Thank-you', 'Short recap'],
  default_press: { target_level: 'local', owner_role: 'communications_lead' },
  social_slots: BASE_SOCIAL,
  graphics: [],
  media_capture: {
    photo_owner_role: 'event_coordinator',
    video_owner_role: 'event_coordinator',
    live_post_owner_role: 'communications_lead',
    moments_to_capture: ['Venue establishing', 'Audience'],
    quotes_to_gather: ['Attendee (opt-in)'],
    backup_if_thin: 'Lean on written recap',
  },
  post_event: { recap_status: 'not_started', gallery_status: 'missing', press_followup: false },
  recap: { recap_post: '', thank_you: '', quote_highlights: [], internal_summary: '' },
}

export function getCommsPlaybookSeed(eventType: CampaignEventTypeKey): PlaybookSeed {
  return PLAYBOOKS[eventType] ?? FALLBACK
}

export function seedSocialSlots(seed: PlaybookSeed): EventSocialSlot[] {
  return seed.social_slots.map((s, i) => ({ ...s, id: id('soc', i) }))
}

export function seedGraphics(seed: PlaybookSeed): EventGraphicsRequest[] {
  return seed.graphics.map((g, i) => ({ ...g, id: id('gfx', i) }))
}

/** Build plan shell — steps filled by pipeline. */
export function buildPlanShellFromSeed(
  eventId: string,
  eventType: string,
  seed: PlaybookSeed,
): Omit<EventCommunicationPlan, 'steps'> {
  const press: EventPressPlan = {
    target_level: seed.default_press.target_level ?? 'local',
    owner_role: seed.default_press.owner_role ?? 'communications_lead',
    media_advisory_outlined: false,
    press_release_outlined: false,
    pitch_email_outlined: false,
    ...seed.default_press,
  }

  const post_event: EventPostEventContentPlan = {
    recap_status: 'not_started',
    thank_you_status: 'pending',
    gallery_status: 'missing',
    press_followup: false,
    highlight_summary: '',
    internal_lessons_line: '',
    ...seed.post_event,
  }

  const recap: EventRecapPackage = {
    recap_post: '',
    thank_you: '',
    quote_highlights: [],
    internal_summary: '',
    ...seed.recap,
  }

  return {
    event_id: eventId,
    event_type: eventType,
    playbook_id: seed.playbook_id,
    announcement_cadence: seed.announcement_cadence,
    volunteer_cadence: seed.volunteer_cadence,
    attendee_reminder_cadence: seed.attendee_reminder_cadence,
    internal_cadence: seed.internal_cadence,
    media_advisory_likely: seed.media_advisory_likely,
    press_release_likely: seed.press_release_likely,
    social_sequence: [...seed.social_sequence],
    graphics_notes: [...seed.graphics_notes],
    post_event_expectations: [...seed.post_event_expectations],
    social_plan: seedSocialSlots(seed),
    press,
    graphics_requests: seedGraphics(seed),
    media_capture: { ...seed.media_capture },
    post_event,
    recap,
  }
}
