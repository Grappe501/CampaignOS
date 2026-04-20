# CampaignOS — full build map (for an AI thread)

_Use this document as the primary paste or attachment when starting a new AI session. It maps routes, the main dashboard composition, data hooks, backend migrations, edge functions, and what is scaffolded vs implemented. Regenerate or diff against the repo when anything material changes._

**Repo:** `campaignos` (Vite + React + TypeScript + Supabase + Netlify)  
**Package version:** see root `package.json` (`version` field).  
**Companion artifacts:** `npm run handoff:chatgpt` → `reports/chatgpt-handoff-latest.md` (includes a repo tree appendix); `npm run audit:build` → timestamped reports under `reports/`.

---

## 1. How to brief an AI

Paste or attach **this file** plus, when debugging a feature, the **specific paths** from section 10. Ask the model to respect:

- **Browser:** Supabase **anon** key only (`VITE_SUPABASE_*`). No service-role or OpenAI keys in client bundles.
- **Data:** RLS on Postgres; privileged writes often go through **RPCs** (e.g. voter match, profile ensure), not ad hoc table updates from the client.
- **Deployment:** SPA build output in `dist/`; server logic for Agent Jones and some APIs in `netlify/functions/`.

---

## 2. Stack (short)

| Layer | Choice |
|--------|--------|
| UI | React 19, Vite 8, React Router 7 |
| Auth / DB | Supabase Auth + Postgres (`@supabase/supabase-js`) |
| Hosting / APIs | Netlify (static site + Node functions) |
| Quality | ESLint; `npm run verify` = lint + build |

---

## 3. Routes (`src/App.tsx`)

| Path | Component | Notes |
|------|-----------|--------|
| `/` | redirect | → `/dashboard` if session, else `/login` |
| `/login` | `pages/Login.tsx` | Email/password; dev bypass can mock session |
| `/dashboard` | `pages/Dashboard.tsx` | **Primary volunteer workspace** (full panel grid) |
| `/intern` | `pages/InternDesk.tsx` | **Same as `Dashboard`**; effect scrolls `#intern-desk` for interns |
| `/candidate` | `pages/CandidateDesk.tsx` | **Scaffold** — list + shell only |
| `/coordinator` | `pages/CoordinatorDesk.tsx` | **Scaffold** — list + shell only |
| `*` | redirect | → `/` |

**Navigation:** `AppHeader` includes Dashboard + **Team desk** (`/intern`) for signed-in users (default when `onSignOut` is set). There is **no** header link yet to `/candidate` or `/coordinator` (intentional until those surfaces are real).

---

## 4. Main dashboard composition (`pages/Dashboard.tsx`)

Panels appear **top to bottom** in roughly this order (some are conditional):

1. **Profile & header** — `DashboardHeader` (`scrollId` via identity glyph `dash-identity-title`)
2. **Next step** — `next-step-card`
3. **For every volunteer** — `volunteer-global` (`VolunteerPathCardGrid` + `lib/volunteerDashboardCards.ts`; copy is **scaffold / TODO**)
4. **Team desk** — `intern-desk` — only if `useInternLayer` says intern (`InternDeskContent`)
5. **Mission tasks** — `mission-tasks` — `TaskListCard` + `useVolunteerTasks`
6. **Daily activation** — `daily-activation` — `DailyMissionCard` + `useDailyMission`
7. **Campaign KPIs** — `campaign-kpis` — `CampaignKpisCard`, `LeadershipKpiScaffold` when leadership — `useCampaignKpis`
8. **Get started** — `onboarding-activation` — `OnboardingActivationCard`
9. **Volunteer path** — `onboarding-branch` — only if path not set — `OnboardingBranchCard`
10. **Two-column row:** **Voter status** (`voter-status-card`) + **Workspace snapshot** (`workspace-summary`)
11. **Branch specialty cards** — `branch-specialty` — only if path set and specialty list non-empty (scaffold copy)
12. **Public officials** — `public-officials-card` — if voter matched — `usePublicOfficials`
13. **Power of 5 summary** — `power5-summary`
14. **Split row:** **Power of 5 workspace** (`power5-workspace`) + **Voter lookup** (`voter-workspace`)
15. **Roster exception** — `exception-request` — inside `ExceptionRequestCard` (hidden when matched + no open exception UX)
16. **Tasks & training** — `workspace-cards` — `FirstTaskCard`, `TrainingCard`, placeholders — `useTasks`, `useTraining`

**Workspace dock:** `WorkspaceDock` + `workspaceDockModel.ts` / `workspaceSectionGlyphs.tsx` — right-rail scroll targets; IDs must match panel `scrollId`s.

**Floating assistant:** `FloatingAgentJones` — context from `lib/agentJonesContextV2.ts` (progress slice, Power5, volunteer mission, daily activation, intern layer, campaign goals).

---

## 5. Role model (frontend)

- **`campaign_profiles.primary_role`** drives several features (see `useProfile` / `CampaignProfile`).
- **Intern:** `useInternLayer` enables when `primary_role` normalizes to `intern` (and not dev auth bypass) — pipeline + team desk UI.
- **Leadership / KPI editing:** `useCampaignKpis` exposes `isLeadership` for `LeadershipKpiScaffold`.
- **Candidate / volunteer coordinator:** routes and checklist copy live in **`lib/roleDashboardScaffold.ts`**; pages are stubs — **no role gating** on those routes yet.

---

## 6. Hooks → responsibility (high level)

| Hook | Responsibility |
|------|----------------|
| `useProfile` | `campaign_profiles` row; dev mock overlay |
| `useVoterMatch` | Voter self-match / linked voter display |
| `usePublicOfficials` | Officials data for matched voter |
| `useTasks` / `useTraining` | Structured workspace records |
| `useVolunteerTasks` | Volunteer mission assignments (claim/complete/skip) |
| `useDailyMission` | Daily activation tasks + scoring |
| `useInternLayer` | Intern pipeline rows + Agent Jones intern context |
| `useCampaignKpis` | Campaign KPIs + leadership missions |
| `usePower5Workspace` / `usePower5Propagation` | Power of 5 graph + relays |
| `usePower5Outreach` | Outreach assist (related modals) |
| `useOnboardingBranch` | Persist volunteer path |
| `useExceptionRequest` | Roster exception submit |
| `useHdWorkspace` | “HD” workspace layout flag |
| `useCampaignFooter` | Footer links/content |

---

## 7. Lib engines (where business logic tends to live)

| Area | Files (representative) |
|------|-------------------------|
| Dashboard progression | `dashboardState.ts`, `onboardingEngine.ts`, `onboardingMomentum.ts` |
| Voter / roster | `ensureCampaignProfile.ts`, voter match RPCs via client in hooks |
| Tasks | `taskEngine.ts`, `supervisorTasks.ts`, `volunteerTaskWorkspace.ts`, `taskScoring.ts` |
| Daily activation | `dailyMissionEngine.ts`, `laneScoringEngine.ts`, `rankingEngine.ts` |
| Intern pipeline | `internPipelineEngine.ts` |
| KPIs | `kpiEngine.ts` |
| Power of 5 | `power5Model.ts`, `power5TreeRules.ts`, `power5Stages.ts`, `power5Invites.ts`, `power5ContactStrategy.ts`, `power5Recruitment.ts`, `power5DashboardHints.ts` |
| Agent Jones | `agentJonesContextV2.ts`, `agentJonesBrain.ts`, `agentJonesGuidance.ts`, `api/agentJones.ts`, `agentJonesKnowledge.ts` |
| Public officials API | `api/publicOfficials.ts` (+ Netlify function) |
| Brand / compliance | `brand/chrisJonesForCongress.ts`, `brand/compliance.ts` |
| Dev | `devAuth.ts`, `DevMockDashboardProvider`, dev patches for photo/momentum |

---

## 8. Supabase migrations (apply order = filename sort)

All under `supabase/migrations/`. **Warning:** two files share the prefix `20260420140000_`; lexicographic order runs **`intern_layer_system` before `onboarding_branch_exception`**. If your toolchain sorts only by timestamp, reconcile manually.

| File (sorted) | Theme |
|------|--------|
| `20260418100000_core_campaign_profiles_and_raw_vr.sql` | Core profiles + raw voter file table |
| `20260419120000_voter_match_layer.sql` | Voter match / link layer |
| `20260420140000_intern_layer_system.sql` | Intern pipeline layer |
| `20260420140000_onboarding_branch_exception.sql` | Onboarding branch + exception flow |
| `20260420180000_workspace_tasks_training.sql` | Workspace tasks/training |
| `20260420194000_campaign_brand_and_knowledge_ingestion.sql` | Brand/knowledge storage |
| `20260421140000_fix_signup_triggers_and_profile_pk.sql` | Auth/profile fixes |
| `20260421150000_ensure_profile_rpc_drop_auth_trigger.sql` | `ensure_campaign_profile` RPC |
| `20260422120000_voter_link_profile_sync_and_display_fix.sql` | Voter link sync |
| `20260422180000_auth_audit_trusted_device_scaffold.sql` | Sign-in audit / device scaffold |
| `20260422190000_fix_upsert_unique_constraints.sql` | Constraint fixes |
| `20260424100000_onboarding_welcome_kit_tables.sql` | Welcome kit tables |
| `20260424100001_onboarding_welcome_kit_seed.sql` | Welcome kit seed |
| `20260424120000_onboarding_momentum_profile.sql` | Momentum fields on profile |
| `20260425120000_onboarding_engine_audit_columns.sql` | Onboarding audit columns |
| `20260425140000_profile_photo_storage.sql` | Profile photo storage |
| `20260426100000_power5_relational_engine.sql` | Power of 5 relational core |
| `20260427120000_relational_comms_phase1.sql` | Relational comms phase 1 |
| `20260428140000_power5_propagation_engine.sql` | Propagation/relays |
| `20260429120000_volunteer_coordinator_task_system.sql` | Coordinator task system |
| `20260429140000_volunteer_task_workspace_claim.sql` | Task claim/workspace |
| `20260429160000_daily_activation_engine.sql` | Daily activation |
| `20260429170000_adaptive_daily_activation.sql` | Adaptive daily activation |
| `20260430130000_campaign_kpi_mission_system.sql` | Campaign KPI + missions |

Human notes may also exist in `supabase/README.md` (can lag the file list).

---

## 9. Netlify functions (`netlify/functions/`)

| Function | Role |
|----------|------|
| `agent-jones.ts` | Server-side Agent Jones + optional OpenAI (`OPENAI_API_KEY` in Netlify env, not `VITE_*`) |
| `agent-jones-transcribe.ts` | OpenAI **speech-to-text** for Agent Jones only (`audioBase64` in, `text` out); optional `OPENAI_TRANSCRIPTION_MODEL` (default `whisper-1`) |
| `public-officials.ts` | Server proxy/helper for officials lookups (keys server-side) |
| `signin-audit-context.ts` | Sign-in audit / trusted-device support |

Local dev: optional `VITE_NETLIFY_FUNCTIONS_ORIGIN` to point the client at `netlify dev` (see `scripts/check-env.mjs`).

---

## 10. Environment variables (verified by `npm run check:env`)

**Required (client):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Optional client:** `VITE_NETLIFY_FUNCTIONS_ORIGIN`, `VITE_ENABLE_DEV_AUTH_BYPASS` (and related dev mock vars — see `devAuth.ts`)

**Optional server (Netlify / scripts):** `OPENAI_API_KEY`, civic/data API keys, Twilio, SendGrid, etc. (listed in `scripts/check-env.mjs` — do not expose via `VITE_`).

---

## 11. Implemented vs scaffold (snapshot)

| Surface | Status |
|---------|--------|
| Login + session + `/dashboard` | Implemented |
| Volunteer path, voter match, exception, Power of 5, mission tasks, daily activation, KPIs (read; leadership scaffold) | Largely implemented (iterate as needed) |
| Intern team desk in-dashboard + `/intern` scroll | Implemented (`InternDeskContent`, `useInternLayer`) |
| Global / branch volunteer card grids | **Scaffold** (`volunteerDashboardCards.ts`, placeholder copy) |
| Candidate dashboard (`/candidate`) | **Scaffold** (`CandidateDesk.tsx`, `roleDashboardScaffold.ts`) |
| Coordinator dashboard (`/coordinator`) | **Scaffold** (`CoordinatorDesk.tsx`) |
| Role-based redirect (e.g. auto-send candidate to `/candidate`) | **Not wired** — add when dashboards are real |

---

## 12. Suggested implementation order (for “complete today” role dashboards)

1. **Intern** — align `INTERN_DASHBOARD_SCAFFOLD_SECTIONS` with shipping criteria; confirm RLS/RPC docs; UX polish on `InternDeskContent`.
2. **Volunteer coordinator** — `CoordinatorDesk.tsx`: exception queue, pipeline oversight, mission read-only or actions (reuse `volunteer_coordinator_task_system` migration intent).
3. **Candidate** — `CandidateDesk.tsx`: high-level timeline + read-only KPIs + links into coordinator/intern tools as needed.

---

## 13. Quick file index

| Need | Start here |
|------|------------|
| Change routing | `src/App.tsx` |
| Change volunteer shell layout | `src/pages/Dashboard.tsx` |
| Change dock / scroll IDs | `src/components/workspace/workspaceDockModel.ts`, `workspaceSectionGlyphs.tsx` |
| Change progression rules | `src/lib/dashboardState.ts` |
| Change intern pipeline behavior | `src/lib/internPipelineEngine.ts`, `src/hooks/useInternLayer.ts` |
| Change Agent Jones context | `src/lib/agentJonesContextV2.ts`, `FloatingAgentJones.tsx` |
| Change KPI behavior | `src/hooks/useCampaignKpis.ts`, `src/lib/kpiEngine.ts` |
| Role dashboard TODO lists | `src/lib/roleDashboardScaffold.ts` |

---

_End of build map. For a fresh tree dump + similar narrative, run `npm run handoff:chatgpt`._
