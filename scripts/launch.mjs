#!/usr/bin/env node
/**
 * Foundation pass: install deps, validate env, lint, production build.
 * Does not start servers — see printed "Run" section.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

function run(label, command, args) {
  console.log(`\n── ${label} ──\n`)
  const r = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  })
  if (r.status !== 0 && r.status !== null) {
    process.exit(r.status)
  }
  if (r.error) {
    console.error(r.error)
    process.exit(1)
  }
}

console.log('\n╔══════════════════════════════════════════════════════════╗')
console.log('║  CampaignOS — lift from bottom (bootstrap + verify)      ║')
console.log('╚══════════════════════════════════════════════════════════╝')

run('Install', 'npm', ['install'])
run('Environment check', 'npm', ['run', 'check:env'])
run('Lint', 'npm', ['run', 'lint'])
run('Production build', 'npm', ['run', 'build'])

run('Migration index', 'node', ['scripts/list-migrations.mjs'])

console.log(`
── Database (you run against Supabase) ──

  • Push migrations:  npx supabase@latest link --project-ref <ref>
                      npx supabase@latest db push
  • Or run each file in supabase/migrations/ in SQL Editor (see supabase/README.md).

── Launch app ──

  • Vite only:        npm run dev
  • Functions + UI:   netlify dev   (set VITE_NETLIFY_FUNCTIONS_ORIGIN when using Vite alone)

`)
