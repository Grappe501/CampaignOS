/**
 * Verifies environment variables for local / CI.
 * Loads `.env` from repo root when present; `process.env` overrides file values.
 */
import fs from 'node:fs'
import path from 'node:path'
import { stdin as input, stdout as output } from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const envPath = path.join(root, '.env')

const CLIENT_REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

const SERVER_SECRET_KEYS = [
  'OPENAI_API_KEY',
  'SENDGRID_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
]

function parseEnvFile(content) {
  /** @type {Record<string, string>} */
  const out = {}
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[k] = val
  }
  return out
}

function isEmpty(v) {
  return v == null || String(v).trim() === ''
}

function isPlaceholderUrl(key, v) {
  if (key !== 'VITE_SUPABASE_URL') return false
  const s = String(v).trim().toLowerCase()
  return (
    !s.startsWith('http') ||
    s.includes('your-project') ||
    s.includes('your_url')
  )
}

function isPlaceholderKey(key, v) {
  if (isEmpty(v)) return true
  const s = String(v).trim().toLowerCase()
  if (s.includes('your_key') || s.includes('changeme')) return true
  if (isPlaceholderUrl(key, v)) return true
  return false
}

function loadMergedEnv() {
  /** @type {Record<string, string>} */
  const fromFile = {}
  if (fs.existsSync(envPath)) {
    Object.assign(fromFile, parseEnvFile(fs.readFileSync(envPath, 'utf8')))
  }
  const merged = { ...fromFile }
  for (const k of [...CLIENT_REQUIRED, ...SERVER_SECRET_KEYS]) {
    if (!isEmpty(process.env[k])) merged[k] = String(process.env[k])
  }
  return { merged, hadFile: fs.existsSync(envPath) }
}

function main() {
  const { merged, hadFile } = loadMergedEnv()

  output.write('\n=== CampaignOS environment check ===\n\n')

  output.write('Client-safe (required for Vite app / Netlify build):\n')
  const clientErrors = []
  for (const k of CLIENT_REQUIRED) {
    const v = merged[k]
    const ok = !isPlaceholderKey(k, v)
    output.write(`  ${ok ? '✓' : '✗'} ${k}\n`)
    if (!ok) clientErrors.push(k)
  }

  output.write('\nServer-only secrets (must never use VITE_ prefix or client code):\n')
  const serverWarnings = []
  for (const k of SERVER_SECRET_KEYS) {
    const v = merged[k]
    const ok = !isEmpty(v)
    output.write(`  ${ok ? '✓' : '○'} ${k} ${ok ? '(set)' : '(empty — OK for UI-only local dev)'}\n`)
    if (!ok) serverWarnings.push(k)
  }

  if (merged.OPENAI_API_KEY && merged.OPENAI_API_KEY.startsWith('sk-')) {
    output.write(
      '\nNote: OPENAI_API_KEY appears set; keep it in Netlify Functions / server only.\n',
    )
  }

  if (!hadFile) {
    output.write(
      `\nNo .env file at ${envPath}. Using process.env only for known keys.\n`,
    )
  }

  if (clientErrors.length) {
    output.write(
      `\nERROR: Missing or placeholder client variables: ${clientErrors.join(', ')}\n`,
    )
    output.write('Fix: run `npm run setup:env` or set them in your environment / Netlify UI.\n\n',
    )
    process.exit(1)
  }

  if (serverWarnings.length) {
    output.write(
      '\nWARN: Some server-only keys are empty. Required when you add Netlify Functions for those integrations.\n\n',
    )
  } else {
    output.write('\nAll listed server-only keys are non-empty.\n\n')
  }

  process.exit(0)
}

main()
