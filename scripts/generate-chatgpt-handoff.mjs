#!/usr/bin/env node
/**
 * Generate a single Markdown handoff file for ChatGPT (or any collaborator)
 * summarizing the CampaignOS build: stack, what exists, what is stubbed, migrations,
 * and how to work safely in this repo.
 *
 * Usage:
 *   node scripts/generate-chatgpt-handoff.mjs
 *   node scripts/generate-chatgpt-handoff.mjs --out reports/my-handoff.md
 *   node scripts/generate-chatgpt-handoff.mjs --title "CampaignOS partner brief"
 *   node scripts/generate-chatgpt-handoff.mjs --project "CampaignOS"
 *   node scripts/generate-chatgpt-handoff.mjs --skip-tree
 *   node scripts/generate-chatgpt-handoff.mjs --max-tree-depth 2
 *
 * npm:
 *   npm run handoff:chatgpt
 *
 * Parameters (CLI):
 *   --out <path>           Output file (default: reports/chatgpt-handoff-YYYYMMDD-HHMMSS.md)
 *   --title <string>       H1 title inside the doc (default: derived from --project)
 *   --project <string>     Short project name in intro (default: package.json "name")
 *   --skip-tree            Omit the repository tree appendix
 *   --max-tree-depth <n>   Tree depth for appendix (default: 3)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const IGNORE_DIR = new Set([
  'node_modules',
  'dist',
  '.git',
  '.netlify',
  '.cursor',
  'coverage',
  '.cache',
  '.vite',
])

function parseArgs(argv) {
  const out = { skipTree: false, maxTreeDepth: 3 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--skip-tree') out.skipTree = true
    else if (a === '--out') out.out = argv[++i]
    else if (a === '--title') out.title = argv[++i]
    else if (a === '--project') out.project = argv[++i]
    else if (a === '--max-tree-depth') out.maxTreeDepth = Math.max(0, parseInt(argv[++i], 10) || 3)
  }
  return out
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function listSortedFiles(dir, pred) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(pred)
    .sort((a, b) => a.localeCompare(b))
}

function walkTreeLines(dir, rel, depth, maxDepth, lines) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  const prefix = depth === 0 ? '' : `${'  '.repeat(depth - 1)}├── `
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (IGNORE_DIR.has(ent.name)) {
        if (depth < maxDepth) lines.push(`${prefix}${ent.name}/  [omitted]`)
        continue
      }
      lines.push(`${prefix}${ent.name}/`)
      if (depth + 1 < maxDepth) {
        walkTreeLines(path.join(dir, ent.name), `${rel}/${ent.name}`, depth + 1, maxDepth, lines)
      }
    } else if (depth < maxDepth) {
      lines.push(`${prefix}${ent.name}`)
    }
  }
}

const args = parseArgs(process.argv.slice(2))
const pkg = readJson(path.join(root, 'package.json'))
const projectName = args.project || pkg.name || 'CampaignOS'
const docTitle = args.title || `${projectName} — build handoff for AI / partner`
const defaultOut = path.join(root, 'reports', `chatgpt-handoff-${stamp()}.md`)
const outFile = path.resolve(process.cwd(), args.out || defaultOut)

const migrations = listSortedFiles(path.join(root, 'supabase', 'migrations'), (f) => f.endsWith('.sql'))
const netlifyFns = listSortedFiles(path.join(root, 'netlify', 'functions'), (f) =>
  f.endsWith('.ts'),
)
const pages = listSortedFiles(path.join(root, 'src', 'pages'), (f) => f.endsWith('.tsx'))

const treeLines = []
if (!args.skipTree) {
  walkTreeLines(root, '', 0, args.maxTreeDepth, treeLines)
}

const md = `# ${docTitle}

_Generated: ${new Date().toISOString()} — re-run \`npm run handoff:chatgpt\` before sharing if the repo changed._

## 1. Who this is for

This document onboards **ChatGPT or a human partner** to **${projectName}**: a volunteer campaign workspace (Chris Jones for Congress branding in-repo) with **Supabase** auth/data and **Netlify** hosting/functions. Use it to answer “what’s real vs placeholder,” where logic lives, and what constraints must not be violated.

## 2. Parameters for the AI partner (operating assumptions)

When helping on this codebase, assume:

| Parameter | Value |
|-----------|--------|
| **Client stack** | Vite 8, React 19, TypeScript, React Router 7 |
| **Data / auth** | Supabase (Postgres + Auth + RLS). Browser uses **anon key only** via \`VITE_SUPABASE_*\`. |
| **Secrets** | Never put service-role keys, OpenAI keys, or PII-heavy exports in \`VITE_*\` or the client bundle. OpenAI is server-side (Netlify Function \`agent-jones\`). |
| **Deployment** | Static SPA in \`dist/\`; functions in \`netlify/functions/\`. Node 20 on Netlify. |
| **Primary routes** | \`/\` → redirect; \`/login\` (email/password); \`/dashboard\` (authenticated workspace). |
| **Voter data** | \`raw_vr\` is Arkansas-style voter file shape; matching via **SECURITY DEFINER** RPCs, not direct client table writes where blocked by RLS. |
| **Progression model** | Dashboard state is driven by \`src/lib/dashboardState.ts\` (profile, voter match, exception, onboarding path). Agent Jones copy mirrors the same slices in \`src/lib/agentJonesGuidance.ts\`. |

If a request would bypass RLS, expose secrets in the browser, or store sensitive voter PII in client storage, **push back** and propose a server or RPC path instead.

## 3. What this script recorded (generator parameters)

This file was produced by \`scripts/generate-chatgpt-handoff.mjs\` with:

- **Output:** \`${path.relative(root, outFile).split(path.sep).join('/')}\`
- **Tree appendix:** ${args.skipTree ? 'disabled (\`--skip-tree\`)' : `enabled, max depth **${args.maxTreeDepth}**`}
- **Package version:** ${pkg.version ?? 'n/a'}

## 4. Repository intent (one paragraph)

**${projectName}** is a **volunteer onboarding and workspace shell**: sign-up/sign-in, campaign profile row (\`campaign_profiles\`), optional **voter self-match** against a voter file table, **roster exception** requests, **volunteer path** selection (first step before voter lookup or exception), workspace **task/training** placeholders backed by DB catalog where migrated, **Agent Jones** (deterministic prompts + optional OpenAI via Netlify), sign-in **audit / device fingerprint** scaffolding, and compliance/footer hooks. It is **not** a full CRM, dialer, or live task router yet—many cards are intentional placeholders.

## 5. Stack & tooling (from \`package.json\`)

| Area | Notes |
|------|--------|
| **Build** | \`vite build\` → \`dist/\` |
| **Quality** | \`eslint\`; \`npm run verify\` = lint + build |
| **DB** | SQL migrations in \`supabase/migrations/\`; \`npm run db:list\` prints order |
| **Env** | \`.env\` + \`npm run check:env\`; see \`README.md\` for \`VITE_*\` vs server secrets |
| **Optional** | \`npm run audit:build\` (deeper tree + verify report to \`reports/\`) |

**Dependencies (production):** ${Object.keys(pkg.dependencies || {}).join(', ') || '—'}.

## 6. Routes & main UI surfaces

| Route | Page | Role |
|-------|------|------|
| \`/login\` | \`src/pages/Login.tsx\` | Email/password auth; post-auth profile ensure |
| \`/dashboard\` | \`src/pages/Dashboard.tsx\` | Next step, path selector, voter workspace, exception, training/task cards, Agent Jones FAB |

**Dev-only:** \`VITE_ENABLE_DEV_AUTH_BYPASS\` (see \`src/lib/devAuth.ts\`) mocks session and dashboard slices for UI work without Supabase.

## 7. Database (migrations apply order)

Filenames are authoritative (timestamp prefix). Current list:

${migrations.length ? migrations.map((f) => `- \`supabase/migrations/${f}\``).join('\n') : '- _(no .sql files found)_'}

**Conceptual model (high level):**

- **\`campaign_profiles\`** — one row per auth user; onboarding fields, exception fields, optional \`linked_voter_id\` mirror.
- **\`raw_vr\`** — voter file rows (loaded by ETL / service role, not volunteers).
- **\`voter_match_links\`** — link profile ↔ \`voter_id\`; writes via RPC \`confirm_voter_self_match\` etc.
- **Workspace** — tasks/modules catalog + per-profile progress (see workspace migration).
- **\`ensure_campaign_profile()\`** — RPC to create profile after session (preferred over fragile auth triggers).

For human-readable migration notes, see \`supabase/README.md\` (may lag the file list above).

## 8. Netlify functions

${netlifyFns.length ? netlifyFns.map((f) => `- \`netlify/functions/${f}\``).join('\n') : '- _(none found)_'}

- **\`agent-jones.ts\`** — server-side context + OpenAI; must keep \`OPENAI_API_KEY\` in Netlify env, not \`VITE_*\`.
- **\`signin-audit-context.ts\`** — supports post-auth audit / trusted-device scaffolding.

## 9. What is implemented (substantive)

- Email/password auth and protected dashboard route.
- **Profile bootstrap** (\`ensureCampaignProfile\` RPC) after login.
- **Volunteer path** first, then **voter self-match** (registered path) or **roster exception** (other paths); auto-sets path to registered voter when already matched (avoids redundant path step).
- Voter search UI + RPC-backed confirmation; voter display widget; exception request card.
- Dashboard **progress slices** and **Next step** card; **Agent Jones** panel with slice-aware prompts.
- Workspace **structured** task/training hooks (\`useTasks\`, \`useTraining\`) when DB seeded/migrated.
- Post-auth **audit** hooks and **device fingerprint** client helpers (see migrations under auth audit).
- **Chris Jones** brand constants and knowledge ingestion path (\`scripts/ingest-chris-jones-homepage.ts\`, related migration).

## 10. What is not (yet) / intentional gaps

- **Team** and **Growth path** dashboard tiles are **placeholders** (\`PlaceholderCard\`).
- **Conversational onboarding** — copy in \`dashboardState.ts\` notes cards-only flow; “ships later.”
- **Live task routing** to captains/pods — first-task card is largely deterministic / stand-by messaging.
- **Full training LMS** — modules are scaffolded; “Articulate embeds” and full content pipelines are not the focus of this repo slice.
- **Admin console** for approving exceptions — referenced in volunteer UI; not implemented as a first-class app route in this repo.
- **raw_vr** population — schema exists; **real file load** is external (ETL / service role).
- **Multi-tenant / multi-campaign** — branding and knowledge are campaign-specific in code; not a generic multi-campaign product UI.

## 11. Files the partner should read first

1. \`README.md\` — env, Netlify, security rules  
2. \`src/lib/dashboardState.ts\` — progression truth  
3. \`src/pages/Dashboard.tsx\` — layout order and gating  
4. \`supabase/migrations/*\` — schema + RPCs  
5. \`netlify/functions/agent-jones.ts\` — server AI boundary  

## 12. Suggested verification commands (local)

\`\`\`bash
npm run check:env
npm run verify
npx supabase db push   # if CLI linked to the same project
\`\`\`

## 13. Repository tree (appendix)

${args.skipTree ? '_Omitted (\`--skip-tree\`)._\n' : '```\n' + treeLines.join('\n') + '\n```\n'}

---
_End of handoff. Regenerate with: \`npm run handoff:chatgpt\`_
`

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, md, 'utf8')
console.log(`Wrote ${path.relative(process.cwd(), outFile)}`)
