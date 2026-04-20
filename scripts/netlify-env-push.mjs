/**
 * Optional: push variables from local `.env` to Netlify using the Netlify CLI.
 * Requires: Netlify CLI (`npm i -g netlify-cli`) and `netlify login` + linked site (`netlify link`).
 *
 * Does not print secret values. Writes a temp env file and runs `netlify env:import`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const envPath = path.join(root, '.env')

const KEYS_TO_PUSH = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
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

function netlifyCliArgs() {
  const win = process.platform === 'win32'
  const direct = spawnSync('netlify', ['--version'], {
    encoding: 'utf8',
    shell: win,
  })
  if (direct.status === 0) return { cmd: 'netlify', shell: win }
  const npx = spawnSync('npx', ['--yes', 'netlify', '--version'], {
    encoding: 'utf8',
    shell: win,
  })
  if (npx.status === 0) return { cmd: 'npx', argsPrefix: ['--yes', 'netlify'], shell: win }
  return null
}

async function main() {
  if (!fs.existsSync(envPath)) {
    console.error(`No .env at ${envPath}. Run npm run setup:env first.`)
    process.exit(1)
  }

  const cli = netlifyCliArgs()
  if (!cli) {
    console.error(
      'Netlify CLI not found. Install: https://docs.netlify.com/cli/get-started/\nThen: netlify login && netlify link',
    )
    process.exit(1)
  }

  const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'))
  const lines = []
  for (const k of KEYS_TO_PUSH) {
    const v = parsed[k]
    if (v == null || String(v).trim() === '') continue
    lines.push(`${k}=${v}`)
  }

  if (!lines.length) {
    console.error('No non-empty values to push from .env for known keys.')
    process.exit(1)
  }

  output.write(
    '\nThis will import the following keys to your linked Netlify site (values not shown):\n',
  )
  for (const line of lines) {
    output.write(`  - ${line.split('=')[0]}\n`)
  }

  const rl = readline.createInterface({ input, output })
  let ans
  try {
    ans = await rl.question('\nType YES to continue: ')
  } finally {
    rl.close()
  }

  if (String(ans).trim() !== 'YES') {
    output.write('Aborted.\n')
    process.exit(1)
    return
  }

  const tmp = path.join(root, '.netlify-env-import.tmp')
  fs.writeFileSync(tmp, `${lines.join('\n')}\n`, 'utf8')

  const args =
    cli.argsPrefix != null
      ? [...cli.argsPrefix, 'env:import', tmp]
      : ['env:import', tmp]

  const r = spawnSync(cli.cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: cli.shell,
  })

  try {
    fs.unlinkSync(tmp)
  } catch {
    /* ignore */
  }

  process.exit(r.status === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
