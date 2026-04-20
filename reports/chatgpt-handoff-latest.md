# campaignos — build handoff for AI / partner

_Generated: 2026-04-20T08:54:45.417Z — re-run `npm run handoff:chatgpt` before sharing if the repo changed._

## 1. Who this is for

This document onboards **ChatGPT or a human partner** to **campaignos**: a volunteer campaign workspace (Chris Jones for Congress branding in-repo) with **Supabase** auth/data and **Netlify** hosting/functions. Use it to answer “what’s real vs placeholder,” where logic lives, and what constraints must not be violated.

## 2. Parameters for the AI partner (operating assumptions)

When helping on this codebase, assume:

| Parameter | Value |
|-----------|--------|
| **Client stack** | Vite 8, React 19, TypeScript, React Router 7 |
| **Data / auth** | Supabase (Postgres + Auth + RLS). Browser uses **anon key only** via `VITE_SUPABASE_*`. |
| **Secrets** | Never put service-role keys, OpenAI keys, or PII-heavy exports in `VITE_*` or the client bundle. OpenAI is server-side (Netlify Function `agent-jones`). |
| **Deployment** | Static SPA in `dist/`; functions in `netlify/functions/`. Node 20 on Netlify. |
| **Primary routes** | `/` → redirect; `/login` (email/password); `/dashboard` (authenticated workspace). |
| **Voter data** | `raw_vr` is Arkansas-style voter file shape; matching via **SECURITY DEFINER** RPCs, not direct client table writes where blocked by RLS. |
| **Progression model** | Dashboard state is driven by `src/lib/dashboardState.ts` (profile, voter match, exception, onboarding path). Agent Jones copy mirrors the same slices in `src/lib/agentJonesGuidance.ts`. |

If a request would bypass RLS, expose secrets in the browser, or store sensitive voter PII in client storage, **push back** and propose a server or RPC path instead.

## 3. What this script recorded (generator parameters)

This file was produced by `scripts/generate-chatgpt-handoff.mjs` with:

- **Output:** `reports\chatgpt-handoff-latest.md`
- **Tree appendix:** enabled, max depth **3**
- **Package version:** 0.1.0

## 4. Repository intent (one paragraph)

**campaignos** is a **volunteer onboarding and workspace shell**: sign-up/sign-in, campaign profile row (`campaign_profiles`), optional **voter self-match** against a voter file table, **roster exception** requests, **volunteer path** selection (first step before voter lookup or exception), workspace **task/training** placeholders backed by DB catalog where migrated, **Agent Jones** (deterministic prompts + optional OpenAI via Netlify), sign-in **audit / device fingerprint** scaffolding, and compliance/footer hooks. It is **not** a full CRM, dialer, or live task router yet—many cards are intentional placeholders.

## 5. Stack & tooling (from `package.json`)

| Area | Notes |
|------|--------|
| **Build** | `vite build` → `dist/` |
| **Quality** | `eslint`; `npm run verify` = lint + build |
| **DB** | SQL migrations in `supabase/migrations/`; `npm run db:list` prints order |
| **Env** | `.env` + `npm run check:env`; see `README.md` for `VITE_*` vs server secrets |
| **Optional** | `npm run audit:build` (deeper tree + verify report to `reports/`) |

**Dependencies (production):** @supabase/supabase-js, react, react-dom, react-router-dom.

## 6. Routes & main UI surfaces

| Route | Page | Role |
|-------|------|------|
| `/login` | `src/pages/Login.tsx` | Email/password auth; post-auth profile ensure |
| `/dashboard` | `src/pages/Dashboard.tsx` | Next step, path selector, voter workspace, exception, training/task cards, Agent Jones FAB |

**Dev-only:** `VITE_ENABLE_DEV_AUTH_BYPASS` (see `src/lib/devAuth.ts`) mocks session and dashboard slices for UI work without Supabase.

## 7. Database (migrations apply order)

Filenames are authoritative (timestamp prefix). Current list:

- `supabase/migrations/20260418100000_core_campaign_profiles_and_raw_vr.sql`
- `supabase/migrations/20260419120000_voter_match_layer.sql`
- `supabase/migrations/20260420140000_onboarding_branch_exception.sql`
- `supabase/migrations/20260420180000_workspace_tasks_training.sql`
- `supabase/migrations/20260420194000_campaign_brand_and_knowledge_ingestion.sql`
- `supabase/migrations/20260421140000_fix_signup_triggers_and_profile_pk.sql`
- `supabase/migrations/20260421150000_ensure_profile_rpc_drop_auth_trigger.sql`
- `supabase/migrations/20260422120000_voter_link_profile_sync_and_display_fix.sql`
- `supabase/migrations/20260422180000_auth_audit_trusted_device_scaffold.sql`
- `supabase/migrations/20260422190000_fix_upsert_unique_constraints.sql`

**Conceptual model (high level):**

- **`campaign_profiles`** — one row per auth user; onboarding fields, exception fields, optional `linked_voter_id` mirror.
- **`raw_vr`** — voter file rows (loaded by ETL / service role, not volunteers).
- **`voter_match_links`** — link profile ↔ `voter_id`; writes via RPC `confirm_voter_self_match` etc.
- **Workspace** — tasks/modules catalog + per-profile progress (see workspace migration).
- **`ensure_campaign_profile()`** — RPC to create profile after session (preferred over fragile auth triggers).

For human-readable migration notes, see `supabase/README.md` (may lag the file list above).

## 8. Netlify functions

- `netlify/functions/agent-jones.ts`
- `netlify/functions/signin-audit-context.ts`

- **`agent-jones.ts`** — server-side context + OpenAI; must keep `OPENAI_API_KEY` in Netlify env, not `VITE_*`.
- **`signin-audit-context.ts`** — supports post-auth audit / trusted-device scaffolding.

## 9. What is implemented (substantive)

- Email/password auth and protected dashboard route.
- **Profile bootstrap** (`ensureCampaignProfile` RPC) after login.
- **Volunteer path** first, then **voter self-match** (registered path) or **roster exception** (other paths); auto-sets path to registered voter when already matched (avoids redundant path step).
- Voter search UI + RPC-backed confirmation; voter display widget; exception request card.
- Dashboard **progress slices** and **Next step** card; **Agent Jones** panel with slice-aware prompts.
- Workspace **structured** task/training hooks (`useTasks`, `useTraining`) when DB seeded/migrated.
- Post-auth **audit** hooks and **device fingerprint** client helpers (see migrations under auth audit).
- **Chris Jones** brand constants and knowledge ingestion path (`scripts/ingest-chris-jones-homepage.ts`, related migration).

## 10. What is not (yet) / intentional gaps

- **Team** and **Growth path** dashboard tiles are **placeholders** (`PlaceholderCard`).
- **Conversational onboarding** — copy in `dashboardState.ts` notes cards-only flow; “ships later.”
- **Live task routing** to captains/pods — first-task card is largely deterministic / stand-by messaging.
- **Full training LMS** — modules are scaffolded; “Articulate embeds” and full content pipelines are not the focus of this repo slice.
- **Admin console** for approving exceptions — referenced in volunteer UI; not implemented as a first-class app route in this repo.
- **raw_vr** population — schema exists; **real file load** is external (ETL / service role).
- **Multi-tenant / multi-campaign** — branding and knowledge are campaign-specific in code; not a generic multi-campaign product UI.

## 11. Files the partner should read first

1. `README.md` — env, Netlify, security rules  
2. `src/lib/dashboardState.ts` — progression truth  
3. `src/pages/Dashboard.tsx` — layout order and gating  
4. `supabase/migrations/*` — schema + RPCs  
5. `netlify/functions/agent-jones.ts` — server AI boundary  

## 12. Suggested verification commands (local)

```bash
npm run check:env
npm run verify
npx supabase db push   # if CLI linked to the same project
```

## 13. Repository tree (appendix)

```
.env
.env.example
.git/  [omitted]
.gitignore
.netlify/  [omitted]
dist/  [omitted]
eslint.config.js
index.html
netlify/
├── functions/
  ├── .gitkeep
  ├── agent-jones.ts
  ├── signin-audit-context.ts
netlify.toml
node_modules/  [omitted]
package-lock.json
package.json
public/
├── favicon.svg
├── icons.svg
README.md
reports/
├── build-audit-20260420-030001.md
├── build-audit-20260420-030215.md
├── build-audit-20260420-030421.md
scripts/
├── audit-build.mjs
├── check-env.mjs
├── generate-chatgpt-handoff.mjs
├── ingest-chris-jones-homepage.ts
├── ingestion/
  ├── chris-jones-homepage.knowledge.seed.json
  ├── chris-jones-homepage.seed.json
├── launch.mjs
├── list-migrations.mjs
├── netlify-env-push.mjs
├── setup-env.mjs
src/
├── App.css
├── App.tsx
├── assets/
  ├── hero.png
  ├── react.svg
  ├── vite.svg
├── brand/
  ├── chrisJonesForCongress.ts
  ├── compliance.ts
├── components/
  ├── agentJones/
  ├── AgentJones.tsx
  ├── AgentJonesPanel.tsx
  ├── AppFooter.tsx
  ├── AppHeader.tsx
  ├── ApplicationUseNotice.tsx
  ├── dashboard/
  ├── DevModeBanner.tsx
  ├── DevStateSwitcher.tsx
  ├── FloatingAgentJones.tsx
  ├── VoterMatchForm.tsx
  ├── VoterWidget.tsx
  ├── WorkspaceDock.tsx
├── context/
  ├── devMockDashboardContext.ts
  ├── DevMockDashboardProvider.tsx
├── hooks/
  ├── useCampaignFooter.ts
  ├── useDevMockDashboard.ts
  ├── useExceptionRequest.ts
  ├── useOnboardingBranch.ts
  ├── useProfile.ts
  ├── useTasks.ts
  ├── useTraining.ts
  ├── useVoterMatch.ts
├── index.css
├── lib/
  ├── agentJonesBrain.ts
  ├── agentJonesContext.ts
  ├── agentJonesContextV2.ts
  ├── agentJonesGuidance.ts
  ├── agentJonesKnowledge.ts
  ├── agentJonesSessionStorage.ts
  ├── api/
  ├── campaignKnowledge.ts
  ├── dashboardState.ts
  ├── devAuth.ts
  ├── deviceFingerprint.ts
  ├── ensureCampaignProfile.ts
  ├── postAuthAudit.ts
  ├── recordSignInAudit.ts
  ├── supabaseClient.ts
  ├── voterMatch.ts
  ├── workspaceStructured.ts
├── main.tsx
├── pages/
  ├── Dashboard.tsx
  ├── Login.tsx
├── styles/
  ├── app-layout.css
├── vite-env.d.ts
supabase/
├── .temp/
  ├── cli-latest
  ├── gotrue-version
  ├── linked-project.json
  ├── pooler-url
  ├── postgres-version
  ├── project-ref
  ├── rest-version
  ├── storage-migration
  ├── storage-version
├── config.toml
├── migrations/
  ├── 20260418100000_core_campaign_profiles_and_raw_vr.sql
  ├── 20260419120000_voter_match_layer.sql
  ├── 20260420140000_onboarding_branch_exception.sql
  ├── 20260420180000_workspace_tasks_training.sql
  ├── 20260420194000_campaign_brand_and_knowledge_ingestion.sql
  ├── 20260421140000_fix_signup_triggers_and_profile_pk.sql
  ├── 20260421150000_ensure_profile_rpc_drop_auth_trigger.sql
  ├── 20260422120000_voter_link_profile_sync_and_display_fix.sql
  ├── 20260422180000_auth_audit_trusted_device_scaffold.sql
  ├── 20260422190000_fix_upsert_unique_constraints.sql
├── README.md
├── seed.sql
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
```


---
_End of handoff. Regenerate with: `npm run handoff:chatgpt`_
