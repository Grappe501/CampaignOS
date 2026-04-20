import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

type SeedShape = Record<string, unknown>
type SeedToken = { category: string; key: string; value: string } & Record<string, unknown>
type SeedMessage = { kind: string; text: string; sortOrder?: number } & Record<string, unknown>
type SeedSocialLink = { platform: string; label: string; url: string; handle?: string | null } & Record<string, unknown>
type SeedContactPoint = { kind: string; label: string; value: string; url?: string | null } & Record<string, unknown>

type SeedFile = {
  campaignSlug?: string
  campaignName?: string
  source?: { homepageUrl?: string; cssTokenUrl?: string; fetchedAt?: string } & Record<string, unknown>
  assets?: Record<string, unknown>
  tokens?: SeedToken[]
  messages?: SeedMessage[]
  navigationLabels?: string[]
  socialLinks?: SeedSocialLink[]
  contactPoints?: SeedContactPoint[]
} & SeedShape

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function ensureString(x: unknown): string {
  if (typeof x === 'string') return x
  return String(x ?? '')
}

function safeTrim(x: unknown): string {
  return ensureString(x).trim()
}

function pickFirstMatch(re: RegExp, text: string): string | null {
  const m = re.exec(text)
  return m?.[1]?.trim() ?? null
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'CampaignOS-ingestor/1.0 (public-content)' },
  })
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} ${res.statusText} for ${url}`)
  }
  return await res.text()
}

function extractTokensFromCss(css: string) {
  const kit = pickFirstMatch(/\.elementor-kit-96\{([^}]*)\}/, css) ?? ''
  const get = (key: string) => {
    const m = new RegExp(`${key}:\\s*([^;]+);`, 'i').exec(kit)
    return m?.[1]?.trim() ?? null
  }
  return {
    primary: get('--e-global-color-primary'),
    secondary: get('--e-global-color-secondary'),
    accent: get('--e-global-color-accent'),
    ink: get('--e-global-color-ee8dd69'),
    paper: get('--e-global-color-3198f64'),
    soft: get('--e-global-color-5fe1912'),
    buttonBg: pickFirstMatch(/background-color:\s*(#[0-9a-fA-F]{3,8})\s*;/, kit),
    buttonFont: pickFirstMatch(/font-family:\s*"([^"]+)"\s*,/i, kit),
  }
}

function extractHomepagePieces(html: string) {
  const slogan = pickFirstMatch(
    /"description":"([^"]*A Bigger Table[^"]*)"/i,
    html,
  )
  const ogImage = pickFirstMatch(/property="og:image"\s+content="([^"]+)"/i, html)
  const twitterSite = pickFirstMatch(/name="twitter:site"\s+content="([^"]+)"/i, html)
  const logoPrimaryUrl = pickFirstMatch(/src="([^"]+Jones-Logo-H-Orange-White\.svg)"/i, html)
  const headshot = pickFirstMatch(/src="([^"]+jones-headshot[^"]+\.png)"/i, html)
  const heroImage = pickFirstMatch(/src="([^"]+Mobile-Hero-Image\.png)"/i, html)
  const addressLabel = pickFirstMatch(/>(P\.O\.\s*Box\s*21803,\s*Little Rock,\s*AR\s*72221)</i, html)
  const addressUrl = pickFirstMatch(/href="([^"]+\/contact-us\/)"/i, html)

  const navLabels = Array.from(html.matchAll(/class="menu-item[^"]*"[^>]*>\s*<a[^>]*>\s*([^<]{1,40})\s*<\/a>/gi))
    .map((m) => safeTrim(m[1]))
    .filter(Boolean)
  const uniqueNav = Array.from(new Set(navLabels)).slice(0, 8)

  return {
    slogan,
    ogImage,
    twitterSite,
    logoPrimaryUrl,
    headshot,
    heroImage,
    addressLabel,
    addressUrl,
    navigationLabels: uniqueNav.length ? uniqueNav : undefined,
  }
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const seedPath = path.resolve(root, 'scripts/ingestion/chris-jones-homepage.seed.json')
  const seedRaw = await readFile(seedPath, 'utf8')
  const seed = JSON.parse(seedRaw) as SeedFile

  const homepageUrl =
    safeTrim(seed.source?.homepageUrl) || 'https://chrisjonesforcongress.com/'
  const cssTokenUrl =
    safeTrim(seed.source?.cssTokenUrl) ||
    'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398'

  const [html, css] = await Promise.all([fetchText(homepageUrl), fetchText(cssTokenUrl)])
  const pieces = extractHomepagePieces(html)
  const tokens = extractTokensFromCss(css)

  seed.source = {
    homepageUrl,
    cssTokenUrl,
    fetchedAt: new Date().toISOString(),
  }

  seed.assets = {
    ...(isRecord(seed.assets) ? seed.assets : {}),
    ...(pieces.logoPrimaryUrl ? { logoPrimaryUrl: pieces.logoPrimaryUrl } : {}),
    ...(pieces.headshot ? { candidateHeadshotUrl: pieces.headshot } : {}),
    ...(pieces.heroImage ? { heroImageUrl: pieces.heroImage } : {}),
    ...(pieces.ogImage ? { ogImageUrl: pieces.ogImage } : {}),
  }

  if (Array.isArray(seed.tokens)) {
    const map = new Map<string, SeedToken>()
    for (const t of seed.tokens) {
      map.set(`${t.category}:${t.key}`, t)
    }
    const up = (key: string, value: string | null) => {
      if (!value) return
      const item = map.get(`color:${key}`)
      if (item) item.value = value
    }
    up('primary', tokens.primary)
    up('secondary', tokens.secondary)
    up('accent', tokens.accent)
    up('ink', tokens.ink)
    up('paper', tokens.paper)
    up('soft', tokens.soft)
    const fontItem = map.get('font:ui')
    if (fontItem && tokens.buttonFont) {
      fontItem.value = `${tokens.buttonFont} (site button font) + system sans fallback`
    }
  }

  if (pieces.slogan) {
    const existing = Array.isArray(seed.messages) ? seed.messages : []
    seed.messages = existing.map((m) =>
      m.kind === 'slogan' ? { ...m, text: pieces.slogan } : m,
    )
  }

  if (Array.isArray(pieces.navigationLabels) && pieces.navigationLabels.length) {
    seed.navigationLabels = pieces.navigationLabels
  }

  if (pieces.twitterSite && Array.isArray(seed.socialLinks)) {
    const hasX = seed.socialLinks.some((s) => safeTrim(s.platform) === 'x')
    if (hasX) {
      seed.socialLinks = seed.socialLinks.map((s) =>
        safeTrim(s.platform) === 'x' ? { ...s, handle: pieces.twitterSite } : s,
      )
    }
  }

  if (pieces.addressLabel && Array.isArray(seed.contactPoints)) {
    seed.contactPoints = seed.contactPoints.map((c) =>
      safeTrim(c.kind) === 'mailing_address'
        ? {
            ...c,
            value: pieces.addressLabel,
            ...(pieces.addressUrl ? { url: pieces.addressUrl } : {}),
          }
        : c,
    )
  }

  await writeFile(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8')
  process.stdout.write(`Updated seed: ${seedPath}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

