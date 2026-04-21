/**
 * Canonical campaign message framework — field narrative control (not a content farm).
 * Seed aligns with public brand knowledge; extend via CMS/DB later without scattering logic.
 */

export type MessageTone = 'candidate' | 'surrogate' | 'volunteer' | 'staff'

export type IssuePillarDef = {
  key: string
  title: string
  summary: string
  /** Keywords for lightweight discipline checks (lowercase). */
  anchor_terms: string[]
}

export type SubIssueDef = {
  id: string
  pillar_key: string
  label: string
  detail: string
}

export type TalkingPointDef = {
  id: string
  pillar_key: string
  /** One-line hook for doors / calls. */
  headline: string
  /** Optional expansion for trainings. */
  elaboration?: string
  /** Conversion tie-in (always roster-safe). */
  ask_line: string
}

export type ShortScriptDef = {
  id: string
  channel: 'canvass' | 'phone' | 'event_floor' | 'text'
  label: string
  lines: string[]
  required_pillar_keys: string[]
}

export type RebuttalDef = {
  id: string
  objection: string
  response: string
  pillar_key: string
}

export type CampaignNarrativeFramework = {
  version: string
  campaign_slug: string
  narrative: {
    slogan: string
    north_star: string
    hero_themes: string[]
  }
  pillars: IssuePillarDef[]
  sub_issues: SubIssueDef[]
  talking_points: TalkingPointDef[]
  short_scripts: ShortScriptDef[]
  rebuttals: RebuttalDef[]
  /** Phrases that contradict discipline if asserted as campaign positions (lowercase substrings). */
  drift_watchlist: string[]
}

function pillarsFromPublic(): IssuePillarDef[] {
  return [
    {
      key: 'jobs_local_economy',
      title: 'Jobs & Local Economy',
      summary:
        'Build an economy that lifts every community: good jobs, fair wages, small business growth, high-quality internet access, and rural hospitals that stay open.',
      anchor_terms: ['jobs', 'economy', 'wages', 'rural', 'small business', 'broadband', 'hospitals'],
    },
    {
      key: 'families_health',
      title: 'Families & Health',
      summary:
        'Help families thrive: stronger schools, maternal health support, addiction recovery, and food security.',
      anchor_terms: ['families', 'health', 'schools', 'maternal', 'recovery', 'food security'],
    },
    {
      key: 'schools_innovation',
      title: 'Schools & Innovation',
      summary:
        'Invest in people: early childhood, apprenticeships, and training in technology and the trades.',
      anchor_terms: ['education', 'apprenticeship', 'trades', 'early childhood', 'innovation'],
    },
    {
      key: 'democracy_for_people',
      title: 'Democracy for the People',
      summary:
        'Protect our voice: fair maps, secure accessible elections, trustworthy government, leaders who listen.',
      anchor_terms: ['democracy', 'elections', 'fair maps', 'vote', 'trust'],
    },
  ]
}

/** Default framework for Chris Jones for Congress — swap `buildCampaignMessageFramework` for multi-campaign later. */
export function buildCampaignMessageFramework(): CampaignNarrativeFramework {
  const pillars = pillarsFromPublic()
  return {
    version: '2026.04.field_narrative_v1',
    campaign_slug: 'chris-jones-for-congress',
    narrative: {
      slogan: 'A Bigger Table. A Brighter Future.',
      north_star:
        'Expand opportunity, strengthen communities, and prove that when Arkansans come together we can build a brighter future — with discipline, listening, and bridge-building.',
      hero_themes: [
        'Bridge-builder, not a divider — practical wins for Arkansas families.',
        'Economy that works in rural and urban neighborhoods.',
        'Schools and skills as the path to dignity and growth.',
      ],
    },
    pillars,
    sub_issues: [
      {
        id: 'si_rural_health',
        pillar_key: 'jobs_local_economy',
        label: 'Rural hospital access',
        detail: 'Keep care close to home; oppose leaving towns without emergency options.',
      },
      {
        id: 'si_workforce',
        pillar_key: 'schools_innovation',
        label: 'Workforce & trades',
        detail: 'Respect every path — college, credential, or apprenticeship.',
      },
    ],
    talking_points: [
      {
        id: 'tp_table_future',
        pillar_key: 'jobs_local_economy',
        headline: "Chris's campaign is about a bigger table — more seats, more voices, more opportunity.",
        elaboration:
          'Tie local examples (employers, schools, clinics) back to shared prosperity — not partisan noise.',
        ask_line: 'Can we count on you to vote — and maybe bring a neighbor to the polls?',
      },
      {
        id: 'tp_schools_future',
        pillar_key: 'schools_innovation',
        headline: 'Invest in kids and skills today so Arkansas competes tomorrow.',
        ask_line: 'If education matters to you, your vote is how we protect that priority.',
      },
      {
        id: 'tp_democracy_access',
        pillar_key: 'democracy_for_people',
        headline: 'Elections should be secure, accessible, and fair — for every eligible voter.',
        ask_line: 'Make a plan to vote and help someone else make theirs.',
      },
    ],
    short_scripts: [
      {
        id: 'sc_canvass_intro',
        channel: 'canvass',
        label: 'Door intro (30s)',
        lines: [
          "Hi, I'm {{name}} with Chris Jones for Congress — quick moment?",
          "We're talking with neighbors about a bigger table: jobs, schools, and health care that works for Arkansas.",
          "Chris focuses on practical bridge-building — I'd love to hear what's on your mind.",
          'Before I go — can we leave info and check if you know your early vote options?',
        ],
        required_pillar_keys: ['jobs_local_economy', 'schools_innovation'],
      },
      {
        id: 'sc_phone_open',
        channel: 'phone',
        label: 'Phone bank open',
        lines: [
          "Hi {{name}}, this is {{volunteer}} calling for Chris Jones for Congress — is now an okay time?",
          "I'm reaching neighbors about Chris's focus on jobs, schools, and accessible health care.",
          'No pressure — if you’d rather get info by email I can note that.',
        ],
        required_pillar_keys: ['families_health', 'jobs_local_economy'],
      },
      {
        id: 'sc_event_host',
        channel: 'event_floor',
        label: 'Event host cue',
        lines: [
          'Thanks for coming — Chris’s campaign is built on listening first.',
          'Tonight is about what matters in your community: jobs, schools, and healthy families.',
          'Grab a volunteer if you want to knock doors or make calls this week.',
        ],
        required_pillar_keys: ['schools_innovation', 'democracy_for_people'],
      },
      {
        id: 'sc_text_nudge',
        channel: 'text',
        label: 'SMS / text nudge',
        lines: [
          "Hi {{name}} — it's {{volunteer}} with Chris Jones. Quick ask: can you make a plan to vote? Happy to share early vote times.",
          'Reply STOP to opt out.',
        ],
        required_pillar_keys: ['democracy_for_people'],
      },
    ],
    rebuttals: [
      {
        id: 'rb_too_political',
        pillar_key: 'democracy_for_people',
        objection: "I don't do politics.",
        response:
          'Totally fair — Chris focuses on practical stuff: schools, jobs, and health care. If those matter, your voice still counts.',
      },
      {
        id: 'rb_waste',
        pillar_key: 'jobs_local_economy',
        objection: 'Politicians never deliver.',
        response:
          "That's why Chris emphasizes measurable, local wins — not slogans. If you’re open, I can share one example from his plan.",
      },
      {
        id: 'rb_party',
        pillar_key: 'democracy_for_people',
        objection: "I'm the other party.",
        response:
          "Respect that — Chris tries to build a bigger table. If there's one issue you'd fix in Arkansas, I'd still love to hear it.",
      },
    ],
    drift_watchlist: [
      'guarantee victory',
      'illegal voters',
      'rigged election',
      'enemy of the people',
      'lock her up',
    ],
  }
}

export function getTalkingPointById(
  framework: CampaignNarrativeFramework,
  id: string,
): TalkingPointDef | undefined {
  return framework.talking_points.find((t) => t.id === id)
}

export function pillarByKey(
  framework: CampaignNarrativeFramework,
  key: string,
): IssuePillarDef | undefined {
  return framework.pillars.find((p) => p.key === key)
}
