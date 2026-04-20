import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

type SeedShape = Record<string, unknown>
type SeedToken = { category: string; key: string; value: string } & Record<string, unknown>
type SeedMessage = { kind: string; text: string; sortOrder?: number } & Record<string, unknown>
type SeedSocialLink = { platform: string; label: string; url: string; handle?: string | null } & Record<string, unknown>
type SeedContactPoint = { kind: string; label: string; value: string; url?: string | null } & Record<string, unknown>
type SeedBioFact = { fact: string; sortOrder?: number } & Record<string, unknown>
type SeedIssuePillar = { key: string; title: string; summary: string } & Record<string, unknown>
type SeedCta = { key: string; label: string; url: string; kind?: string; sortOrder?: number } & Record<string, unknown>

type SeedFile = {
  campaignSlug?: string
  campaignName?: string
  source?: { homepageUrl?: string; cssTokenUrl?: string; fetchedAt?: string } & Record<string, unknown>
  assets?: Record<string, unknown>
  tokens?: SeedToken[]
  messages?: SeedMessage[]
  navigationLabels?: string[]
  bioFacts?: SeedBioFact[]
  issuePillars?: SeedIssuePillar[]
  ctas?: SeedCta[]
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

function normalizeSpace(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

type KnowledgeChunk = {
  index: number
  text: string
  tags: string[]
}

type KnowledgeSeed = {
  campaignSlug: string
  sourceUrl: string
  title: string
  fetchedAt: string
  contentText: string
  tags: string[]
  chunks: KnowledgeChunk[]
}

function buildKnowledgeSeedFromHomepage(seed: SeedFile): KnowledgeSeed | null {
  const slug = safeTrim(seed.campaignSlug)
  const sourceUrl = safeTrim(seed.source?.homepageUrl) || 'https://chrisjonesforcongress.com/'
  if (!slug) return null

  const slogan = (seed.messages ?? []).find((m) => m.kind === 'slogan')?.text ?? ''
  const heroLines = (seed.messages ?? [])
    .filter((m) => m.kind === 'hero')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((m) => m.text)
    .filter(Boolean)

  const bio = (seed.bioFacts ?? [])
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((b) => b.fact)
    .filter(Boolean)

  const issues = (seed.issuePillars ?? []).map((p) => ({
    title: p.title,
    summary: p.summary,
  }))

  const ctas = (seed.ctas ?? [])
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((c) => `${c.label} — ${c.url}`)
    .filter(Boolean)

  const contact = (seed.contactPoints ?? []).map((c) => `${c.label}: ${c.value}`).filter(Boolean)
  const social = (seed.socialLinks ?? []).map((s) => `${s.label}: ${s.url}`).filter(Boolean)

  const parts: string[] = []
  if (slogan) parts.push(`Slogan: ${slogan}`)
  if (heroLines.length) parts.push(`Hero: ${heroLines.join(' ')}`)
  if (bio.length) parts.push(`Bio: ${bio.join(' ')}`)
  if (issues.length) {
    parts.push(
      `Issues: ${issues
        .map((i) => `${i.title} — ${i.summary}`)
        .join(' ')}`,
    )
  }
  if (ctas.length) parts.push(`CTAs: ${ctas.join(' | ')}`)
  if (contact.length) parts.push(`Contact: ${contact.join(' | ')}`)
  if (social.length) parts.push(`Social: ${social.join(' | ')}`)

  const contentText = normalizeSpace(parts.join('\n\n'))

  const chunks: KnowledgeChunk[] = []
  let idx = 0
  const push = (text: string, tags: string[]) => {
    const t = normalizeSpace(text)
    if (!t) return
    chunks.push({ index: idx++, text: t, tags })
  }

  if (slogan) push(slogan, ['slogan', 'hero', 'branding'])
  for (const line of heroLines.slice(0, 4)) push(line, ['hero', 'messaging'])
  if (bio.length) push(bio.join(' '), ['bio', 'meet-chris'])
  for (const i of issues.slice(0, 8)) push(`${i.title}: ${i.summary}`, ['issues', i.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')])
  for (const c of (seed.ctas ?? []).slice(0, 8)) {
    push(`${c.label} — ${c.url}`, ['cta', (c.kind ?? 'other')])
  }
  for (const c of (seed.contactPoints ?? []).slice(0, 8)) {
    push(`${c.label}: ${c.value}${c.url ? ` (${c.url})` : ''}`, ['contact', c.kind])
  }
  for (const s of (seed.socialLinks ?? []).slice(0, 8)) {
    push(`${s.label}: ${s.url}`, ['social', s.platform])
  }

  const tagSet = new Set<string>()
  for (const c of chunks) {
    for (const t of c.tags) {
      const x = safeTrim(t).toLowerCase()
      if (x) tagSet.add(x)
    }
  }

  return {
    campaignSlug: slug,
    sourceUrl,
    title: 'Homepage',
    fetchedAt: new Date().toISOString(),
    contentText,
    tags: Array.from(tagSet).sort(),
    chunks,
  }
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
  const headshot =
    pickFirstMatch(/src="([^"]+chris-footer-683x1024\.jpg)"/i, html) ||
    pickFirstMatch(/src="([^"]+chris-footer\.jpg)"/i, html) ||
    pickFirstMatch(/src="([^"]+jones-headshot[^"]+\.png)"/i, html)
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
  const knowledgePath = path.resolve(
    root,
    'scripts/ingestion/chris-jones-homepage.knowledge.seed.json',
  )
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
  const knowledge = buildKnowledgeSeedFromHomepage(seed)
  if (knowledge) {
    await writeFile(knowledgePath, JSON.stringify(knowledge, null, 2) + '\n', 'utf8')
  }
  process.stdout.write(`Updated seed: ${seedPath}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

