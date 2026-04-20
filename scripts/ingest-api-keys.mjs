#!/usr/bin/env node
/**
 * Merge optional campaign / civics API keys into `.env` (gitignored).
 * All keys are server-only — never add VITE_ variants.
 *
 * Usage:
 *   npm run ingest:api-keys
 *   node scripts/ingest-api-keys.mjs --merge ./keys.env
 *   node scripts/ingest-api-keys.mjs --print-keys
 *
 * --merge <file>   Append/update keys from KEY=value lines (ignores comments)
 * --print-keys     List supported keys and exit
 * --dry-run        Show what would be written without saving
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const envPath = path.join(root, '.env')

/** @type {{ key: string, label: string, hint: string }[]} */
const CAMPAIGN_API_KEYS = [
  {
    key: 'GOOGLE_CIVIC_API_KEY',
    label: 'Google Civic Information API',
    hint: 'Google Cloud → enable Civic Information API → credentials',
  },
  {
    key: 'GOOGLE_API_KEY',
    label: 'Google API key (Geocoding / Maps / Places as enabled)',
    hint: 'Restrict to only the APIs you turn on',
  },
  {
    key: 'OPENCAGE_API_KEY',
    hint: 'opencagedata.com → API keys',
    label: 'OpenCage Geocoding',
  },
  {
    key: 'API_DOT_GOV_KEY',
    label: 'api.data.gov key',
    hint: 'api.data.gov → sign up (FEC and other federal APIs)',
  },
  {
    key: 'OPENSTATES_API_KEY',
    label: 'Open States / Plural',
    hint: 'openstates.org / pluralpolicy.com API',
  },
  {
    key: 'FOURSQUARE_API_KEY',
    label: 'Foursquare Places',
    hint: 'foursquare.com developer console',
  },
  {
    key: 'NEWSAPI_API_KEY',
    label: 'NewsAPI.org',
    hint: 'newsapi.org API key',
  },
  {
    key: 'GUARDIAN_API_KEY',
    label: 'The Guardian Open Platform',
    hint: 'open-platform.theguardian.com',
  },
  {
    key: 'CONGRESS_GOV_API_KEY',
    label: 'Congress.gov API (v3)',
    hint: 'api.congress.gov → sign up',
  },
]

const KEY_SET = new Set(CAMPAIGN_API_KEYS.map((k) => k.key))

function parseEnvFile(text) {
  /** @type {Map<string, string>} */
  const map = new Map()
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"')
    }
    map.set(key, val)
  }
  return map
}

function escapeEnvValue(val) {
  if (val === '' || val == null) return ''
  const s = String(val)
  if (/[\r\n"#=\s]/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
}

function mask(value) {
  if (!value) return '(empty)'
  const v = String(value)
  if (v.length <= 8) return '*'.repeat(v.length)
  return `${v.slice(0, 4)}…${v.slice(-3)}`
}

function formatEnvPreservingOrder(originalText, map) {
  const lines = originalText.split(/\r?\n/)
  const seen = new Set()
  const out = []

  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) {
      out.push(line)
      continue
    }
    const idx = line.indexOf('=')
    if (idx === -1) {
      out.push(line)
      continue
    }
    const key = line.slice(0, idx).trim()
    if (map.has(key)) {
      seen.add(key)
      out.push(`${key}=${escapeEnvValue(map.get(key) ?? '')}`)
    } else {
      out.push(line)
    }
  }

  const newKeys = [...map.keys()].filter((k) => !seen.has(k))
  if (newKeys.length) {
    if (out.length && out[out.length - 1] !== '') out.push('')
    out.push('# Campaign / civics API keys (ingest-api-keys.mjs)')
    for (const k of newKeys.sort()) {
      out.push(`${k}=${escapeEnvValue(map.get(k) ?? '')}`)
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}

function parseMergeFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const map = parseEnvFile(text)
  /** @type {Record<string, string>} */
  const picked = {}
  for (const key of KEY_SET) {
    if (map.has(key)) picked[key] = map.get(key) ?? ''
  }
  return picked
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const printKeys = args.includes('--print-keys')
const mergeIdx = args.indexOf('--merge')
const mergeFile = mergeIdx !== -1 ? args[mergeIdx + 1] : null

if (printKeys) {
  output.write('Server-only keys (merge into .env / Netlify secrets):\n\n')
  for (const row of CAMPAIGN_API_KEYS) {
    output.write(`  ${row.key}\n    ${row.label}\n    ${row.hint}\n\n`)
  }
  process.exit(0)
}

if (mergeFile) {
  const mergePath = path.resolve(process.cwd(), mergeFile)
  if (!fs.existsSync(mergePath)) {
    console.error(`File not found: ${mergePath}`)
    process.exit(1)
  }
  const merged = parseMergeFile(mergePath)
  const count = Object.keys(merged).length
  if (count === 0) {
    console.error('No recognized CAMPAIGN_API_KEYS found in merge file.')
    process.exit(1)
  }
  let existingText = ''
  if (fs.existsSync(envPath)) {
    existingText = fs.readFileSync(envPath, 'utf8')
  } else {
    existingText =
      '# CampaignOS — local environment (gitignored)\n\n'
  }
  const map = parseEnvFile(existingText)
  for (const [k, v] of Object.entries(merged)) {
    map.set(k, v)
  }
  const next = formatEnvPreservingOrder(existingText || '\n', map)
  if (dryRun) {
    output.write(next)
    process.exit(0)
  }
  fs.writeFileSync(envPath, next, 'utf8')
  output.write(`Merged ${count} key(s) into ${envPath}\n`)
  for (const k of Object.keys(merged).sort()) {
    output.write(`  ${k}: ${mask(merged[k])}\n`)
  }
  process.exit(0)
}

const rl = readline.createInterface({ input, output })

function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve))
}

async function interactive() {
  output.write('\nCampaignOS — ingest API keys (server-only, writes .env)\n')
  output.write(`File: ${envPath}\n`)
  output.write('Enter to skip a key; paste value to set/update.\n\n')

  let existingText = ''
  if (fs.existsSync(envPath)) {
    existingText = fs.readFileSync(envPath, 'utf8')
  } else {
    existingText =
      '# CampaignOS — local environment (gitignored). Add Supabase via npm run setup:env\n\n'
    output.write(`(New file) Creating ${envPath} with header comment.\n`)
  }
  const map = parseEnvFile(existingText)

  for (const row of CAMPAIGN_API_KEYS) {
    const cur = map.get(row.key) ?? ''
    output.write(`${'─'.repeat(56)}\n`)
    output.write(`${row.label}\n${row.key}\n${row.hint}\n`)
    output.write(`Current: ${cur ? mask(cur) : '(empty)'}\n`)
    const line = await ask(`Value (Enter to keep/skip): `)
    const trimmed = String(line).trim()
    if (trimmed !== '') {
      map.set(row.key, trimmed)
      output.write(`  → set ${row.key} (${mask(trimmed)})\n`)
    } else {
      output.write(`  → unchanged\n`)
    }
  }

  const next = formatEnvPreservingOrder(existingText || '\n', map)
  if (dryRun) {
    output.write('\n[dry-run] Would write:\n---\n')
    output.write(next)
    rl.close()
    return
  }

  fs.writeFileSync(envPath, next, 'utf8')
  output.write(`\nSaved ${envPath}\n`)
  output.write('Reminder: add the same keys to Netlify → Site → Environment variables for functions.\n')
  rl.close()
}

interactive().catch((err) => {
  console.error(err)
  try {
    rl.close()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
