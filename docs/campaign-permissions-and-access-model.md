# Campaign permissions & access model (architecture)

**Status:** Planning only — no auth or RLS changes implied by this document alone.  
**Audience:** Engineers implementing desks, calendar, events, and task flows on Supabase + React.  
**Companion:** `docs/campaign-dashboard-role-architecture.md` (desks and routes).

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
| Intern capability | `useInternLayer`, intern migrations | Server checks `primary_role = 'intern'` in multiple places; coordinator checks exist for supervisor flows. |

**Gap to track:** Principal (`candidate`) can see KPI target controls in the app if `isCampaignLeadershipRole` matches, but **RPCs** that call `is_campaign_leadership` may **deny** unless extended or candidate is also a supervisor. Future work: align DB helper with product policy or add a separate `principal` branch in RPCs.

### 1.2 Route guards

- **`App.tsx`:** Routes require session only; **`/candidate` and `/coordinator` are not gated** by `primary_role` (any signed-in user can open URLs).
- **Product implication:** “Permission model” must eventually include **route entitlement** (UI redirect + optional Edge/middleware) and **data entitlement** (RLS/RPC).

### 1.3 Existing pattern: capability via membership, not only role

- **Supervisor missions:** Visibility/actions tied to **`volunteer_supervisor_teams`**, not only `primary_role` (matches DB `is_campaign_leadership` second clause).
- **Implication:** Permissions should support **`role_defaults` + `membership_overrides`** (see §4).

---

## 2. Design principles

1. **Defense in depth:** UI gating for UX; **RLS + RPC** for real security on shared tables. Never rely on UI alone for sensitive reads/writes.
2. **Incremental:** Introduce a **permission key** vocabulary before building a full ABAC engine. First phase: **role → default permission set** in code or a small JSON/DB table.
3. **Scope-first for field:** County/precinct/team restrictions are **scopes** applied on top of **verbs** (view vs assign).
4. **One campaign per deployment (v1):** Model assumes a single campaign context; multi-tenant is out of scope unless `campaign_id` already exists on rows.
5. **Align names** with `docs/campaign-dashboard-role-architecture.md` canonical `primary_role` slugs.

---

## 3. Model overview (three layers)

```
Subject: campaign_profiles.id (+ auth.uid())
├── Layer A: Role (primary_role)           → default bundles, routing, coarse labels
├── Layer B: Scope (geography / team)      → which rows are visible/assignable
└── Layer C: Capabilities (permission keys) → fine-grained actions
```

- **Layer A** is **already present** (`primary_role`); extend only by tightening allowed slugs in DB later.
- **Layer B** is **partially present** (`power5_home_team_id`, supervisor team links, future county/precinct FKs).
- **Layer C** is **to be introduced** as explicit keys (constants or `profile_permissions` table later).

---

## 4. Scope model

| Scope key | Meaning | Example use |
|-----------|---------|-------------|
| `scope.campaign` | Entire campaign (all data policy allows) | CM calendar, global KPI read |
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

---

## 7. Dashboard & widget visibility

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

---

## 8. Task assignment chain (conceptual)

| Step | Actor | Capability |
|------|-------|------------|
| Define template | CM / coordinator | `task.template.manage` (future) |
| Create assignment | Coordinator / captain (policy) | `task.assign.volunteer` |
| Accept / claim | Volunteer | implicit with assignee |
| Complete | Volunteer | `task.complete.self` |
| Escalate | Volunteer / intern | `task.escalate` |
| Reassign / nudge | Supervisor | today: supervisor RPCs; map to `task.supervise.*` |

**Chain visibility:** Each participant sees only rows RLS allows; **managers** see downstream via **scope** + policies.

---

## 9. Calendar & events

| Layer | Permission idea |
|-------|-----------------|
| **Universal campaign calendar** | `calendar.campaign.view` for aggregated “public + internal” slices; actual rows filtered by `event.visibility` + RLS. |
| **Draft events** | Visible to creators + approvers (`event.approve`). |
| **Published events** | Visible per `event.visibility` enum (`internal`, `volunteers`, `public_meta_only`, etc.) — **enforce in RLS**, not only UI. |

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

---

## 13. Naming checklist for engineers

- **Role slug:** `snake_case`, stored in `campaign_profiles.primary_role` (see dashboard architecture doc).
- **Permission key:** `domain.resource.verb[.qualifier]`, lowercase, dots.
- **Scope:** `scope.{type}` in docs; DB FKs use `{type}_id`.
- **RPC prefix:** keep existing `kpi_*`, `volunteer_*`; new: `perm_check_*` only if centralizing (optional).

---

## 14. Maintenance

When adding a route or privileged RPC:

1. Add row to §6 matrix (this doc).  
2. Add key to P1 constants when hook lands.  
3. Update RLS/RPC ticket with scope + verb.  
4. Note client/server drift in PR if `isCampaignLeadershipRole` and DB helper differ.

---

*End of permission architecture — implement in phases; keep Supabase as source of truth for data access.*
