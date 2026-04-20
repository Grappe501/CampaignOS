#!/usr/bin/env node
/**
 * Verifies `.env` for CampaignOS. Required: Supabase VITE_* vars.
 * Optional keys may be empty for local UI-only work.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const envPath = path.join(root, '.env')

const requiredClient = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

const optionalClient = [
  /** Local: point Vite at `netlify dev` functions origin */
  'VITE_NETLIFY_FUNCTIONS_ORIGIN',
]

const optionalServer = [
  'OPENAI_API_KEY',
  'GOOGLE_CIVIC_API_KEY',
  'GOOGLE_API_KEY',
  'OPENCAGE_API_KEY',
  'API_DOT_GOV_KEY',
  'OPENSTATES_API_KEY',
  'FOURSQUARE_API_KEY',
  'NEWSAPI_API_KEY',
  'GUARDIAN_API_KEY',
  'CONGRESS_GOV_API_KEY',
  'SENDGRID_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'GITHUB_PAT',
  'NETLIFY_AUTH_TOKEN',
  'NETLIFY_SITE_ID',
]

const allKeys = [...requiredClient, ...optionalClient, ...optionalServer]

function parseEnvFile(text) {
  /** @type {Record<string, string>} */
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).replace(/\\"/g, '"')
    }
    out[key] = value
  }
  return out
}

function isBadClientValue(key, value) {
  if (!value || !String(value).trim()) return true
  const s = String(value).toLowerCase()
  if (s.includes('your_') || s.includes('placeholder')) return true
  if (key === 'VITE_SUPABASE_URL' && !s.trim().startsWith('http')) return true
  return false
}

if (!fs.existsSync(envPath)) {
  console.error('Missing .env file. Run: npm run setup:env')
  process.exit(1)
}

/** @type {Record<string, string>} */
const env = parseEnvFile(fs.readFileSync(envPath, 'utf8'))
for (const key of allKeys) {
  const fromProc = process.env[key]
  if (fromProc != null && String(fromProc).trim() !== '') {
    env[key] = String(fromProc).trim()
  }
}

let failed = false

console.log('\nRequired client-safe variables:')
for (const key of requiredClient) {
  const value = env[key]
  if (isBadClientValue(key, value)) {
    console.error(`✗ ${key} missing or placeholder`)
    failed = true
  } else {
    console.log(`✓ ${key}`)
  }
}

console.log('\nOptional client variables:')
for (const key of optionalClient) {
  const value = env[key]
  if (!value || !String(value).trim()) {
    console.log(`• ${key} empty`)
  } else {
    console.log(`✓ ${key}`)
  }
}

console.log('\nOptional server-only variables:')
for (const key of optionalServer) {
  const value = env[key]
  if (!value || !String(value).trim()) {
    console.log(`• ${key} empty`)
  } else {
    console.log(`✓ ${key}`)
  }
}

if (env.OPENAI_API_KEY && String(env.OPENAI_API_KEY).startsWith('sk-')) {
  console.log(
    '\nReminder: OPENAI_API_KEY is set — keep it server-side / Netlify Functions only (never VITE_).',
  )
}

if (failed) {
  console.error(
    '\nFix required client variables, then rerun npm run check:env',
  )
  console.error('Tip: npm run setup:env')
  process.exit(1)
}

console.log('\nEnvironment looks good for local frontend development.')
