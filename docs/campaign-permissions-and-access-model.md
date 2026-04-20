# Campaign permissions & access model (architecture)

**Status:** Planning only — no auth or RLS changes implied by this document alone.  
**Audience:** Engineers implementing desks, calendar, events, and task flows on Supabase + React.  
**Companion:** `docs/campaign-dashboard-role-architecture.md` (desks, routes, executive rollups).

**How to use this doc:** Define **permission keys** and **scopes** here first; implement **RLS/RPC** for mutations and sensitive reads; mirror keys in **`usePermissions()`** (future) for UX. UI hiding alone is never sufficient for cross-profile data.

---

## 1. Current state audit (repo + DB)

### 1.1 Identity

| Mechanism | Where | Notes |
|-----------|--------|--------|
| Auth user | Supabase Auth (`auth.users`) | Session drives `campaign_profiles` lookup via `user_id`. |
| Campaign profile | `campaign_profiles` | `useProfile` loads full row; **`primary_role`** is free-text–like string today (normalized in TS with `trim` / `toLowerCase` / spaces → `_`). |
| Role → home route | `src/lib/roleHomeRouting.ts` | Buckets: `intern` → `/intern`, `candidate` → `/candidate`, `coordinator` / `volunteer_coordinator` → `/coordinator`, else `/dashboard`. |
| Leadership KPI UI | `src/lib/kpiEngine.ts` → `isCampaignLeadershipRole` | **Client:** `candidate`, `coordinator`, `staff`, `admin` → shows `LeadershipKpiScaffold`, leadership mission fetch. |
| Leadership KPI RPC | `is_campaign_leadership(p_profile_id)` in migrations | **Server:** `coordinator`, `staff`, `admin` **or** row in `volunteer_supervisor_teams` — **does not** include `candidate`. |
| Intern capability | `useInternLayer`, `20260420140000_intern_layer_system.sql` | Server checks `primary_role = 'intern'` (e.g. round-robin intern pick); pipeline RPCs verify `current_intern_profile_id = actor` for many mutations. |
| KPI read / leadership UI | `src/hooks/useCampaignKpis.ts`, `src/lib/kpiEngine.ts` | Client uses `isCampaignLeadershipRole` for scaffold visibility; mutations use RPCs gated by `is_campaign_leadership`. |

**Gap to track:** Principal (`candidate`) sees leadership KPI UI when `isCampaignLeadershipRole` matches (`candidate`, `coordinator`, `staff`, `admin`), but **`is_campaign_leadership` in DB** allows only `coordinator` / `staff` / `admin` **or** `volunteer_supervisor_teams` membership — **not** `candidate`. Future work: align DB helper with product policy (e.g. add `candidate` / `campaign_manager` to SQL helper) or split “principal narrative KPI” vs “target edit” RPCs.

### 1.2 Route guards and default home

| Route | Guard today | Intended entitlement key (future) |
|-------|-------------|-----------------------------------|
| `/` | Session → `RoleHomeRedirect` + `getRoleHomePath` | Implicit (always allowed if authenticated) |
| `/dashboard` | Session | `route.desk.volunteer.view` (or generic `route.desk.workspace.view`) |
| `/intern` | Session | `route.desk.intern.view` |
| `/candidate` | Session (no role check) | `route.desk.candidate.view` |
| `/coordinator` | Session (no role check) | `route.desk.coordinator.view` |
| `/power5` | Session | `route.desk.power5.view` (or inherit workspace) |

**Default home (`getRoleHomePath` in `src/lib/roleHomeRouting.ts`):** `intern` → `/intern`; `candidate` → `/candidate`; `coordinator` / `volunteer_coordinator` → `/coordinator`; **everything else** → `/dashboard`.  
**Planning note:** When `campaign_manager`, `assistant_campaign_manager`, `events_coordinator`, `county_lead`, `precinct_captain`, `lead_contact` desks ship, extend `getPrimaryRoleHomeBucket` + paths (e.g. `/hq`, `/field`) per `campaign-dashboard-role-architecture.md` — permission keys should align before routes proliferate.

### 1.3 Existing pattern: capability via membership, not only role

- **Supervisor missions:** Visibility/actions tied to **`volunteer_supervisor_teams`**, not only `primary_role` (matches DB `is_campaign_leadership` second clause).
- **Implication:** Permissions should support **`role_defaults` + `membership_overrides`** (see §4 and §3.1).

**`staff` role:** Used in client leadership checks and DB `is_campaign_leadership`; treat as **HQ / operations** until a dedicated `campaign_manager` slug is universal. Matrix below uses `campaign_manager`; **`staff` should inherit the same default bundle as `campaign_manager`** unless product splits them.

---

## 2. Design principles

1. **Defense in depth:** UI gating for UX; **RLS + RPC** for real security on shared tables. Never rely on UI alone for sensitive reads/writes.
2. **Role alone is not enough:** `primary_role` sets **defaults**; **scope** (county, precinct, team) and **membership** (e.g. supervisor teams) determine what rows exist in queries. Contextual overrides (§10) extend access only with audit.
3. **Composable, not a Cartesian product:** Avoid hard-coding every `role × screen` pair. Prefer **keys + scope** + shared shell/widgets (`campaign-dashboard-role-architecture.md`).
4. **UI visibility is not security:** Navigation and widgets may hide first; **mutations and cross-profile reads** must land in RLS/RPC before relying on them.
5. **Incremental rollout:** The app must remain usable before every policy is enforced in Supabase; ship **backend-first** for the highest-risk verbs (§14).
6. **Scope-first for field:** Geography/team restrictions are **scopes** on top of verbs (`view` vs `assign`) — county vs precinct should reuse the **same** product logic with different scope props.
7. **One campaign per deployment (v1):** Single campaign context unless `campaign_id` exists on rows.
8. **Align names** with `docs/campaign-dashboard-role-architecture.md` canonical `primary_role` slugs.

---

## 3. Model overview (four layers — stakeholder framing)

Stakeholder docs often describe **four** layers; they map to implementation as follows:

| Layer | Meaning | In this doc |
|-------|---------|-------------|
| **1. Role defaults** | Base bundle per `primary_role` | §6 matrix + §6.1 narratives |
| **2. Scope** | Which rows apply (`campaign`, `region`, `county`, …) | §4 + effective resolution §3.1 |
| **3. Functional permissions** | Verbs: view, assign, publish, … | §5 keys + widget map §7 |
| **4. Contextual overrides** | Temporary elevation, delegation | §10 |

```
Subject: campaign_profiles.id (+ auth.uid())
├── Layer A: Role (primary_role)           → default bundles, routing, coarse labels
├── Layer B: Scope (geography / team)      → which rows are visible/assignable
├── Layer C: Capabilities (permission keys) → fine-grained actions
└── Layer D: Overrides (optional, audited) → acting role, delegation (§10)
```

- **Layer A** is **already present** (`primary_role`); extend only by tightening allowed slugs in DB later.
- **Layer B** is **partially present** (`power5_home_team_id`, supervisor team links, future county/precinct/region FKs).
- **Layer C** is **to be introduced** as explicit keys (constants or `profile_permissions` table later).

### 3.1 Effective permission resolution (for implementers)

When evaluating “can this user do X?”:

1. **Load subject:** `auth.uid()` → `campaign_profiles.id`, `primary_role`, geography/team FKs (present or future).
2. **Apply role defaults:** `getDefaultPermissionsForRole(primary_role)` → base set of keys (Phase P1 — code constants).
3. **Apply membership grants:** e.g. if row exists in `volunteer_supervisor_teams` for this profile, add keys such as `task.supervise.team`, `volunteer.oversight.assignments.view` even when `primary_role` is `volunteer` (policy-defined).
4. **Apply scope:** Restrict **which rows** queries/RPCs return (`county_id`, `precinct_id`, `team_id`); scope does not imply keys that RLS forbids.
5. **Apply contextual overrides (later):** Acting role, delegation — must be audited; narrow time window.
6. **Deny wins:** If any layer explicitly denies (future `permission_denials` table) or RLS returns no row, UI must not show success.

**Single source of truth for data:** Postgres RLS + `SECURITY DEFINER` RPC checks. Client `usePermissions()` is a **cache of intent** for UX only.

---

## 4. Scope model

| Scope key | Meaning | Example use |
|-----------|---------|-------------|
| `scope.campaign` | Entire campaign (all data policy allows) | CM calendar, global KPI read |
| `scope.region` | Multi-county or regional grouping (optional) | Regional director; **add FK/join table when product defines regions** |
| `scope.county` | One county (id in profile or assignment table) | County lead rollup |
| `scope.precinct` | One precinct | Captain view |
| `scope.team` | One Power of 5 / volunteer team | Coordinator missions (today: supervisor teams) |
| `scope.self` | Own profile + assigned work | Volunteer default |

**Rules**

- Scopes **intersect** with RLS: if RLS says “only own rows,” `scope.campaign` in the app does not grant extra reads without a **privileged RPC** or policy exception.
- **Effective scope** = union of: role default scopes + explicit assignments (e.g. “captain of precinct P”).

**Naming convention (engineering)**

- Scope type: `snake_case` prefix in keys: `county`, `precinct`, `team`, `campaign`.
- Store IDs as UUIDs in DB; in permission context use `scope:county:{uuid}` string form for debugging only.

---

## 5. Functional verbs (actions)

Use a small closed set; map product language to these internally.

| Verb | Meaning |
|------|---------|
| `view` | Read metadata and non-sensitive aggregates |
| `create` | Create draft / request |
| `edit` | Modify own or scoped drafts |
| `assign` | Delegate work to others in scope |
| `complete` | Mark work done (self or supervised per policy) |
| `approve` | Accept/reject a request (exceptions, events, etc.) |
| `publish` | Make visible to wider audience (events, calendar) |
| `manage` | CRUD on a resource type within scope (orgs, templates) |
| `admin` | Break-glass / configuration (integrations, roles) |

**Permission key shape (recommended)**

`{domain}.{resource}.{verb}` or `{domain}.{resource}.{verb}.{qualifier}`

Examples:

- `route.desk.candidate.view`
- `route.desk.coordinator.view`
- `calendar.campaign.view`
- `calendar.team.view`
- `event.create.draft`
- `event.approve`
- `event.publish`
- `task.assign.volunteer`
- `task.escalate`
- `kpi.view.org`
- `kpi.manage.targets`
- `kpi.manual_adjust`
- `volunteer.oversight.assignments.view`
- `admin.profile.role_set` (future)

Keys are **lowercase**, **dot-separated**; no spaces. Version qualifiers (`v1`) only if two incompatible meanings coexist.

---

## 6. Role default capability matrix (v1 targets)

Legend: **Y** = default on, **S** = scoped (needs geography/team), **—** = off by default, **(M)** = via membership table even if role alone insufficient.

| Permission area | admin | candidate | campaign_manager | assistant_campaign_manager | volunteer_coordinator | events_coordinator | county_lead | precinct_captain | lead_contact | intern | volunteer |
|-----------------|-------|-----------|------------------|------------------------------|------------------------|-------------------|-------------|------------------|--------------|--------|-----------|
| **Route: /dashboard** | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| **Route: /intern** | Y | — | Y | Y | Y | Y | — | — | — | Y | — |
| **Route: /candidate** | Y | Y | Y | S | S | S | — | — | — | — | — |
| **Route: /coordinator** | Y | S | Y | Y | Y | S | S | S | — | — | — |
| **Route: /power5** | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| **Route: /admin (future)** | Y | — | S | — | — | — | — | — | — | — | — |
| **Calendar: campaign view** | Y | Y | Y | Y | Y | Y | S | S | — | S | S |
| **Calendar: create event draft** | Y | S | Y | Y | S | Y | S | S | — | — | — |
| **Calendar: approve/publish** | Y | S | Y | S | — | S | — | — | — | — | — |
| **Event: visibility “internal”** | Y | Y | Y | Y | Y | Y | Y | Y | S | Y | S |
| **Event: visibility “volunteers”** | Y | Y | Y | Y | Y | Y | S | S | S | Y | Y |
| **Task: assign to volunteer** | Y | S | Y | Y | Y (M) | S | S | S | — | — | — |
| **Task: complete self** | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| **Task: escalate** | Y | S | Y | Y | Y | Y | Y | Y | S | Y | S |
| **Volunteer oversight: assignments** | Y | S | Y | Y | Y (M) | S | S | S | — | — | — |
| **KPI: view org** | Y | Y | Y | Y | Y | Y | S | S | — | S | S |
| **KPI: manage targets / manual** | Y | S | Y | S | Y (RPC) | — | — | — | — | — | — |
| **Admin: role/integration** | Y | — | — | — | — | — | — | — | — | — | — |

**Notes**

- **(M)** matches today’s pattern: coordinator-like powers from **`volunteer_supervisor_teams`** even when `primary_role` is not literally `coordinator`.
- **S** (scoped): same verb as parent role but **filtered** by county/precinct/team columns in queries/RPCs.
- **Candidate row:** Principal gets **strategic** routes and **narrative** publish/approve in product policy; DB must be updated if they should run `kpi_leadership_*` without being `staff`/`coordinator`.
- **`staff`:** Not a column in this table; treat defaults as **identical to `campaign_manager`** until product differentiates HQ titles (see §1.3).
- **`communications_lead` / `data_lead`:** Not separate columns; use the **`campaign_manager` / `assistant_campaign_manager` / `events_coordinator` band** for route + calendar + task rows until product tightens (these roles ship as **operations-shell modules** — see `campaign-dashboard-role-architecture.md` §3–§6).

### 6.1 Role default narratives (product — aligns with matrix)

Use with §6; **backend enforcement priority** is indicative (see §14 for concrete P0 keys).

| Role | Default scope | Should have (summary) | Should not default to | Enforcement priority |
|------|----------------|------------------------|------------------------|----------------------|
| **admin** | campaign | Full route/desk visibility; all task/event/calendar/KPI verbs in policy; `admin.*` keys | — | Highest |
| **candidate** | campaign | Candidate desk, strategic summaries, major calendar/KPI slices, limited event create/request per workflow | Bulk user/permission management; campaign-wide task assignment unless product explicitly allows | Medium–high (reads still RLS-bound) |
| **campaign_manager** | campaign | CM desk, broad assign + oversight, event review/coordination, calendar management view, KPI view/manage, rollups across county + coordinator | — | Highest |
| **assistant_campaign_manager** | campaign or **assigned lane** | Management desk, assign/edit tasks in scope, partial event review, KPI view, escalation visibility | Full publish/role admin unless delegated | High |
| **volunteer_coordinator** | campaign or org slice | Coordinator desk, volunteer task assign/manage, volunteer-facing calendar/training signals, limited event staffing visibility | Org-wide event publish (unless granted) | High |
| **events_coordinator** | campaign or org slice | Events desk, create/review/approve/publish per config, event-linked tasks, staffing views | — | Highest for **publish** |
| **county_lead** | county | County desk, county task view/assign, county calendar, event **requests** (county), escalate up, county KPI slices | Campaign-wide admin | High |
| **precinct_captain** | precinct | Precinct desk, precinct tasks, limited local assign, precinct/county + approved campaign-wide calendar, local follow-up | County-wide assign without scope | Medium–high |
| **lead_contact** | team | Field leadership desk, team roster + tasks, check-ins, relational goals, escalate | Cross-team PII | Medium |
| **intern** | self or assigned team | Intern desk, complete assigned tasks, training, approved events relevant to them | Coordinator publish | Medium |
| **volunteer** | self | Volunteer desk, complete assigned tasks, approved volunteer events, personal calendar-relevant items, onboarding | Others’ assignments | Medium |

---

## 7. Dashboard & widget visibility

Desks should be **composed**, not monolithic: **base shell** + summary widgets + queue widgets + upcoming events + task panels + escalation panels + KPI cards. Each widget checks: (1) functional permission key, (2) effective scope, (3) whether data exists in that scope.

Map widgets to **permission keys** (implement later via `usePermissions()` hook reading profile + memberships).

| Widget / module | Suggested keys |
|-----------------|----------------|
| Intern pipeline panel | `intern.pipeline.view` |
| Leadership KPI scaffold | `kpi.manage.targets` **or** `kpi.leadership_ui.view` (split “see numbers” vs “edit”) |
| Coordinator mission board | `volunteer.oversight.assignments.view` + supervisor membership |
| Exception request (self) | `profile.exception.request_self` (implicit today) |
| Exception **queue** (others) | `roster.exception.review` (future; not in client today) |
| Campaign calendar (full) | `calendar.campaign.view` |
| Event builder | `event.create.draft` |

**Widget rule:** If the user lacks the key, **hide or disable** with explanation (“Ask your coordinator”) — never show empty privileged controls that imply access.

### 7.1 Permission-aware dashboard sections (patterns)

| Pattern | When to use | UX |
|---------|-------------|-----|
| **Gated module** | User lacks `*.view` for that domain | Omit section entirely from layout |
| **Read-only shell** | User has `view` but not `edit` / `manage` | Show aggregates; disable actions; tooltip cites role |
| **Scoped rollup** | User has `S` scope (county/precinct) | Same components as parent role; data layer passes scope filters |
| **Executive snapshot** | Candidate / CM rollup widgets | Only aggregated counts + deep links; keys like `rollup.candidate.tasks.open` (future) |

**Task flows:** List views = RLS-scoped queries. Action buttons (assign, nudge, complete-for-other) = **same key as RPC** checked server-side. Escalation = `task.escalate` + row transition RPC.

**Agent / copilot context:** `agentJonesContextV2` carries `role` for tone — **not** a permission substitute; do not expose privileged aggregates to the model unless the user already passed RLS for that data.

---

## 8. Task assignment chain (conceptual)

| Step | Actor | Capability |
|------|-------|------------|
| Define template | CM / coordinator | `task.template.manage` (future) |
| Create assignment | Coordinator / captain (policy) | `task.assign.volunteer` |
| Accept / claim | Volunteer | implicit with assignee |
| Complete | Volunteer | `task.complete.self` |
| Escalate | Volunteer / intern | `task.escalate` |
| Reassign / nudge | Supervisor | today: supervisor RPCs; map to `task.supervise.nudge`, `task.supervise.reassign` |
| Oversight queue | CM / coordinator / scoped lead | `task.oversight.queue.view` (aggregated blocked/late per scope) |

**Chain visibility:** Each participant sees only rows RLS allows; **managers** see downstream via **scope** + policies.

**Suggested keys (incremental):** `task.create`, `task.assign.volunteer`, `task.assign.intern`, `task.complete.self`, `task.complete.proxy` (rare; admin-only), `task.escalate`, `task.supervise.*`, `task.template.manage`.

### 8.1 Task logic examples (role + scope)

| Actor | Typical capability |
|-------|-------------------|
| **Volunteer** | Complete tasks **assigned to self** only (unless rare proxy policy). |
| **Lead contact** | View **team** tasks, perform check-ins, **escalate** upward — not county-wide assign. |
| **Precinct captain** | **Precinct-scoped** assign (if enabled), view precinct/county events, escalate. |
| **County lead** | **County-scoped** assign; cannot assign campaign-wide admin tasks without extra keys. |
| **Campaign manager** | Assign across **campaign** subject to RPC checks. |
| **Candidate** | **Leadership summaries** and narrative widgets; **not** default broad operational assignment — use explicit product policy if principals dispatch work. |

---

## 9. Calendar & events

### 9.1 Visibility layers

| Layer | Permission idea |
|-------|-----------------|
| **Universal campaign calendar** | `calendar.campaign.view` for aggregated slices; rows filtered by `event.visibility` + RLS. |
| **Team / geography calendar** | `calendar.team.view` or `calendar.scoped.view` — same UI, narrower query. |
| **Draft events** | Visible to creators + users with `event.review` / `event.approve` in scope. |
| **Published events** | Visible per `event.visibility` enum — **enforce in RLS**, not only UI. |

### 9.2 Event lifecycle and permissions (conceptual)

| State | Who can see | Who can transition |
|-------|-------------|-------------------|
| **Draft** | Creator, `event.review`, `event.approve` (scope) | `event.create.draft` → save draft; `event.submit_review` (optional step) |
| **In review** | Reviewers + approvers | `event.review` comment; `event.approve` / reject |
| **Approved (unpublished)** | Approvers + publisher | `event.publish` |
| **Published** | Audience per visibility enum | `event.unpublish` / `event.edit.published` (restricted) |

**Naming:** Prefer `event.transition.submit_review`, `event.transition.approve`, `event.transition.publish` if you need **state-machine clarity**; otherwise `event.approve` / `event.publish` as in §5.

### 9.3 Calendar filtering (implementation guidance)

When rendering the universal calendar:

1. **Fetch** events allowed by RLS for this user (never “fetch all + filter in JS” for sensitive fields).
2. **Partition** by `visibility` / `audience`: internal-only, volunteers, public metadata-only (title/time/location tiering per policy).
3. **Apply scope:** County/precinct leads see org events intersected with their geography; volunteers see published + self + team.
4. **Tasks with due dates** (if merged into calendar): same as task RLS — separate query or unified RPC that respects both models.

### 9.4 Calendar visibility by role (default slices)

These are **product defaults**; RLS remains authoritative. “Sees” means **after** policies filter rows.

| Role | Default calendar slice |
|------|-------------------------|
| **admin** | All layers (draft through published) where policy allows |
| **campaign_manager** | Full campaign operational calendar + internal meetings appropriate to HQ |
| **candidate** | Public events, leadership/strategic internal items, major milestones — **not** every low-level ops event by default |
| **events_coordinator** | All event workflow states in allowed scope (draft/review/published pipeline) |
| **volunteer_coordinator** | Volunteer-relevant + staffing-related + published org events per policy |
| **assistant_campaign_manager** | Same family as CM, narrowed by **lane** scope when configured |
| **county_lead** | County-scoped events + campaign-wide items flagged visible to county leads |
| **precinct_captain** | Precinct + county + approved campaign-wide items |
| **lead_contact** | Team + published volunteer events + assigned operational items |
| **intern** / **volunteer** | Approved public, training, shifts they’re assigned to, and personal-relevant items |
| **communications_lead** / **data_lead** | Ops-shell modules: content deadlines / reporting milestones as configured (same visibility band as ACM/events until split) |

---

## 10. Temporary & contextual overrides (future-friendly)

| Mechanism | Use |
|-----------|-----|
| **Acting role** | Short-lived elevation (e.g. ACM while CM on leave) — store `acting_role_until` + audit row. |
| **Delegation** | User A grants B approval for event type X — separate `delegations` table. |
| **Break glass** | `admin` audit log only. |

v1: **do not implement**; document hooks so keys stay stable.

---

## 11. UI vs backend enforcement

| Concern | UI (React) | Backend (RLS / RPC / Edge) |
|---------|------------|------------------------------|
| Hide nav / route | **Yes** — `Navigate`, lazy routes | Optional: reject unknown routes server-side for APIs only |
| Hide widget | **Yes** | N/A |
| Read sensitive rows | **Never sufficient** | **RLS** must match scope |
| KPI manual adjust / set target | Hide if no key | **RPC** must re-check `is_campaign_leadership` or successor |
| Task assign | Form visibility | **RPC** validates supervisor/captain |
| Event publish | Button state | **RPC** or policy on `events` table |
| Calendar aggregate | Filter layers | Query only returns allowed `event` rows |

**Rule:** Any new privileged mutation → **RPC or policy** first design, then wire UI to the same capability key.

**Summary:**

| Mostly UI | Must be backend-enforced |
|-----------|---------------------------|
| Nav labels, desk layout, hiding widgets | Any read of another person’s PII or assignment details |
| Default redirect target (`RoleHomeRedirect`) | Task assign, complete-on-behalf, escalation resolution |
| Empty states / upsell copy | Event publish, approval, visibility changes |
| Which calendar *layers* to offer | Calendar row visibility and field-level redaction |

---

## 12. Phased implementation (no big-bang)

| Phase | Deliverable |
|-------|-------------|
| **P0** | Document + align `isCampaignLeadershipRole` with `is_campaign_leadership` **or** document exception for `candidate` + adjust RPCs. |
| **P1** | `src/lib/permissions/` — `PERMISSION_KEYS` const + `getDefaultPermissionsForRole(primary_role)` returning `Set<string>`; `usePermissions()` hook (role + optional supervisor flag from existing hooks). |
| **P2** | Route guards: `RequirePermission` wrapper + redirect to safe desk; log missing entitlements. |
| **P3** | Scope: add `county_id` / `precinct_id` (or join tables) on profile; pass into hook + queries. |
| **P4** | DB: `profile_permissions` or role→permission seed table **if** non-devs must change defaults without deploy. |
| **P5** | Calendar/events tables + RLS policies keyed to visibility + scope. |

**Stakeholder “first implementation priorities” (maps to phases above):**

1. Canonical **role** normalization (`primary_role` slugs, routing).  
2. **Route and desk** visibility (P2 + matrix §6).  
3. **Widget-level** visibility (P1 + §7).  
4. **Task** visibility and assignment model (P1, P3, RLS on `volunteer_*` RPCs).  
5. **Calendar/event** visibility model (P5 + §9).  
6. **Backend-first** for: event publish, role/permission changes, admin settings, private geo/team domains (§14).

---

## 13. Biggest implementation implications (future work)

1. **Client vs SQL leadership drift:** `isCampaignLeadershipRole` and `is_campaign_leadership` disagree on `candidate` — fix early or split UI (“view KPIs” vs “mutate targets”) to avoid false confidence.
2. **Route sprawl without guards:** Deep links to `/coordinator` / `/candidate` bypass role intent; **P2 route guards** should pair with **403-safe** RPCs so bookmarking does not leak data.
3. **Membership-aware permissions:** Coordinator-like power from `volunteer_supervisor_teams` must feed the same **`usePermissions()`** graph as `primary_role`, or supervisors will see broken UX despite working RPCs.
4. **Scope columns:** Until `county_id` / `precinct_id` / captain assignments exist on profile or join tables, “scoped” roles will be **indistinguishable from campaign-wide** in the DB — plan migrations before pretending field hierarchy is enforced.
5. **Events + tasks unified policy:** Avoid duplicate contradicting rules across `events` and `volunteer_task_*` tables; shared **visibility enum** and **actor helper** functions reduce RLS bugs.
6. **Do not build desks as isolated pages:** Use **permission-aware shells** and reusable widgets (`campaign-dashboard-role-architecture.md`); centralize resolution (§3.1) instead of scattered `if (role === …)` checks.
7. **Calendar and task systems permission-first:** Building “open” widgets first makes RLS retrofit expensive; design **read paths** with policy in mind from the first migration.

---

## 14. Backend enforcement priority (do these first when building features)

Order reflects **severity if UI-only**: cross-profile abuse risk.

| Priority | Permission / concern | Why |
|----------|---------------------|-----|
| **P0** | `admin.profile.role_set`, integration tokens, break-glass | Account takeover / data exfil |
| **P0** | `task.assign.*`, `task.supervise.*`, intern pipeline mutations | Wrong assignee, harassment, data integrity |
| **P0** | `event.publish`, `event.visibility` changes | Public disclosure, legal/comms risk |
| **P1** | `roster.exception.review`, bulk profile read | PII exposure |
| **P1** | `kpi.manage.targets`, manual adjust RPCs | Strategic numbers tampering |
| **P2** | `calendar.campaign.view` row sets | Often derivable from P0 if events table is tight; still enforce RLS |
| **P2** | `route.desk.*` | UX + defense in depth; **not** a substitute for P0–P1 |

**Rule of thumb:** If a volunteer could **infer another volunteer’s** tasks, shifts, or contact info by crafting a request, that read path needs **RLS or parameterized RPC** before ship.

---

## 15. Naming checklist for engineers

- **Role slug:** `snake_case`, stored in `campaign_profiles.primary_role` (see dashboard architecture doc).
- **Permission key (canonical in code):** `domain.resource.verb[.qualifier]`, lowercase, **dot-separated** (§5).
- **Scope:** `scope.{type}` in docs; DB FKs use `{type}_id`.
- **RPC prefix:** keep existing `kpi_*`, `volunteer_*`; new: `perm_check_*` only if centralizing (optional).

### 15.1 Stakeholder alias keys (snake_case) → canonical dots

Some plans use **flat snake_case** (`view_tasks`, `publish_events`). **Implement in TypeScript with dot keys**; aliases can map 1:1 for imports or CMS.

| Stakeholder-style (illustrative) | Canonical key (prefer) |
|----------------------------------|-------------------------|
| `view_dashboard` / desk-specific `view_candidate_desk` | `route.desk.volunteer.view`, `route.desk.candidate.view`, … |
| `view_tasks` | `task.view` or `task.assignments.view` (split list vs detail if needed) |
| `assign_tasks` | `task.assign.volunteer` |
| `edit_tasks` | `task.edit` (scoped) |
| `complete_tasks` | `task.complete.self` |
| `escalate_tasks` | `task.escalate` |
| `view_calendar` | `calendar.campaign.view` / `calendar.scoped.view` |
| `create_events` | `event.create.draft` |
| `review_events` | `event.review` |
| `approve_events` | `event.approve` |
| `publish_events` | `event.publish` |
| `view_kpis` | `kpi.view.org` |
| `manage_kpis` | `kpi.manage.targets`, `kpi.manual_adjust` |
| `manage_volunteers` | `volunteer.oversight.*`, roster keys TBD |
| `manage_roles` / `manage_permissions` / `manage_system` | `admin.profile.role_set`, `admin.permission.*`, `admin.system.*` |

**Combined shape (policy objects):** `{ key: 'task.assign.volunteer', scopes: ['county'] }` — same intent as stakeholder `{ key: 'assign_tasks', scopes: ['county'] }`.

---

## 16. Maintenance

When adding a route or privileged RPC:

1. Add row to §6 matrix (this doc).  
2. Add key to P1 constants when hook lands.  
3. Update RLS/RPC ticket with scope + verb.  
4. Note client/server drift in PR if `isCampaignLeadershipRole` and DB helper differ.  
5. Update §9.2 if event states change; update §6.1 / §9.4 if role calendar defaults change; update `campaign-dashboard-role-architecture.md` rollup keys if executive surfaces consume new aggregates.

---

*End of permission architecture — implement in phases; keep Supabase as source of truth for data access.*
