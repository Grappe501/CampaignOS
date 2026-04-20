#!/usr/bin/env node
/**
 * Maps the project root (excluding heavy/ignored dirs), runs env + verify checks,
 * and writes a Markdown report with the master build plan and current status.
 *
 * Usage:
 *   node scripts/audit-build.mjs
 *   node scripts/audit-build.mjs --skip-verify    # tree + env only (no lint/build)
 *   node scripts/audit-build.mjs --out reports/custom.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const IGNORE_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.netlify',
  '.cursor',
  'coverage',
  '.cache',
  '.vite',
])

const IGNORE_FILE_NAMES = new Set(['.DS_Store'])

/** @type {Set<string>} */
const args = new Set(process.argv.slice(2))
const skipVerify = args.has('--skip-verify')
let outPath = null
const outIdx = process.argv.indexOf('--out')
if (outIdx !== -1 && process.argv[outIdx + 1]) {
  outPath = path.resolve(process.cwd(), process.argv[outIdx + 1])
}

function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

/**
 * @param {string} dir
 * @param {string} rel
 * @param {number} depth
 * @param {number} maxDepth  print tree only up to this depth; always recurse for stats
 * @param {string[]} lines
 * @param {{ files: number, dirs: number, byExt: Record<string, number> }} stats
 */
function walk(dir, rel, depth, maxDepth, lines, stats) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))

  const prefix = depth === 0 ? '' : '  '.repeat(depth - 1)
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(ent.name)) {
        if (depth <= maxDepth) {
          lines.push(`${prefix}${depth ? '├── ' : ''}${ent.name}/  [skipped]`)
        }
        continue
      }
      stats.dirs++
      if (depth <= maxDepth) {
        lines.push(`${prefix}${depth ? '├── ' : ''}${ent.name}/`)
      }
      walk(
        path.join(dir, ent.name),
        path.join(rel, ent.name),
        depth + 1,
        maxDepth,
        lines,
        stats,
      )
    } else {
      if (IGNORE_FILE_NAMES.has(ent.name)) continue
      stats.files++
      const ext = path.extname(ent.name) || '(no ext)'
      stats.byExt[ext] = (stats.byExt[ext] || 0) + 1
      if (depth <= maxDepth) {
        lines.push(`${prefix}${depth ? '├── ' : ''}${ent.name}`)
      }
    }
  }
}

/**
 * Full recursive file list under `dir` (for stats), respecting IGNORE_DIR_NAMES.
 * @param {string} dir
 * @param {string} baseRel
 * @param {{ byExt: Record<string, number>, count: number }} acc
 */
function countFiles(dir, baseRel, acc) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    const rel = path.join(baseRel, ent.name)
    if (ent.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(ent.name)) continue
      countFiles(path.join(dir, ent.name), rel, acc)
    } else {
      if (IGNORE_FILE_NAMES.has(ent.name)) continue
      acc.count++
      const ext = path.extname(ent.name) || '(no ext)'
      acc.byExt[ext] = (acc.byExt[ext] || 0) + 1
    }
  }
}

function runNpm(script) {
  const r = spawnSync('npm', ['run', script], {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    env: process.env,
  })
  const stdout = r.stdout || ''
  const stderr = r.stderr || ''
  return {
    ok: r.status === 0,
    status: r.status,
    out: stdout.slice(-4000) + (stderr ? `\n${stderr.slice(-2000)}` : ''),
  }
}

function git(args) {
  const r = spawnSync('git', args, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
  })
  return (r.stdout || '').trim()
}

function listFilesRecursive(relDir, filter) {
  const full = path.join(root, relDir)
  if (!fs.existsSync(full)) return []
  /** @type {string[]} */
  const out = []
  function walkD(d, prefix) {
    const entries = fs.readdirSync(d, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const ent of entries) {
      const p = path.join(d, ent.name)
      const rel = path.join(prefix, ent.name)
      if (ent.isDirectory()) {
        if (IGNORE_DIR_NAMES.has(ent.name)) continue
        walkD(p, rel)
      } else if (!filter || filter(ent.name)) {
        out.push(rel.replace(/\\/g, '/'))
      }
    }
  }
  walkD(full, '')
  return out
}

function statusLine(ok, label) {
  return ok ? `- **${label}:** PASS` : `- **${label}:** FAIL`
}

// --- Master build plan (aligned with README + repo conventions) ---
const MASTER_BUILD_PLAN = `
## Master build plan (bottom-up)

CampaignOS is built in layers. Each phase depends on the ones below.

| Phase | Goal | Repo / commands |
|-------|------|-----------------|
| **1. Toolchain** | Node 20+, npm, Vite, TypeScript, ESLint | \`package.json\`, \`npm install\` |
| **2. Database** | Schema, RLS, RPCs, seeds | \`supabase/migrations/*.sql\`, \`supabase/seed.sql\`, \`db push\` / SQL Editor |
| **3. Environment** | Client-safe Supabase URL + anon key; optional Functions origin | \`.env\`, \`npm run check:env\` |
| **4. Application** | React routes, auth, dashboard, Agent Jones UI | \`src/\` |
| **5. Serverless** | Netlify Functions (e.g. Agent Jones + OpenAI) | \`netlify/functions/\`, secrets on Netlify only |
| **6. Deploy** | Static build + functions | \`netlify.toml\`, \`npm run build\` → \`dist/\` |
| **7. Verify** | Repeatable quality gate | \`npm run verify\` (= lint + build), \`npm run launch\` (full lift) |

**Operational loop:** migrate → env → \`npm run dev\` or \`netlify dev\` → PR previews on Netlify.
`.trim()

function main() {
  process.chdir(root)

  const pkg = readJson(path.join(root, 'package.json'))

  /** @type {string[]} */
  const treeLines = []
  const treeStats = { files: 0, dirs: 0, byExt: /** @type {Record<string, number>} */ ({}) }
  walk(root, '', 0, 4, treeLines, treeStats)

  const srcAcc = { byExt: {}, count: 0 }
  countFiles(path.join(root, 'src'), 'src', srcAcc)

  const migrations = listFilesRecursive('supabase/migrations', (n) => n.endsWith('.sql')).sort()
  const netlifyFns = listFilesRecursive('netlify/functions', (n) =>
    /\.(ts|js|mjs)$/.test(n),
  )
  const pages = listFilesRecursive('src/pages', (n) => n.endsWith('.tsx'))
  const components = listFilesRecursive('src/components', (n) => /\.(tsx|ts)$/.test(n))

  const gitBranch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || '(not a git repo)'
  const gitShort = git(['rev-parse', '--short', 'HEAD']) || '—'
  const gitDirty = git(['status', '--porcelain'])
  const isDirty = Boolean(gitDirty)

  let envCheck = { ok: false, out: '(not run)' }
  let lint = { ok: false, out: '(not run)' }
  let build = { ok: false, out: '(not run)' }

  if (!skipVerify) {
    envCheck = runNpm('check:env')
    lint = runNpm('lint')
    build = runNpm('build')
  } else {
    const r = runNpm('check:env')
    envCheck = r
  }

  const nodeModulesExists = fs.existsSync(path.join(root, 'node_modules'))
  const distExists = fs.existsSync(path.join(root, 'dist'))

  const reportPath =
    outPath ||
    path.join(root, 'reports', `build-audit-${nowStamp()}.md`)

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })

  const md = `# CampaignOS — build audit report

_Generated: ${new Date().toISOString()} · root: \`${root.replace(/\\/g, '/')}\`_

## Summary

| Check | Result |
|-------|--------|
| \`node_modules\` present | ${nodeModulesExists ? 'yes' : 'no'} |
| \`dist/\` present (last build artifact) | ${distExists ? 'yes' : 'no'} |
| \`npm run check:env\` | ${envCheck.ok ? 'PASS' : 'FAIL'} |
${skipVerify ? '| `npm run lint` | skipped (`--skip-verify`) |\n| `npm run build` | skipped (`--skip-verify`) |\n' : `| \`npm run lint\` | ${lint.ok ? 'PASS' : 'FAIL'} |\n| \`npm run build\` | ${build.ok ? 'PASS' : 'FAIL'} |\n`}
| Git working tree | ${isDirty ? 'dirty (uncommitted changes)' : 'clean'} |
| Last commit | \`${gitShort}\` on \`${gitBranch}\` |

### Phase checklist (where you are)

${statusLine(nodeModulesExists, 'Phase 1 — Dependencies installed')}
${statusLine(envCheck.ok, 'Phase 3 — Environment (.env) valid for client')}
${skipVerify ? '- **Phase 4 — Lint:** skipped\n- **Phase 4 — Production build:** skipped\n' : `${statusLine(lint.ok, 'Phase 4 — ESLint')}\n${statusLine(build.ok, 'Phase 4 — Vite production build')}\n`}
- **Phase 2 — Database:** ${migrations.length} migration file(s) in repo (apply to Supabase separately via CLI or SQL Editor)
- **Phase 5 — Netlify Functions:** ${netlifyFns.length} function source file(s) under \`netlify/functions/\`
- **Phase 6 — Deploy:** \`netlify.toml\` present; publish dir \`dist\` after \`npm run build\`

---

${MASTER_BUILD_PLAN}

---

## Project fingerprint

| Field | Value |
|-------|-------|
| **name** | ${pkg.name} |
| **version** | ${pkg.version} |
| **type** | ${pkg.type || 'commonjs'} |
| **dependencies** | ${Object.keys(pkg.dependencies || {}).length} |
| **devDependencies** | ${Object.keys(pkg.devDependencies || {}).length} |

### npm scripts

\`\`\`json
${JSON.stringify(pkg.scripts, null, 2)}
\`\`\`

### Application surface (quick)

| Area | Count |
|------|------:|
| \`src/pages\` (tsx) | ${pages.length} |
| \`src/components\` | ${components.length} |
| \`supabase/migrations\` | ${migrations.length} |
| \`netlify/functions\` | ${netlifyFns.length} |

### Routes (from \`src/App.tsx\`)

- \`/\` → redirect to dashboard or login
- \`/login\` → Login
- \`/dashboard\` → Dashboard (auth required)
- \`*\` → redirect to \`/\`

---

## Directory map (depth ≤ 4, ignored dirs shown as \`[skipped]\`)

\`\`\`
${treeLines.join('\n')}
\`\`\`

_Tree scan counts files only at listed depth; see statistics below for full \`src/\` counts._

### \`src/\` file extensions (full tree, no depth cap)

| Extension | Files |
|-----------|------:|
${Object.entries(srcAcc.byExt)
  .sort((a, b) => b[1] - a[1])
  .map(([ext, n]) => `| \`${ext}\` | ${n} |`)
  .join('\n')}

**Total files under \`src/\`:** ${srcAcc.count}

---

## Supabase migrations (filename order)

${migrations.map((m) => `- \`${m}\``).join('\n')}

---

## Netlify functions

${netlifyFns.length ? netlifyFns.map((f) => `- \`${f}\``).join('\n') : '_None found._'}

---

## Command output (truncated)

### check:env

\`\`\`
${envCheck.out || '(empty)'}
\`\`\`

${
  skipVerify
    ? '_Lint and build were skipped._\n'
    : `### lint

\`\`\`
${lint.out || '(empty)'}
\`\`\`

### build

\`\`\`
${build.out || '(empty)'}
\`\`\`
`
}

---

_Report written by \`scripts/audit-build.mjs\`. Re-run: \`npm run audit:build\` (add \`--skip-verify\` for a fast tree-only report)._
`

  fs.writeFileSync(reportPath, md, 'utf8')
  console.log(`\nWrote: ${reportPath}\n`)

  const failed = !envCheck.ok || (!skipVerify && (!lint.ok || !build.ok))
  process.exit(failed ? 1 : 0)
}

main()
