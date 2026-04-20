# Campaign dashboard inventory & role architecture (master blueprint)

**Status:** Planning only — no implementation requirements in this document.  
**Purpose:** Single engineering reference for growing the volunteer-first dashboard into a full role-based campaign operating system.  
**Grounding:** `src/App.tsx`, `src/lib/roleHomeRouting.ts`, `src/lib/roleDashboardScaffold.ts`, `src/lib/kpiEngine.ts` (`isCampaignLeadershipRole`), `src/pages/Dashboard.tsx`, desk pages, `src/hooks/useProfile.ts` (`campaign_profiles.primary_role`).

---

## 1. Dashboard family map (current repo)

| Route | Page / shell | Maturity | Role tie-in today |
|--------|----------------|----------|-------------------|
| `/` | `RoleHomeRedirect` → `getRoleHomePath(primary_role)` | **Shipped** | Intern → `/intern`, candidate → `/candidate`, coordinator / `volunteer_coordinator` → `/coordinator`, else `/dashboard`. |
| `/dashboard` | `Dashboard.tsx` — full workspace grid | **Shipped** | Default home; contains voter path, missions, daily activation, KPIs (read), Power of 5, Agent Jones, optional `InternDeskContent` when `useInternLayer` treats user as intern. |
| `/intern` | `InternDesk.tsx` → same `Dashboard` | **Shipped** | Route hint + scroll to `#intern-desk`; same data hooks as dashboard. |
| `/candidate` | `CandidateDesk.tsx` | **Shipped (deepening)** | Leadership KPIs, health snapshot, ops links; `isCampaignLeadershipRole` includes `candidate` for KPI scaffold. |
| `/coordinator` | `CoordinatorDesk.tsx` | **Shipped (deepening)** | Supervisor missions, intern overview RPC, activation, KPIs; no route-level gate — any signed-in user can open URL. |
| `/power5` | `Power5Desk.tsx` | **Shipped** | Focused relational organizing surface; not role-routed from `/` today. |
| `/login` | `Login.tsx` | **Shipped** | Post-login still navigates to `/dashboard` in one code path; `/` uses role redirect when session exists. |

**Gaps called out in repo**

- **No server-enforced desk access:** `/candidate` and `/coordinator` are not restricted by `primary_role` in the router (product decision pending).
- **`isCampaignLeadershipRole`** today: `candidate`, `coordinator`, `staff`, `admin` — used for KPI target tooling, not for desk routing.
- **`getPrimaryRoleHomeBucket`** today: `intern`, `candidate`, `coordinator` (+ `volunteer_coordinator` alias), else `default` → `/dashboard`.

---

## 2. Recommended hierarchy (four layers)

| Layer | Campaign function | Typical desks |
|--------|-------------------|---------------|
| **Executive / command** | Narrative, goals, cross-functional risk | Candidate (principal), future **Admin / CM** command views |
| **Operations / management** | Programs, staffing, compliance handoffs, KPI ownership | Campaign manager, assistant campaign manager, events coordinator (program), **Volunteer coordinator** (field ops bridge) |
| **Field leadership** | Geography + team accountability | County lead, precinct captain, lead contact (relationship lead) |
| **Field execution** | Tasks, voter contact, events execution | Volunteer, **intern** |

This grouping informs **header summaries** (executive = KPI + clock + risk; field = my tasks + my geography) and **“what needs attention”** (escalations bubble up by layer).

---

## 3. Canonical role list & naming convention

**Store in `campaign_profiles.primary_role`:** lowercase **snake_case** (matches `normalizePrimaryRoleKey` in `roleHomeRouting.ts`).

| Canonical slug | Display label (UI) | Notes |
|----------------|-------------------|--------|
| `admin` | Admin | System / campaign configuration; future desk. |
| `campaign_manager` | Campaign manager | HQ operations lead; future desk. |
| `assistant_campaign_manager` | Assistant campaign manager | Deputy ops; can share CM shell v1. |
| `candidate` | Candidate | Principal; desk: `/candidate`. |
| `volunteer_coordinator` | Volunteer coordinator | Alias already mapped to coordinator home; desk: `/coordinator`. |
| `coordinator` | Coordinator | Short form; same bucket as `volunteer_coordinator` for routing. |
| `events_coordinator` | Events coordinator | Program owner; may share ops shell initially. |
| `county_lead` | County lead | Geography lead; future desk. |
| `precinct_captain` | Precinct captain | Sub-geography lead; future desk. |
| `lead_contact` | Lead contact | Relationship / organizing lead; future desk or volunteer+ scope. |
| `intern` | Intern | Desk: `/intern` (and intern panel on `/dashboard`). |
| `volunteer` | Volunteer | Default; desk: `/dashboard`. |
| `staff` | Staff | Already treated as leadership for KPI tools; desk TBD (often CM or coordinator). |

**Avoid:** free-text roles in routing logic; use slug + optional `role_tags` / secondary dimensions in a later schema discussion (out of scope here).

---

## 4. Role inventory (full campaign set)

Columns: **Role** → **Purpose in hierarchy** → **Primary user** → **Desk strategy** → **Primary data domains** (read/write as product allows; RLS not specified here).

| Role | Purpose | Primary user | Desk strategy | Data domains |
|------|---------|--------------|---------------|--------------|
| **admin** | Platform integrity, access, integrations | HQ tech / admin | **Unique v2**; v1 can share **read-only command strip** with CM | Profiles, audit, feature flags, integration health |
| **campaign_manager** | Run the program: staffing, vendors, timeline | Campaign manager | **Unique desk** (command + ops queue) | KPIs, tasks across teams, events calendar, escalations |
| **assistant_campaign_manager** | Executes CM priorities, owns workstreams | ACM | **Share CM shell** v1 with scoped widgets | Same as CM, filtered by assignment |
| **candidate** | Principal narrative, priorities, visibility | Candidate / principal | **`/candidate`** (exists) | Election clock, KPI window, leadership attention, links to field |
| **volunteer_coordinator** / **coordinator** | Team mission oversight, intern pipeline pairing | Field coordinator | **`/coordinator`** (exists) | Supervisor assignments, intern overview, activation, KPIs |
| **events_coordinator** | Events pipeline, capacity, volunteer shifts | Events lead | **Share ops shell** with CM v1 OR extend coordinator | Events, shifts, RSVPs, task handoffs |
| **county_lead** | County-wide field outcomes | County lead | **New desk** or **volunteer shell + geography scope** | County metrics, captains, escalations |
| **precinct_captain** | Precinct accountability | Captain | **New desk** or **volunteer shell + precinct scope** | Precinct roster hints, tasks, reporting |
| **lead_contact** | Relational organizing / Power of 5 depth | Lead / super-volunteer | **`/dashboard` + `/power5`** v1; optional light “lead” strip | Power of 5, follow-ups, mission tasks |
| **intern** | Pipeline execution, supervised tasks | Intern | **`/intern`** + intern layer on dashboard | Intern RPCs, volunteer tasks, pipeline |
| **volunteer** | Core field + training + missions | Volunteer | **`/dashboard`** | Voter path, missions, daily activation, training |

---

## 5. Desk-by-desk summary (proposed & existing)

### 5.1 Volunteer workspace — `/dashboard` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | Single place for roster clearance, missions, daily work, Power of 5, voter tools. |
| **Top sections** | Identity, next step, path cards, missions, daily activation, KPIs, onboarding, voter/Power of 5, exception, training/tasks, optional intern embed. |
| **Reuse** | `DashboardGrid`, `WorkspaceDock`, `CampaignKpisCard`, `TaskListCard`, `useVolunteerTasks`, `useDailyMission`, `usePower5Workspace`, `FloatingAgentJones`. |
| **Header summary** | Roster slice, role label, optional countdown. |
| **What needs attention** | `NextStepCard`, exception status, unmatched voter, mission/daily hints — already patterned in `dashboardState` / cards. |

### 5.2 Team desk — `/intern` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | Intern-first entry; same shell as dashboard with queue focus. |
| **Top sections** | `InternDeskContent` (pipeline + mission tasks). |
| **Reuse** | Entire `Dashboard` composition + intern hooks. |
| **Header summary** | Same as dashboard; Agent Jones `surface: intern_desk`. |
| **What needs attention** | Overdue first contact, pipeline counts — already in intern layer context. |

### 5.3 Campaign leadership — `/candidate` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | Executive health, KPI narrative, election phase, links to coordinator/intern/volunteer. |
| **Top sections** | Health snapshot, election phase, metric balance, attention areas, KPI detail, leadership scaffold, ops tiles. |
| **Reuse** | `CampaignKpisCard`, `LeadershipKpiScaffold`, `campaignClock`, `useCampaignKpis`, `FloatingAgentJones` (`candidate_desk`). |
| **Header summary** | Phase + KPI count / error state. |
| **What needs attention** | Derived bullets from KPIs + pipeline flags (no fabricated queues). |

### 5.4 Coordination — `/coordinator` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | Supervised volunteer missions, intern pipeline signals, dispatch when scoped. |
| **Top sections** | Snapshot, attention, exceptions framing, pipeline, activation, mission board, dispatch, KPIs. |
| **Reuse** | KPI cards, leadership scaffold, supervisor task libs, intern overview parse. |
| **Header summary** | Bucket counts, scope warnings. |
| **What needs attention** | Blocked/overdue assignments, escalated pipelines, missing supervisor scope. |

### 5.5 Power of 5 focus — `/power5` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | Deep relational organizing workspace. |
| **Reuse** | Power5 components; link from volunteer and lead roles. |
| **Desk strategy** | Not a separate “role home” today; keep as module until lead_contact needs a home route. |

### 5.6 Command / operations — `/command` or `/hq` (proposed, not in repo)

| Item | Content |
|------|---------|
| **Core purpose** | CM + ACM + events coordinator: cross-team task queue, event readiness, staffing. |
| **Top sections** | Today’s priorities, event timeline, escalations from field, KPI strip (read), people requests. |
| **Reuse** | `CampaignKpisCard` (read), patterns from coordinator “attention” list, future shared **OpsAttentionStrip** component. |
| **Shell** | **Share one “operations shell”** for CM, ACM, events_coordinator in v1 with role-based module flags. |

### 5.7 Admin — `/admin` (proposed, not in repo)

| Item | Content |
|------|---------|
| **Core purpose** | Access control, integration status, safe support actions (product-defined). |
| **Reuse** | Minimal; new layout; link out to Supabase dashboard for superuser tasks. |
| **Shell** | **Unique** when real controls exist; v0 could be a stub + docs links only. |

### 5.8 Geography leadership — `/field` or `/county` + `/precinct` (proposed)

| Item | Content |
|------|---------|
| **Core purpose** | County lead / precinct captain: rollup of teams, escalations, goals by geo. |
| **Reuse** | Volunteer dashboard **shell** with **scoped** summaries + coordinator-style attention where RLS allows; reuse `CoordinatorOperationsBoard` patterns only if data model aligns (otherwise new tables later). |
| **v1 recommendation** | **Shared “field leadership shell”** — one route with `primary_role` + geography id driving widgets. |

---

## 6. Shell sharing (reduce implementation load)

| Shell | Roles (v1) | Notes |
|--------|------------|--------|
| **Volunteer shell** | `volunteer`, `lead_contact` (default home) | Add scoped header + “lead” module later. |
| **Dashboard + intern embed** | `intern` | Already: `/intern` + intern block on `/dashboard`. |
| **Leadership shell** | `candidate` | `/candidate` — extend for principal-only modules. |
| **Coordination shell** | `volunteer_coordinator`, `coordinator` | `/coordinator` — extend for events handoffs later. |
| **Operations shell (new)** | `campaign_manager`, `assistant_campaign_manager`, `events_coordinator` | One layout, feature flags by slug. |
| **Field leadership shell (new)** | `county_lead`, `precinct_captain` | One layout, geography scope prop. |
| **Admin shell (new)** | `admin` | Separate when permissions exist. |

**Staff:** Route to operations shell or coordinator shell per org policy; encode in `getRoleHomePath` when product decides.

---

## 7. Phased build order (recommended)

**Phase 0 — Done in repo (baseline)**  
Volunteer dashboard, intern route, candidate desk, coordinator desk, Power5 desk, role home redirect for intern/candidate/coordinator, Agent Jones surfaces, KPI leadership hooks.

**Phase 1 — Routing & gating hygiene**  
- Align post-login redirect with `RoleHomePath` (single source of truth).  
- Optional **route guards** (UI + future RLS): candidate/coordinator only for allowed roles, with neutral “no access” state.  
- Extend `getPrimaryRoleHomeBucket` for `campaign_manager`, `admin`, `staff` when their desks exist (until then, default or `/candidate` for principals only by policy).

**Phase 2 — Operations shell (CM / ACM / events)**  
- One new route (e.g. `/hq` or `/operations`).  
- Modules: attention queue (from existing task/event sources when available), event checklist placeholder, KPI read-only, links to coordinator/intern.

**Phase 3 — Field leadership shell**  
- County + precinct captains: geography-scoped summary, escalations, links into volunteer tools.  
- Reuse card/list patterns from coordinator desk; **no duplicate mission board** until data model supports geo-scoped assignments.

**Phase 4 — Admin shell**  
- Read-only health + support links first; privileged actions only behind explicit backend contracts.

**Phase 5 — Task & event system integration**  
- Unify “what needs attention” across desks from a shared **attention model** (client-side aggregation from whitelisted queries/RPCs — implementation later).  
- Wire events coordinator modules to event tables when migrations exist.

---

## 8. Cross-cutting: header & attention (all desks)

| Element | Executive / command | Operations | Field leadership | Execution |
|---------|---------------------|------------|------------------|-----------|
| **Header summary** | Clock, KPI window health, strategic phase | Today’s program milestones, open escalations | Geography coverage, team pulse | Roster slice, my next task |
| **What needs attention** | Weakest KPI, legal/compliance copy-out | Cross-team blockers, event risks | Captain coverage gaps, hot precincts | Exceptions, overdue contacts, stalled missions |

Reuse **one** `AttentionList` pattern (coordinator + candidate already use list + chips) with props driven by desk type.

---

## 9. Engineering checklist (when implementing)

- [ ] Extend `roleHomeRouting.ts` only after a desk route exists; keep fallbacks to `/dashboard`.  
- [ ] Add new roles to dev profile presets / seed docs, not scattered string literals.  
- [ ] Mirror slug list in Supabase check constraint or enum **when** DB is ready (separate migration task).  
- [ ] Keep `roleDashboardScaffold.ts` as the **shipped vs gap** dev checklist per desk; link to this doc from README or build map.

---

## 10. Document maintenance

| When | Action |
|------|--------|
| New route added | Update §1 family map + `reports/ai-thread-build-map.md` (or automate via audit script). |
| New `primary_role` | Update §3 canonical list + `getPrimaryRoleHomeBucket`. |
| New desk shipped | Update §5 + Phase table + scaffold TS file. |

---

*End of blueprint — implementation tasks should reference section numbers for scope.*
