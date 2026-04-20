# Campaign dashboard inventory & role architecture (master blueprint)

**Status:** Planning only — no implementation requirements in this document.  
**Purpose:** Single engineering reference for growing the volunteer-first dashboard into a full role-based campaign operating system.  
**Grounding:** `src/App.tsx`, `src/lib/roleHomeRouting.ts`, `src/lib/roleDashboardScaffold.ts`, `src/lib/kpiEngine.ts` (`isCampaignLeadershipRole`), `src/pages/Dashboard.tsx`, desk pages, `src/hooks/useProfile.ts` (`campaign_profiles.primary_role`).

**Scope:** Treat CampaignOS as a **campaign command system** — one desk family, shared engines (tasks, calendar, permissions, attention widgets), not a loose collection of one-off dashboards.

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
| **Operations / management** | Programs, staffing, comms, data, compliance handoffs, KPI ownership | Campaign manager, assistant campaign manager, volunteer coordinator, events coordinator, **communications lead**, **data lead** |
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
| `communications_lead` | Communications lead | Content / message coordination; **share operations shell** until comms systems mature. |
| `data_lead` | Data lead | Targeting, integrity, reporting; **share operations shell** with data-focused widgets. |
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
| **communications_lead** | Content calendar, message priorities, event comms | Comms lead | **Share ops shell** v1 | Content calendar, announcements, press/digital deliverables |
| **data_lead** | Data integrity, targeting, reporting quality | Data / analytics lead | **Share ops shell** v1 | KPI health, voter match, imports, task completion quality |
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
| **Core purpose** | **Volunteer execution desk** (baseline product): onboarding/readiness, voter status, mission & task queue, daily activation, events & training, Power of 5 — single place for roster clearance and field tools. |
| **Top sections** | Identity, next step, path cards, missions, daily activation, KPIs, onboarding, voter/Power of 5, exception, training/tasks, optional intern embed. |
| **Reuse** | `DashboardGrid`, `WorkspaceDock`, `CampaignKpisCard`, `TaskListCard`, `useVolunteerTasks`, `useDailyMission`, `usePower5Workspace`, `FloatingAgentJones`. |
| **Header summary** | Next step, upcoming event or training, current mission status; roster slice, role label, optional countdown. |
| **What needs attention** | Incomplete onboarding, unclaimed missions, daily activation gaps, upcoming event commitments; `NextStepCard`, exception status, unmatched voter — `dashboardState` / cards. |

### 5.2 Team desk — `/intern` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | Intern structured support: assigned queue, pipeline state, training/coaching, escalations — **no new shell required**; specialized variant of execution family. |
| **Top sections** | `InternDeskContent` (pipeline + mission tasks). |
| **Reuse** | Entire `Dashboard` composition + intern hooks. |
| **Header summary** | Current intern stage, due work, next pipeline step; same chrome as dashboard where appropriate; Agent Jones `surface: intern_desk`. |
| **What needs attention** | Overdue assignments, missing training, blocked pipeline items; overdue first contact, pipeline counts — intern layer context. |

### 5.3 Campaign leadership — `/candidate` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | **Strategic** campaign overview for the principal: high-signal executive surface — KPIs, calendar highlights, field momentum summaries, message/issue priorities, risk/blockers (aggregates + links, not full operator queues). |
| **Primary user** | Candidate; optionally chief-of-staff-equivalent accounts (policy). |
| **Top sections** | Health snapshot, election phase, metric balance, attention areas, KPI detail, leadership scaffold, ops tiles. |
| **Reuse** | `CampaignKpisCard`, `LeadershipKpiScaffold`, `campaignClock`, `useCampaignKpis`, `FloatingAgentJones` (`candidate_desk`). |
| **Header summary** | Campaign health snapshot, top KPI movement, next major event or deadline, top area of concern. |
| **What needs attention** | Slipping priority metrics, urgent public events, underperforming counties/teams (when data exists), unresolved high-visibility issues — **RLS-safe counts only** (see §9.2). |

### 5.4 Coordination — `/coordinator` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | **Volunteer coordinator** desk: activation, assignment management, training/branch oversight, exception framing — supervised volunteer missions, intern pipeline signals, dispatch when scoped. |
| **Primary user** | Volunteer coordinator (`volunteer_coordinator` / `coordinator`). |
| **Top sections** | Snapshot, attention, exceptions framing, pipeline, activation, mission board, dispatch, KPIs. |
| **Reuse** | KPI cards, leadership scaffold, supervisor task libs, intern overview parse; structural overlap with **events coordinator** in v1 (shared ops components). |
| **Primary data domains** | Volunteer intake, task flows, activation/retention, training completion, branch/path oversight, volunteer-related exception queue. |
| **Header summary** | Active volunteers, volunteers needing placement, overdue volunteer follow-up, upcoming volunteer-heavy events. |
| **What needs attention** | Unassigned volunteers, missing follow-up, inactive volunteers with recent drop-off, capacity shortages for upcoming events; blocked/overdue assignments, escalated pipelines, missing supervisor scope. |

### 5.5 Power of 5 focus — `/power5` (existing)

| Item | Content |
|------|---------|
| **Core purpose** | Deep relational organizing workspace. |
| **Reuse** | Power5 components; link from volunteer and lead roles. |
| **Desk strategy** | Not a separate “role home” today; keep as module until lead_contact needs a home route. |

### 5.6 Command / operations — `/command` or `/hq` (proposed, not in repo)

| Item | Content |
|------|---------|
| **Core purpose** | **Campaign manager:** full operational command center — KPIs, task ops campaign-wide, calendar/deadlines, staffing gaps, county/precinct readiness, escalations, event pipeline, leadership rollups from subordinate desks. **ACM / events / comms / data:** same shell, scoped or module toggles. |
| **Primary user (CM)** | Campaign manager. |
| **Top sections** | Today’s priorities, event timeline, escalations from field, KPI strip (read), people requests; **communications** and **data** variants swap in content calendar / integrity widgets per §5.8–5.9. |
| **Reuse** | `CampaignKpisCard` (read), patterns from coordinator “attention” list, future shared **OpsAttentionStrip** component. |
| **Shell** | **Share one “operations shell”** for `campaign_manager`, `assistant_campaign_manager`, `volunteer_coordinator`, `events_coordinator`, `communications_lead`, `data_lead` in v1 with role-based module flags. |
| **Header summary (CM)** | Top campaign priorities this week, overdue execution items, staffing/coverage gaps, major events approaching. |
| **What needs attention (CM)** | Urgent field gaps, overdue tasks by lane, event bottlenecks, county/precinct risk flags. |

**Events coordinator module (same shell):** event intake, review/publish states, staffing, logistics tasks, calendar publication pipeline. **Header:** events awaiting review, unstaffed upcoming events, published-this-week signal, deadlines approaching. **Attention:** pending requests, staffing shortages, missing logistics confirmations, unpublished high-priority events.

### 5.7 Admin — `/admin` (proposed, not in repo)

| Item | Content |
|------|---------|
| **Core purpose** | System command: operations, **permissions**, configuration, **exceptions**, oversight, integrations, task/calendar integrity. |
| **Primary user** | Trusted campaign operator with full-system visibility. |
| **Top sections** | Role & access registry, exception/audit queues, integration health, **unpublished events awaiting review** (rollup), dashboard registry, campaign-wide activity summaries. |
| **Reuse** | Minimal layout v0; link to external ops tools where appropriate. |
| **Shell** | **Unique** when real controls exist; v0 stub + docs links only. |
| **Header summary** | Unresolved exceptions, overdue high-priority tasks, unpublished events in review, active users by role (aggregates), integration/sync health. |
| **What needs attention** | Permission mismatches, blocked workflows, events pending publish, stale role assignments, failed integrations. |

### 5.8 Communications lead desk (proposed)

| Item | Content |
|------|---------|
| **Core purpose** | Content and message coordination; event comms support. |
| **Desk strategy** | **No unique desk in phase one** — operations shell with comms modules. |
| **Primary data domains** | Content calendar, announcements, message priorities, press/digital deliverables, key events needing coverage. |
| **Header summary** | Content due, message of day/week, events needing promotion. |
| **What needs attention** | Missing event promotion, overdue content, urgent message shifts. |

### 5.9 Data lead desk (proposed)

| Item | Content |
|------|---------|
| **Core purpose** | Data integrity, targeting, reporting command surface. |
| **Desk strategy** | **No unique desk initially** — operations shell with data/analytics widgets. |
| **Primary data domains** | KPI health, voter match integrity, targeting readiness, task completion data quality, dashboard integrity. |
| **Header summary** | Data freshness, broken/incomplete records, reporting gaps. |
| **What needs attention** | Stale imports, unmatched records, reporting inconsistencies. |

### 5.10 Geography leadership — `/field` or `/county` + `/precinct` (proposed)

| Item | Content |
|------|---------|
| **Core purpose** | **County lead:** county-wide execution — readiness, precinct coverage, local capacity, county calendar, local task board, escalation to CM/coordinators. **Precinct captain:** turf/precinct tasks, local events, turnout prep, team health, poll coverage planning. **Lead contact:** small-team / relational organizing — roster, check-ins due, recruiting goals, Power of 5 (often **`/dashboard` + `/power5`** until a `/field` home exists). |
| **Reuse** | Volunteer dashboard **shell** with **scoped** summaries + coordinator-style attention where RLS allows; reuse `CoordinatorOperationsBoard` patterns only if data model aligns (otherwise new tables later). |
| **v1 recommendation** | **Shared “field leadership shell”** — one route with `primary_role` + geography id driving widgets. |
| **Header summary (county)** | County volunteer coverage, open county tasks, upcoming county events, precincts needing support. |
| **Header summary (precinct)** | Active local volunteers, upcoming local tasks, event participation needs. |
| **Header summary (lead contact)** | Volunteers to follow up, tasks due soon, recruiting progress. |
| **What needs attention** | Uncovered precincts, local staffing gaps, weak follow-up; missed check-ins, volunteer drop-off, slow Power of 5 growth (lead contact). |

---

## 6. Shell sharing (reduce implementation load)

| Shell | Roles (v1) | Notes |
|--------|------------|--------|
| **Volunteer shell** | `volunteer`, `lead_contact` (default home) | Add scoped header + “lead” module later. |
| **Dashboard + intern embed** | `intern` | Already: `/intern` + intern block on `/dashboard`. |
| **Leadership shell** | `candidate` | `/candidate` — extend for principal-only modules. |
| **Coordination shell** | `volunteer_coordinator`, `coordinator` | `/coordinator` — extend for events handoffs later. |
| **Operations shell (new)** | `campaign_manager`, `assistant_campaign_manager`, `events_coordinator` | One layout, feature flags by slug. |
| **Field leadership shell (new)** | `county_lead`, `precinct_captain`, `lead_contact` | One layout, geography / team scope prop. |
| **Admin shell (new)** | `admin` | Separate when permissions exist. |

**Alias names (same shells as §6):**

| Shell | Roles (v1) | Capabilities |
|-------|------------|--------------|
| **A — Command / management** | `campaign_manager`, `assistant_campaign_manager`, `volunteer_coordinator`, `events_coordinator`, `communications_lead`, `data_lead` | Executive summary cards, queues, deadlines/events, lane health, escalations, task & event oversight. |
| **B — Field leadership** | `county_lead`, `precinct_captain`, `lead_contact` | Territory summary, roster, local events, task board, follow-up needs, local gaps & escalation. |
| **C — Execution** | `volunteer`, `intern` | Personal next step, readiness, task queue, events/training, daily activation, Power of 5. |

**Unique desks (remain distinct):** `admin`, `candidate`.

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

**Alternate phase labels (program roadmap):**

| Program phase | Focus |
|---------------|--------|
| **Architecture foundation** | Canonical roles, permissions (`campaign-permissions-and-access-model.md`), shared task + calendar architecture (`campaign-universal-tasks-and-calendar-architecture.md`), summary/attention modules. |
| **Command layer** | Admin, campaign manager, candidate desks. |
| **Management layer** | ACM, volunteer coordinator, events coordinator; comms/data as operations-shell variants. |
| **Field leadership** | County lead, precinct captain, lead contact (shared shell). |
| **Execution refinement** | Intern + volunteer desk depth. |

**First desks to prioritize (product sequencing):**

1. **Build first:** `admin`, `campaign_manager`, `candidate`, `volunteer_coordinator`, `events_coordinator`.  
2. **Build next:** `assistant_campaign_manager`; field leadership shared shell (`county_lead`, `precinct_captain`, `lead_contact`).  
3. **Refine continuously:** `intern`, `volunteer` (baseline already shipped).

---

## 8. Cross-cutting: header & attention (all desks)

| Element | Executive / command | Operations | Field leadership | Execution |
|---------|---------------------|------------|------------------|-----------|
| **Header summary** | Clock, KPI window health, strategic phase | Today’s program milestones, open escalations | Geography coverage, team pulse | Roster slice, my next task |
| **What needs attention** | Weakest KPI, legal/compliance copy-out | Cross-team blockers, event risks | Captain coverage gaps, hot precincts | Exceptions, overdue contacts, stalled missions |

Reuse **one** `AttentionList` pattern (coordinator + candidate already use list + chips) with props driven by desk type.

---

## 9. Executive rollup visibility (admin, campaign manager, candidate)

Three surfaces should **not** duplicate every subordinate desk in full. Instead they **aggregate, link, and drill down** using read-only summaries (RLS-safe aggregates/RPCs), consistent with `docs/campaign-permissions-and-access-model.md`.

### 9.1 Design rules

| Rule | Detail |
|------|--------|
| **Rollup ≠ full desk** | Show counts, worst lanes, deadlines, and “open in …” links — not full mission tables unless RLS grants them. |
| **Single source of truth** | Subordinate desks (`/coordinator`, `/intern`, `/dashboard`, future `/hq`, `/field`) remain where work is executed. |
| **Permission-gated widgets** | Each rollup tile checks capability keys; hide or show “request access” copy when denied. |
| **Candidate is narrative-first** | Principal sees **health + risk + phase**, not operator queues, unless product explicitly adds CM-style tiles later. |

### 9.2 Candidate surface (`/candidate`) — what rolls up

Principal should see **strategic** rollups: top KPIs, major events/deadlines, field momentum snapshots, top risks/blockers — plus **link or embedded summary** from the **campaign manager** operational roll-up when that desk exists (not a full CM queue).

| Source desk / domain | Rollup on candidate desk | Interaction |
|----------------------|---------------------------|-------------|
| **Volunteer engine** (`/dashboard`) | KPI alignment copy, link “Volunteer workspace”; optional aggregate: active volunteer missions volume (when API exists) | Read-first |
| **Coordination** (`/coordinator`) | Reuse or mirror **supervisor-scope** signals already on coordinator (blocked/overdue **counts** only on candidate if RPC allows); today: **deep link** + prose in ops tiles | Link + optional counts |
| **Team desk** (`/intern`) | Pipeline risk: overdue first contact / escalated **counts** (same family as coordinator intern overview) | Link to `/intern` |
| **Field leadership** (future `/field`) | County/precinct “heat” summary when data exists | Link |
| **Operations** (future `/hq`) | High-level milestones, event readiness strip (future calendar) | Link |
| **Admin** | Not primary audience; compliance disclaimer only | — |

**Candidate should *not* default to:** full assignee lists, PII-heavy rosters, or org-wide exception queues without explicit backend support.

### 9.3 Campaign manager surface (future `/hq` or `/operations`) — what rolls up

| Source desk / role | Rollup for CM / ACM / events_coordinator | Interaction |
|--------------------|------------------------------------------|-------------|
| **Volunteer coordinator** (`/coordinator`) | Mission lane totals, blocked/overdue across supervised teams, dispatch activity | Deep link to `/coordinator` |
| **Intern** (`/intern`) | Pipeline health, SLA breaches, capacity | Deep link |
| **Volunteer** (`/dashboard`) | Program participation signals (KPI-linked), training completion aggregates | Deep link |
| **Field leadership** (`/field`) | County/precinct coverage maps or tables | Deep link |
| **Events** (future calendar) | Draft → published pipeline, staffing gaps | Own module + tasks doc |
| **Communications / data** (ops modules) | Content-calendar pressure, message coverage gaps; data freshness / match health (aggregates) | Same `/hq` shell, module flags |
| **Admin** | Integration status, role-change queue (future) | Link to `/admin` |

CM shell is the **operational command center**: every row should be actionable or link to the owning desk.

### 9.4 Admin surface (future `/admin`) — what rolls up

| Source | Rollup for `admin` | Interaction |
|--------|-------------------|-------------|
| **All desks** | **Health & access:** summarized views of major queues, **permission/exception states**, **calendar/event pipeline layers** (draft/review/publish), route smoke — not full operator mission tables by default | Links to desks for support |
| **Profiles / roles** | Pending role changes, locked accounts (product-defined) | Admin-only RPCs |
| **Compliance / audit** | Export logs, sign-in audit (existing hooks if any) | Read-only first |
| **Integrations** | Supabase/Netlify status links | External |

Admin is **not** a replacement for CM: use for **platform and permission** oversight; avoid turning `/admin` into the primary place to run field operations.

### 9.5 Cross-surface navigation pattern (future)

- **“Desk directory”** drawer or footer on candidate + CM + admin: consistent list of routes (`/dashboard`, `/intern`, `/coordinator`, `/candidate`, `/power5`, `/hq`, `/field`, `/admin`) with **visibility** per `primary_role` + permissions.
- **Breadcrumbs** optional: `Command → Coordination → Mission detail` when deep-linking.

### 9.6 Recommended URL paths (kebab-case in browser)

**`primary_role` stays snake_case in the database** (`roleHomeRouting.ts`). **Routes** can use kebab-case for readability:

| Intended desk | Example path | Repo today |
|---------------|--------------|------------|
| Admin | `/admin` | Not routed |
| Campaign manager | `/campaign-manager` or `/hq` | Not routed — pick one canonical slug when implementing |
| Candidate | `/candidate` | Shipped |
| Assistant CM | `/assistant-campaign-manager` | Not routed |
| Volunteer coordinator | `/volunteer-coordinator` | **`/coordinator` shipped** — prefer migrating to `/volunteer-coordinator` long term with redirect from `/coordinator` |
| Events coordinator | `/events-coordinator` | Not routed |
| Communications / data | Same operations route; modules by role | Not routed |
| County / precinct / lead contact | `/county-lead`, `/precinct-captain`, `/lead-contact` or single `/field?role=` | Not routed |
| Intern | `/intern` | Shipped |
| Volunteer | `/dashboard` | Shipped; optional alias `/volunteer` later with backwards compatibility |

---

## 10. Engineering checklist (when implementing)

- [ ] Extend `roleHomeRouting.ts` only after a desk route exists; keep fallbacks to `/dashboard`.  
- [ ] Add new roles (`communications_lead`, `data_lead`, etc.) to dev profile presets / seed docs, not scattered string literals.  
- [ ] Mirror slug list in Supabase check constraint or enum **when** DB is ready (separate migration task).  
- [ ] Keep `roleDashboardScaffold.ts` as the **shipped vs gap** dev checklist per desk; link to this doc from README or build map.
- [ ] When building rollup widgets, reuse the same aggregate RPCs the child desk uses — avoid duplicate business logic.

---

## 11. Document maintenance

| When | Action |
|------|--------|
| New route added | Update §1 family map + `reports/ai-thread-build-map.md` (or automate via audit script). |
| New `primary_role` | Update §3 canonical list + §4 inventory + `getPrimaryRoleHomeBucket`. |
| New desk shipped | Update §5 + Phase table + scaffold TS file + §9 rollup tables if the desk feeds executive surfaces. |

---

*End of blueprint — implementation tasks should reference section numbers for scope.*
