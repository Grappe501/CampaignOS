export type CampaignBrandToken = {
  key: string
  value: string
  category: 'color' | 'font' | 'spacing' | 'other'
  source: { url: string; note?: string }
}

export type CampaignCta = {
  key: string
  label: string
  url: string
  kind: 'primary' | 'secondary' | 'form' | 'donate' | 'volunteer' | 'learn_more'
}

export type CampaignPublicKnowledge = {
  campaignSlug: string
  campaignName: string
  slogan: string
  heroLines: string[]
  navigationLabels: string[]
  shortBio: string
  issuePillars: { key: string; title: string; summary: string }[]
  ctas: CampaignCta[]
  contact: {
    addressLabel?: string
    addressUrl?: string
  }
  social: { platform: string; label: string; url: string }[]
  assets: {
    logoPrimaryUrl: string
    logoAltUrl?: string
    candidateHeadshotUrl?: string
    heroImageUrl?: string
    ogImageUrl?: string
  }
  tokens: CampaignBrandToken[]
  sources: { homepageUrl: string; cssTokenUrl: string }
}

/**
 * Seed-safe, public-only campaign knowledge pulled from the public homepage.
 * Source of truth: https://chrisjonesforcongress.com/
 */
export const CHRIS_JONES_FOR_CONGRESS_PUBLIC: CampaignPublicKnowledge = {
  campaignSlug: 'chris-jones-for-congress',
  campaignName: 'Chris Jones for Congress',
  slogan: 'A Bigger Table. A Brighter Future.',
  heroLines: [
    'I’m a bridge builder, a fighter for us, and a visionary for the future of Arkansas.',
    'Our campaign is about expanding opportunity, strengthening our communities, and proving that when Arkansans come together, we can fly.',
  ],
  navigationLabels: ['Home', 'Meet Chris', 'Store'],
  shortBio:
    'Chris Jones grew up in Pine Bluff as the son of a minister, grounded in service and community. His path led to science, but his work has stayed focused on Arkansas — building bridges across differences and fighting for stronger schools, good-paying jobs, and accessible healthcare.',
  issuePillars: [
    {
      key: 'jobs_local_economy',
      title: 'Jobs & Local Economy',
      summary:
        'Build an economy that lifts every community: good jobs, fair wages, small business growth, high-quality internet access, and rural hospitals that stay open.',
    },
    {
      key: 'families_health',
      title: 'Families & Health',
      summary:
        'Help families thrive: stronger schools, comprehensive maternal health support, addiction support and recovery, and food security as the foundation for healthy communities.',
    },
    {
      key: 'schools_innovation',
      title: 'Schools & Innovation',
      summary:
        'Invest in people: early childhood education, hands-on apprenticeships, and training in technology and the trades to prepare Arkansas for tomorrow.',
    },
    {
      key: 'democracy_for_people',
      title: 'Democracy for the People',
      summary:
        'Protect our voice: fair maps, secure and accessible elections, a government you can trust, and leaders who listen.',
    },
  ],
  ctas: [
    {
      key: 'get_to_know_me',
      label: 'Get to Know Me',
      url: 'https://chrisjonesforcongress.com/about/',
      kind: 'learn_more',
    },
    {
      key: 'join_campaign',
      label: "I'm in!",
      url: 'https://chrisjonesforcongress.com/',
      kind: 'form',
    },
    {
      key: 'volunteer',
      label: 'Volunteer',
      url: 'https://chrisjonesforcongress.com/volunteer/',
      kind: 'volunteer',
    },
    {
      key: 'donate',
      label: 'Donate',
      url: 'https://chrisjonesforcongress.com/donate/',
      kind: 'donate',
    },
  ],
  contact: {
    addressLabel: 'P.O. Box 21803, Little Rock, AR 72221',
    addressUrl: 'https://chrisjonesforcongress.com/contact-us/',
  },
  social: [
    {
      platform: 'facebook',
      label: 'Facebook',
      url: 'https://chrisjonesforcongress.com/facebook/',
    },
    { platform: 'x', label: 'X', url: 'https://chrisjonesforcongress.com/x/' },
    {
      platform: 'instagram',
      label: 'Instagram',
      url: 'https://chrisjonesforcongress.com/instagram/',
    },
  ],
  assets: {
    logoPrimaryUrl:
      'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/Jones-Logo-H-Orange-White.svg',
    logoAltUrl:
      'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/Jones-Logo-V-Blue-Orange.svg',
    candidateHeadshotUrl:
      'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/jones-headshot-2-scaled.png',
    heroImageUrl:
      'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/Mobile-Hero-Image.png',
    ogImageUrl:
      'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/Jones_SocialShare_OG.png',
  },
  tokens: [
    {
      key: 'color.primary',
      value: '#2B3984',
      category: 'color',
      source: {
        url: 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398',
        note: '--e-global-color-primary',
      },
    },
    {
      key: 'color.secondary',
      value: '#4F69B2',
      category: 'color',
      source: {
        url: 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398',
        note: '--e-global-color-secondary',
      },
    },
    {
      key: 'color.accent',
      value: '#EDA356',
      category: 'color',
      source: {
        url: 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398',
        note: '--e-global-color-accent',
      },
    },
    {
      key: 'color.ink',
      value: '#010323',
      category: 'color',
      source: {
        url: 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398',
        note: '--e-global-color-ee8dd69',
      },
    },
    {
      key: 'color.paper',
      value: '#F7F0E4',
      category: 'color',
      source: {
        url: 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398',
        note: '--e-global-color-3198f64',
      },
    },
    {
      key: 'color.soft',
      value: '#ECEFF9',
      category: 'color',
      source: {
        url: 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398',
        note: '--e-global-color-5fe1912',
      },
    },
    {
      key: 'font.ui',
      value:
        '"Manrope", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      category: 'font',
      source: {
        url: 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398',
        note: 'Buttons use Manrope; site uses GT America families (not broadly available).',
      },
    },
  ],
  sources: {
    homepageUrl: 'https://chrisjonesforcongress.com/',
    cssTokenUrl:
      'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398',
  },
}

