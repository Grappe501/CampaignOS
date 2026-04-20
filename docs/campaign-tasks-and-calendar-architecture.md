# Universal tasks & campaign calendar architecture

**Status:** Planning only — describes shared engines for future desks; does not mandate immediate schema changes.  
**Companions:** `docs/campaign-dashboard-role-architecture.md`, `docs/campaign-permissions-and-access-model.md`.

---

## Part A — Audit: task-related reality in the repo today

### A.1 Volunteer mission system (primary “assignable work” for volunteers)

| Piece | Location / tables | Role |
|--------|-------------------|------|
| Templates | `volunteer_task_templates` | Catalog: `template_key`, title, `task_type` (onboarding, outreach, training, **event**, admin, power5), priority, optional KPI link (`kpi_slug`, `kpi_contribution` per `20260430130000_campaign_kpi_mission_system.sql`) |
| Task instance | `volunteer_tasks` | Concrete row per mission instance |
| Assignment | `volunteer_task_assignments` | Assignee, assigner, `due_at`, **status** (`assigned`, `in_progress`, `completed`, `blocked`, `skipped` in migration; client/RPC also supports claim, decline, etc.) |
| Audit stream | `volunteer_task_events` | Assignment lifecycle events |
| Workspace UI spec | `workspace_spec` JSONB → `src/lib/volunteerTaskWorkspace.ts` | Sections + checklist for in-app mission workspace |
| Client hook | `useVolunteerTasks` | Loads assignee’s active + recent; sync via `volunteer_sync_tasks_for_profile` |
| RPCs | `src/lib/taskEngine.ts` | assign, complete, claim, checklist, decline, skip, sync |

**Supervisor / coordinator overlay**

| Piece | Location | Role |
|--------|----------|------|
| Team scope | `volunteer_supervisor_teams` | Who may supervise whom |
| Read model | `volunteer_supervisor_task_assignments_v` | `fetchSupervisorTeamAssignments` in `supervisorTasks.ts` |
| Actions | RPCs | reassign, block, nudge; dispatch uses `volunteer_assign_task` |

This stack already supports **leadership → volunteer** assignment, **escalation-like** states (`blocked`), and **KPI linkage** on completion.

### A.2 Onboarding / workspace catalog tasks (structured path)

| Piece | Tables | Role |
|--------|--------|------|
| Catalog | `workspace_tasks` | Ordered “first task” / training path definitions |
| Progress | `workspace_profile_tasks` | Per-profile status; `useTasks` exposes current structured card |

**Nature:** Progression gating and copy for the volunteer journey — **not** the same as mission assignments, but UX treats both as “tasks.”

### A.3 Daily activation (UTC day missions)

| Piece | Location | Role |
|--------|----------|------|
| Engine | `src/lib/dailyMissionEngine.ts`, `useDailyMission` | Multi-lane daily checklist (communications, voter, events, leadership); scoring, streaks, team tier |
| Migration | `20260429170000_adaptive_daily_activation.sql` | Separate tables from volunteer mission assignments |

**Nature:** **Habit / activation** layer — parallel to `volunteer_task_assignments`, not unified in DB today.

### A.4 Intern layer

| Piece | Tables | Role |
|--------|--------|------|
| Pipeline + leadership work | `intern_assignments`, pipeline tables (`20260420140000_intern_layer_system.sql`) | Contact queue, escalate/reassign flows |

**Nature:** Some work surfaces as volunteer mission tasks; pipeline is **domain-specific** but should **link** to universal task/event IDs when those exist.

### A.5 KPI missions (program scaffolding)

| Piece | Tables | Role |
|--------|--------|------|
| `campaign_missions`, `mission_progress` | KPI system | Program-level targets; not a personal task inbox |

### A.6 Calendar / events in repo today

- **No** first-class `campaign_events` or calendar API in the codebase (grep: no calendar module).
- **Election clock** (`src/lib/campaignClock.ts`) is a **fixed countdown**, not an event store.
- Volunteer **template keys** include `event_attend_local`, `event_host_small_gathering` — these are **mission types**, not scheduled calendar rows.
- **Power5** logs `eventType` in UI state — relational graph events, not campaign calendar.

**Conclusion:** Calendar/event engine is **greenfield** in DB; tasks are **partially unified** around `volunteer_*` with **parallel** daily + workspace systems.

---

## Part B — Universal task system (target architecture)

### B.1 Design goals

1. **One mental model** for users: “My work” aggregates personal, assigned, and event-linked items.
2. **Preserve** investement in `volunteer_task_*` RPCs, RLS, templates, supervisor flows — **evolve** rather than replace.
3. Support **scope** (campaign / county / precinct / team / self) and **chain** (assigner → assignee → reviewer).
4. Allow **event-linked** tasks (shift check-in, setup, follow-up) without duplicating schedule truth.

### B.2 Conceptual layers

```
[ Task definition / template ]  →  [ Task instance ]  →  [ Assignment(s) ]  →  [ Lifecycle + audit ]
```

- **Definition:** Template or ad-hoc blueprint (title, type, checklist spec, default duration).
- **Instance:** Runnable unit (may be 1:1 with template spawn).
- **Assignment:** Binds instance to **assignee** + optional **reviewer** + **due** + **scope**.
- **Audit:** Append-only events (mirror `volunteer_task_events` pattern).

### B.3 Canonical task model (recommended fields)

*Logical* model — physical mapping can stay in `volunteer_task_assignments` + extensions for years.

| Field | Purpose |
|-------|---------|
| `id` | UUID primary key (assignment id in current system) |
| `task_family` | Enum: `mission` \| `workspace_catalog` \| `daily_activation` \| `intern_pipeline` \| `event_derived` \| `adhoc` (for aggregation/filtering) |
| `source_id` | FK to origin row (assignment id, workspace_profile_tasks id, daily row id, etc.) |
| `template_key` | Optional; aligns with `volunteer_task_templates.template_key` |
| `title` / `description` | Display |
| `task_type` | Align with existing check: onboarding, outreach, training, event, admin, power5 (+ future `operations`, `compliance`) |
| `status` | **Canonical lifecycle** (see B.4) |
| `priority` | low / medium / high / urgent |
| `assignee_profile_id` | Owner of execution |
| `assigned_by_profile_id` | Who delegated |
| `reviewer_profile_id` | Optional QA / coordinator review |
| `due_at` | When work should complete |
| `scope_type` | `campaign` \| `county` \| `precinct` \| `team` \| `self` |
| `scope_refs` | JSON or FKs: `{ county_id?, precinct_id?, team_id? }` |
| `event_id` | Optional FK to campaign event (when calendar exists) |
| `kpi_slug` / `kpi_contribution` | Optional; already on template |
| `escalation_state` | `none` \| `pending_review` \| `escalated` \| `resolved` |
| `checklist_progress` | JSONB (existing pattern) |
| `created_at` / `updated_at` / `completed_at` | Standard |

**Status lifecycle (canonical)**

| Status | Meaning |
|--------|---------|
| `draft` | Not yet assigned (adhoc / event-generated) |
| `assigned` | Ready for assignee |
| `in_progress` | Claimed / started |
| `blocked` | Waiting on external input |
| `pending_review` | Done by assignee; reviewer must close |
| `completed` | Terminal success |
| `skipped` / `cancelled` | Terminal non-success |
| `declined` | Assignee refused; triggers reassignment rules |

Map current DB statuses to this set in migrations when unifying; today `blocked`/`skipped`/`completed` already exist for missions.

### B.4 Ownership & assignment chain

1. **Creator** (CM, coordinator, system job) creates instance or triggers template spawn.
2. **Assigner** records `assigned_by_profile_id` (nullable for auto-sync rules).
3. **Assignee** executes; may **decline** or **escalate** (intern pipeline already has patterns).
4. **Reviewer** (optional) — coordinator or captain; closes `pending_review`.
5. **Supervisor** retains **nudge / reassign / block** — already modeled in RPCs.

Permissions: use `docs/campaign-permissions-and-access-model.md` keys (`task.assign.volunteer`, etc.); **RLS** must match assigner/assignee/supervisor scopes.

### B.5 How current systems should evolve

| System | Reuse | Stay role-specific? | Unify later? |
|--------|-------|---------------------|--------------|
| `volunteer_task_*` | **Core** of universal missions; keep RPCs | Coordinator dispatch + volunteer UX stay primary | Add nullable `event_id`, `scope_*`, `task_family` via migrations |
| `workspace_profile_tasks` | Keep for **onboarding path** | Yes — different UX (ordered catalog) | **Federated “My work”** view that includes both rows in one API/hook |
| Daily activation | Keep engine | Yes — daily habit product | Optional: `task_family = daily_activation` in aggregator only |
| Intern pipeline | Keep pipeline tables | Yes — contact semantics | Link **generated** `volunteer_task_assignments` to `intern_assignment_id` or unified `source_id` |
| `campaign_missions` | KPI rollup | Not personal inbox | Tasks **contribute** to missions via existing KPI path |

**Do not** rip out `volunteer_task_assignments` — **extend** and **wrap** with a read model (`campaign_task_feed_v` or client-side merge) for “universal inbox.”

---

## Part C — Universal campaign calendar & events

### C.1 Design goals

1. **First-class** schedule in Postgres with **RLS + visibility** (see permissions doc).
2. Support **internal** vs **volunteer-facing** vs **public metadata** events.
3. **Milestones** (filing, finance deadlines) as events with type = `deadline`.
4. **County/precinct** scoping for field programs.
5. **Google Calendar** later: treat as **sync projection**, not source of truth v1.

### C.2 Canonical event model (recommended)

| Field | Type / notes |
|-------|----------------|
| `id` | UUID |
| `title` | Required |
| `description` | Rich text or markdown (product choice) |
| `event_type` | Enum: `campaign_wide` \| `internal_meeting` \| `volunteer_shift` \| `training` \| `public_event` \| `deadline` \| `canvass` \| `phone_bank` \| `other` |
| `starts_at` / `ends_at` | `timestamptz` |
| `timezone` | IANA string (e.g. `America/Chicago`) — display + sync |
| `location_label` | Free text (“HQ”, “Zoom”) |
| `location_lat` / `location_lng` | Optional |
| `visibility` | Enum: `internal` \| `staff` \| `volunteers` \| `county` \| `precinct` \| `public_summary` (no sensitive ops detail) |
| `visibility_scope` | Optional JSON: `{ county_id?, precinct_id?, team_id?, role_slugs[]? }` |
| `owner_profile_id` | Accountable organizer |
| `created_by_profile_id` | Creator |
| `publication_state` | `draft` \| `pending_review` \| `approved` \| `published` \| `archived` |
| `staffing_notes` | Text or JSON needs: roles, headcount |
| `max_volunteers` | Optional cap |
| `related_task_template_keys` | Optional array — spawn tasks on publish |
| `sync_provider` | Nullable: `google` \| `none` |
| `sync_external_id` | Nullable string |
| `sync_last_at` | Nullable `timestamptz` |
| `sync_status` | `idle` \| `pending` \| `error` \| `ok` |

**Related tasks**

- `campaign_event_tasks` junction: `event_id`, `assignment_id` (volunteer assignment) or future generic task id — links schedule to **follow-up** work.

### C.3 Event intake workflow

| Stage | Actor | System behavior |
|-------|--------|-----------------|
| **1. Submission** | Field lead / events coordinator / volunteer (policy) | Create row `publication_state = draft`; optional `visibility` proposal |
| **2. Review** | CM or delegate | Comment thread (future) or status only v1 |
| **3. Approval** | Role with `event.approve` | `pending_review` → `approved` |
| **4. Publication** | Role with `event.publish` | `approved` → `published`; **RLS** exposes row to wider audiences per `visibility` |
| **5. Staffing / task generation** | System job or RPC on publish | Create `volunteer_task_assignments` or adhoc tasks from `related_task_template_keys` |
| **6. Execution** | Volunteers | Shift check-in tasks, mission completion |
| **7. Post-event follow-up** | Coordinator | Auto or manual tasks (`task_family = event_derived`) |

### C.4 Google Calendar (later)

- **Outbound:** On `published` + `sync_provider = google`, enqueue sync (Netlify function or Edge).
- **Inbound:** Webhook or periodic pull → **update** `starts_at`/`ends_at` only if `sync_external_id` matches; conflict policy = **DB wins** or **prompt** (product).
- Store **raw payload** hash in `sync_metadata` JSONB for debugging.

---

## Part D — UI consumption patterns

### D.1 Full calendar widget

- **Component:** Month/week agenda view; filter chips by `event_type` and **my role scope**.
- **Data:** Single query/RPC `list_events_for_profile(p_from, p_to)` applying RLS.
- **Actions:** Create event (if permitted), open detail drawer, link to related tasks.

### D.2 “What’s coming up” strip (under header)

- **Placement:** Below `ElectionCountdownBar` or below `app-topbar-main` in `AppHeader` / shared layout wrapper — **one** strip component reused on desks.
- **Content:** Next **3–5** items: mix of **published events** (in window) + **tasks due soon** (from unified feed) + **deadlines** (`event_type = deadline`).
- **Permissions:** Strip calls same feed endpoint; **no** extra client-side security assumptions.

### D.3 Role-filtered upcoming

- **Volunteer:** `visibility` in (`volunteers`, `public_summary`) + scoped geography if profile has county/precinct.
- **Coordinator:** Team + county + internal.
- **Candidate / CM:** Campaign-wide + internal + key public milestones.

### D.4 Dashboard widgets

| Widget | Data source |
|--------|-------------|
| Upcoming deadlines | Events where `event_type = deadline` + `publication_state = published` |
| My assignments | Unified task feed (missions + optional workspace “current” row) |
| Event shifts I signed up for | Future: `event_rsvps` table — out of scope for this doc’s minimum |

### D.5 Workspace dock / composition

- Add glyph + panel: `campaign-calendar` / `upcoming-strip` in `workspaceDockModel.ts` when dashboard gains calendar section.
- Order: after **daily activation** or **KPIs** per product (events often tie to field work).

---

## Part E — Phased implementation order (no Google first)

| Phase | Scope | Deliverables |
|-------|--------|--------------|
| **E0** | Documentation | This doc + permission keys for `event.*` and `calendar.*` |
| **E1** | Read-only events | Migrations: `campaign_events` + RLS; seed a few milestones; RPC `list_events_for_profile` |
| **E2** | Header strip | `UpcomingStrip` component; wired on `/dashboard` + leadership desks |
| **E3** | Task feed v1 | Client hook `useCampaignTaskFeed` merging `useVolunteerTasks` + optional workspace current task (read-only merge, no new table) |
| **E4** | Calendar page / widget | Full calendar route or modal; filters |
| **E5** | Intake workflow | Draft → review → approve → publish states + UI for events coordinator / CM |
| **E6** | Event → task generation | On publish, RPC creates assignments from template keys |
| **E7** | Scope columns | County/precinct on profile + event visibility_scope |
| **E8** | Google sync | Provider adapter; `sync_*` fields populated |

---

## Part F — Engineering notes

- **RLS first:** Event visibility must match `campaign-permissions-and-access-model.md`; strip and calendar are **not** trusted filters alone.
- **KPI completion:** Keep using `kpi_apply_volunteer_task_completion` path when spawning event-linked missions.
- **Naming:** Tables `campaign_events`, optional `campaign_event_rsvps`, `campaign_event_tasks`; task feed view `campaign_task_feed_v` (future).
- **Agent Jones:** Extend context with `next_events[]` + `tasks_due_soon[]` once feeds exist (separate task).

---

*End of architecture — implement E1–E4 before any Google integration.*
