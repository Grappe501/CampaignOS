#!/usr/bin/env node
/**
 * Merge CampaignOS env keys into `.env` (gitignored). Covers everything in `.env.example`.
 *
 * Usage:
 *   npm run ingest:api-keys
 *   npm run ingest:api-keys -- --dry-run
 *   npm run ingest:api-keys -- --print-keys
 *   npm run ingest:api-keys -- --merge ./keys.env
 *   npm run ingest:api-keys -- --set GOOGLE_CIVIC_API_KEY=your_key --set OPENAI_API_KEY=sk-...
 *
 * --merge <file>     KEY=value lines (comments ignored); only known keys are applied
 * --set KEY=value    Set one key (repeatable). Value may be quoted.
 * --print-keys       List keys + hints, then exit
 * --dry-run          Print resulting .env without writing
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const envPath = path.join(root, '.env')

/** @type {{ key: string, label: string, hint: string }[]} */
const ENV_INGEST_SPEC = [
  {
    key: 'VITE_SUPABASE_URL',
    label: 'Supabase project URL',
    hint: 'Supabase → Project Settings → API → Project URL',
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    label: 'Supabase anon (public) key',
    hint: 'Supabase → Project Settings → API → anon public',
  },
  {
    key: 'VITE_ENABLE_DEV_AUTH_BYPASS',
    label: 'Dev auth bypass (local only)',
    hint: 'true | empty — never use in production',
  },
  {
    key: 'VITE_DEV_MOCK_DASHBOARD_STATE',
    label: 'Dev mock dashboard state',
    hint: 'unmatched | matched_no_branch | exception_pending | matched_ready',
  },
  {
    key: 'VITE_NETLIFY_FUNCTIONS_ORIGIN',
    label: 'Netlify functions origin (local)',
    hint: 'e.g. http://localhost:8888 when using netlify dev + Vite',
  },
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI',
    hint: 'platform.openai.com — server-only; never VITE_',
  },
  {
    key: 'GOOGLE_CIVIC_API_KEY',
    label: 'Google Civic Information API',
    hint: 'Google Cloud → enable Civic Information API → API key',
  },
  {
    key: 'GOOGLE_API_KEY',
    label: 'Google Cloud API key (Maps / Geocoding / Places)',
    hint: 'Restrict key to APIs you enable',
  },
  {
    key: 'OPENCAGE_API_KEY',
    label: 'OpenCage Geocoding',
    hint: 'opencagedata.com → API keys',
  },
  {
    key: 'API_DOT_GOV_KEY',
    label: 'api.data.gov',
    hint: 'api.data.gov signup (FEC etc. per service docs)',
  },
  {
    key: 'OPENSTATES_API_KEY',
    label: 'Open States / Plural',
    hint: 'openstates.org / Plural API',
  },
  {
    key: 'FOURSQUARE_API_KEY',
    label: 'Foursquare Places',
    hint: 'foursquare.com developer console',
  },
  {
    key: 'NEWSAPI_API_KEY',
    label: 'NewsAPI.org',
    hint: 'newsapi.org',
  },
  {
    key: 'GUARDIAN_API_KEY',
    label: 'The Guardian Open Platform',
    hint: 'open-platform.theguardian.com',
  },
  {
    key: 'CONGRESS_GOV_API_KEY',
    label: 'Congress.gov API v3',
    hint: 'api.congress.gov',
  },
  {
    key: 'SENDGRID_API_KEY',
    label: 'SendGrid',
    hint: 'SendGrid → Settings → API Keys',
  },
  {
    key: 'TWILIO_ACCOUNT_SID',
    label: 'Twilio Account SID',
    hint: 'Twilio Console → Account Info',
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    label: 'Twilio Auth Token',
    hint: 'Twilio Console — keep server-only',
  },
  {
    key: 'TWILIO_PHONE_NUMBER',
    label: 'Twilio sending number',
    hint: 'E.164 e.g. +15555555555',
  },
  {
    key: 'GITHUB_PAT',
    label: 'GitHub personal access token',
    hint: 'GitHub → Settings → Developer settings → PATs',
  },
  {
    key: 'NETLIFY_AUTH_TOKEN',
    label: 'Netlify personal access token',
    hint: 'Netlify → User → Applications → Personal access tokens',
  },
  {
    key: 'NETLIFY_SITE_ID',
    label: 'Netlify site / project ID',
    hint: 'Site → Project configuration → General',
  },
]

const KEY_SET = new Set(ENV_INGEST_SPEC.map((k) => k.key))

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
    out.push('# Keys merged via scripts/ingest-api-keys.mjs')
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

/** @type {Record<string, string>} */
function parseSetArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--set' && argv[i + 1]) {
      const raw = String(argv[i + 1])
      const eq = raw.indexOf('=')
      if (eq === -1) {
        console.error(`--set expects KEY=value, got: ${raw}`)
        process.exit(1)
      }
      const key = raw.slice(0, eq).trim()
      let val = raw.slice(eq + 1)
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!KEY_SET.has(key)) {
        console.error(`Unknown key: ${key}. Use --print-keys for the list.`)
        process.exit(1)
      }
      out[key] = val
      i++
    }
  }
  return out
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const printKeys = args.includes('--print-keys')
const mergeIdx = args.indexOf('--merge')
const mergeFile = mergeIdx !== -1 ? args[mergeIdx + 1] : null
const setPairs = parseSetArgs(args)

if (printKeys) {
  output.write('Known keys (from .env.example scope — safe to merge into .env):\n\n')
  let lastPrefix = ''
  for (const row of ENV_INGEST_SPEC) {
    const prefix = row.key.startsWith('VITE_') ? 'Client (Vite)' : row.key === 'OPENAI_API_KEY' ? 'AI' : row.key.startsWith('GOOGLE') || row.key === 'OPENCAGE_API_KEY' || row.key === 'API_DOT_GOV_KEY' || row.key === 'OPENSTATES_API_KEY' || row.key === 'FOURSQUARE_API_KEY' || row.key === 'NEWSAPI_API_KEY' || row.key === 'GUARDIAN_API_KEY' || row.key === 'CONGRESS_GOV_API_KEY' ? 'Civics / data' : row.key.startsWith('TWILIO') || row.key === 'SENDGRID_API_KEY' ? 'Comms' : row.key.startsWith('NETLIFY') || row.key === 'GITHUB_PAT' ? 'DevOps' : 'Other'
    if (prefix !== lastPrefix) {
      output.write(`\n── ${prefix} ──\n`)
      lastPrefix = prefix
    }
    output.write(`  ${row.key}\n    ${row.label}\n    ${row.hint}\n`)
  }
  output.write(
    '\nCommands: npm run ingest:api-keys  |  --merge file.env  |  --set KEY=val\n',
  )
  process.exit(0)
}

function applyUpdates(/** @type {Record<string, string>} */ updates, label) {
  const count = Object.keys(updates).length
  if (count === 0) {
    console.error(`No keys to apply (${label}).`)
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
  for (const [k, v] of Object.entries(updates)) {
    map.set(k, v)
  }
  const next = formatEnvPreservingOrder(existingText || '\n', map)
  if (dryRun) {
    output.write(`[dry-run] Would write ${count} key(s) to ${envPath}:\n---\n`)
    output.write(next)
    process.exit(0)
  }
  fs.writeFileSync(envPath, next, 'utf8')
  output.write(`Merged ${count} key(s) into ${envPath}\n`)
  for (const k of Object.keys(updates).sort()) {
    output.write(`  ${k}: ${mask(updates[k])}\n`)
  }
  output.write(
    '\nReminder: mirror server-only secrets in Netlify → Site → Environment variables.\n',
  )
}

if (mergeFile) {
  const mergePath = path.resolve(process.cwd(), mergeFile)
  if (!fs.existsSync(mergePath)) {
    console.error(`File not found: ${mergePath}`)
    process.exit(1)
  }
  const merged = parseMergeFile(mergePath)
  applyUpdates(merged, 'merge file')
  process.exit(0)
}

if (Object.keys(setPairs).length > 0) {
  applyUpdates(setPairs, '--set')
  process.exit(0)
}

const rl = readline.createInterface({ input, output })

function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve))
}

async function interactive() {
  output.write('\nCampaignOS — ingest environment keys (writes .env)\n')
  output.write(`File: ${envPath}\n`)
  output.write(
    'Enter to skip each key (keeps existing). Paste to set/update. Ctrl+C to abort.\n\n',
  )

  let existingText = ''
  if (fs.existsSync(envPath)) {
    existingText = fs.readFileSync(envPath, 'utf8')
  } else {
    existingText =
      '# CampaignOS — local environment (gitignored). See also: npm run setup:env\n\n'
    output.write(`(New file) Creating ${envPath} with header comment.\n`)
  }
  const map = parseEnvFile(existingText)

  for (const row of ENV_INGEST_SPEC) {
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
  output.write(
    'Next: npm run check:env   |   Netlify: copy server-only keys to site env\n',
  )
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
