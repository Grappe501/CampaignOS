#!/usr/bin/env node
/**
 * Print Supabase migration filenames in apply order (lexicographic = timestamp order).
 */
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve(import.meta.dirname, '..', 'supabase', 'migrations')

if (!fs.existsSync(dir)) {
  console.error('Missing directory:', dir)
  process.exit(1)
}

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

console.log('\nCampaignOS — supabase/migrations (apply in this order):\n')
for (const f of files) {
  console.log(`  ${f}`)
}
console.log('')
