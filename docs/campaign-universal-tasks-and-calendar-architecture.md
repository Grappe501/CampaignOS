# Universal task engine & campaign calendar architecture

**Status:** Planning only — no schema or product implementation implied.  
**Audience:** Engineers building desks, coordinator tools, and calendar UX on the existing Supabase stack.  
**Companions:**  
- `docs/campaign-permissions-and-access-model.md` — visibility, scopes, route keys.  
- `docs/campaign-dashboard-role-architecture.md` — desks, rollups, canonical `primary_role` slugs.

**Intent:** Tasks and calendar/events are **shared campaign engines** under every desk — not one-off features per role. Existing volunteer/mission code **evolves** into a canonical model; calendar is **greenfield** but permission-first from the first migration.

---

## 1. Goals

1. **One conceptual task engine** that leadership and field roles can use for assignable work, escalations, and review — while **preserving** today’s working volunteer coordinator stack.  
2. **One first-class campaign calendar** (app-native) with permission-based visibility, event intake, and publishing — **before** Google Calendar sync.  
3. **UX:** full calendar widget + a compact **“what’s coming up”** strip (and role-filtered feeds) that can sit in the shell **below** the existing header countdown (`ElectionCountdownBar` in `AppHeader.tsx`).

---

## 2. Current repo audit — task-related architecture

### 2.1 Volunteer coordinator mission system (assignable “missions”)

**Tables (migration `20260429120000_volunteer_coordinator_task_system.sql`):**

| Artifact | Role |
|----------|------|
| `volunteer_task_templates` | Catalog: `template_key`, `task_type`, priorities, optional links to onboarding/Power5/training, **`kpi_slug` / `kpi_contribution`** (extended in KPI migration). |
| `volunteer_tasks` | Concrete task instances (often from template). |
| `volunteer_task_assignments` | **Assignee**, status (`assigned`, `in_progress`, `completed`, `blocked`, `skipped`), `due_at`, `assigned_by_profile_id`, checklist JSON. |
| `volunteer_task_events` | Audit: `assigned`, `started`, `completed`, `blocked`, `reassigned`, `nudge`, etc. |
| `volunteer_supervisor_teams` | Supervisor ↔ `power5_teams` scope for oversight RPCs. |
| `volunteer_engagement_scores` | Points / streaks surfaced in `useVolunteerTasks`. |

**Client:**

- `src/hooks/useVolunteerTasks.ts` — assignee view, sync via `volunteer_sync_tasks_for_profile`, mutations through `taskEngine.ts` RPCs.  
- `src/lib/supervisorTasks.ts` — `volunteer_supervisor_task_assignments_v`, reassign / block / nudge, `volunteer_assign_task` for dispatch.  
- `src/lib/volunteerTaskWorkspace.ts` — `workspace_spec` JSON on tasks (sections + checklist).

**Verdict:** This is the **strongest foundation** for “role-assigned tasks,” coordinator follow-up, and volunteer execution. It already has templates, assignments, supervisor scope, and audit events.

### 2.2 Workspace onboarding track (structured catalog)

**Tables:** `workspace_tasks`, `workspace_profile_tasks` (not fully quoted here — see `useTasks.ts`).

**Client:** `src/hooks/useTasks.ts` — linear “current” onboarding/workspace step with `sort_order`, `status`, humanized labels. **`src/hooks/useTraining.ts`** — training modules tied to workspace/volunteer flows where configured.

**Verdict:** **Keep separate.** This is a **guided program track**, not general task ops. Future: link a workspace step to a `volunteer_task_template` if you want one surface to drive both.

### 2.3 Daily activation engine (per-day missions)

**Tables:** `daily_missions`, `daily_tasks`, `user_scores`, lane/behavior tables (see `dailyMissionEngine.ts`, migrations).

**Client:** `src/hooks/useDailyMission.ts` — ephemeral **today** tasks by lane (`communications`, `voter`, `events`, `leadership`).

**Verdict:** **Keep separate** as the “habit / activation” product. Optionally **surface** daily tasks in a unified “My work today” UI by merging lists in the client (same permission as self).

### 2.4 KPI missions (campaign goals decomposition)

**Tables:** `campaign_kpis`, `campaign_missions`, `mission_progress`, `kpi_updates` (`20260430130000_campaign_kpi_mission_system.sql`).

**Semantics:** `campaign_missions` rows decompose KPIs with `assigned_scope` (`global`, `team`, `role`) — **scaffolding for org progress**, not the same row type as `volunteer_task_assignments`.

**Client:** `useCampaignKpis.ts` + `kpiEngine.ts`; leadership sees mission definitions when `isCampaignLeadershipRole` matches.

**Verdict:** Treat as **outcome layer**. Volunteer task completion can already feed KPIs via template `kpi_slug` / `kpi_contribution`. Do not merge `campaign_missions` rows into assignment tables; **link** via KPI slug and reporting.

### 2.5 Intern pipeline (specialized queue)

**Tables / RPCs:** `intern_assignments`, `volunteer_contact_pipeline`, intern RPCs (`20260420140000_intern_layer_system.sql`).

**Verdict:** **Role-specific workflow** with its own state machine. Universal task model should allow **`source_system = 'intern_pipeline'`** + foreign key optional so intern UIs stay specialized while still appearing in “my open work” aggregates if desired.

### 2.6 Calendar / events in repo today

There is **no** first-class `campaign_events` (or similar) table in the audited migrations. Copy references “calendar” in narratives (`candidateDeskNarrative`, `CandidateElectionStrategicCard`) and task templates include `event_attend_local` / `event_host_small_gathering` — **behavioral tasks**, not calendar rows.

**Verdict:** Calendar + event intake are **greenfield data models** that must align with `campaign-permissions-and-access-model.md` when implemented.

---

## 3. Universal task system — target architecture

### 3.1 Task domains (logical, not necessarily one table day one)

| Domain | Current anchor | Universal concepts |
|--------|----------------|-------------------|
| **Assignable work** | `volunteer_task_*` | Template → instance → assignment; supervisor scope; audit. |
| **Onboarding track** | `workspace_profile_tasks` | Programmed sequence; optional bridge to templates. |
| **Daily activation** | `daily_tasks` | Date-scoped habits; not escalated the same way. |
| **Goal decomposition** | `campaign_missions` | KPI subdivisions; progress rollup. |
| **Intern queue** | intern tables | Pipeline stages; reassignment rules. |

**Principle:** Introduce a **unified “task facade” in the product** (one hook or RPC that returns **normalized DTOs** for “open work,” “due soon,” “blocked”) without forcing a single physical table immediately. Phase 1 = **normalize volunteer assignments** + optional personal rows; Phase 2+ = add `campaign_tasks` parent or widen `volunteer_tasks` with nullable scope/event links.

### 3.2 Flow: leadership → managers → field → volunteers

1. **Define** work: templates (existing) or ad-hoc tasks (future).  
2. **Scope** work: campaign, county, precinct, team, event (future FKs).  
3. **Assign**: coordinator / captain uses existing or extended RPCs; chain stored in `assigned_by_profile_id` + audit.  
4. **Execute**: volunteer uses assignment UX (`useVolunteerTasks` patterns).  
5. **Escalate / block**: `blocked` + reason + supervisor queue (existing supervisor RPCs); add **explicit review states** if product needs CM approval (see §4.2).  
6. **Complete**: existing completion + optional KPI apply (`kpi_apply_volunteer_task_completion`).

### 3.3 Assignment chain (downstream + reporting)

The model should allow **downward assignment** and **upward visibility** (aggregates/RPCs), bounded by permissions:

| Step | Example |
|------|---------|
| HQ → coordination | Admin / **campaign_manager** assigns or approves work owned by **volunteer_coordinator** |
| Coordination → field | Coordinator assigns to **county_lead** or directly to captains/volunteers (today: `volunteer_assign_task`) |
| Field → field | **County lead** → **precinct_captain** → **lead_contact** / **volunteer** |
| Execution | Volunteer / intern **completes**; blocked/escalated flows bubble to supervisor views |

Not every role needs assign powers; the **data shape** should still support the chain so new desks do not fork the model.

---

## 4. Canonical task model (recommended)

### 4.1 Core entities (logical)

| Entity | Purpose |
|--------|---------|
| **Task definition** | What the work is (title, description, type, checklist spec, optional template key). |
| **Assignment** | Who does it, due date, status, checklist progress, assigner. |
| **Scope** | Where it applies: `campaign` \| `county` \| `precinct` \| `team` \| `self` \| `event` (future). |
| **Linkage** | Optional: `event_id`, `kpi_slug`, `intern_pipeline_id`, `workspace_task_id`. |
| **Audit trail** | Append-only events: assign, start, nudge, reassign, block, escalate, complete, skip. |

### 4.2 Logical “unified task” DTO (stakeholder map → repo)

Stakeholder docs may use `user_id`; **CampaignOS today keys assignments to `campaign_profiles.id`** (`assignee_profile_id`, `assigned_by_profile_id`). When reading the table below, substitute **profile** for “user” unless the row lives in Auth.

| Logical field | Repo anchor (today / planned) |
|---------------|-------------------------------|
| `id` | `volunteer_task_assignments.id` (per assignee instance) + `volunteer_tasks.id` (task row) |
| `title`, `description`, `task_type`, `priority` | `volunteer_tasks` |
| `status` | `volunteer_task_assignments.status` |
| `scope_type` / `scope_id` | Plan: **`scope_kind`** + optional `county_id` / `precinct_id` / `team_id` / `event_id` |
| `assigned_to` / `assigned_by` | `assignee_profile_id`, `assigned_by_profile_id` |
| `owner` | `created_by_profile_id` on task or policy-defined owner |
| `due_at`, `completed_at`, `completion_notes` | Assignment columns |
| `requires_review`, `review_status` | Plan: extend assignment or side table |
| `escalation_status` | Plan: enum + metadata; today partially **`blocked`** + supervisor queue |
| `visibility_level` | Plan if tasks ever differ from assignee visibility; else inherit RLS |
| `start_at` | Optional; plan if needed for Gantt-style work |
| `archived_at` | Soft-delete / history |
| `checklist` / subtasks | `checklist_progress` jsonb + `workspace_spec` |
| `tags` | Optional jsonb |
| `recurrence` | Future; daily activation stays separate until product merges |
| `source_system` | Plan: `mission`, `daily_activation`, `event_workflow`, `workspace`, `intern_pipeline`, `manual` |
| Audit | `volunteer_task_events` |

### 4.3 Recommended fields (evolution of current rows)

**On `volunteer_tasks` / assignments (additive over time):**

| Field | Type | Notes |
|-------|------|--------|
| `id` | uuid | Existing. |
| `template_key` | text | Existing on assignment + task. |
| `title`, `description` | text | Existing. |
| `task_type` | enum | Existing: onboarding, outreach, training, event, admin, power5 — extend only with migration discipline. |
| `priority`, `estimated_minutes` | | Existing. |
| `assignee_profile_id` | uuid | Assignment table. |
| `assigned_by_profile_id` | uuid | Existing. |
| `due_at` | timestamptz | Existing. |
| `status` | enum | **Extend carefully:** today `assigned`, `in_progress`, `completed`, `blocked`, `skipped`. Plan adds: `declined` (if not folded into events), `pending_review`, `escalated` — **requires RPC + UI migration.** |
| `checklist_progress` | jsonb | Existing pattern. |
| `workspace_spec` | jsonb | Existing on task. |
| **`scope_kind`** | text | New: `campaign` \| `county` \| `precinct` \| `team` \| `event` \| `self`. |
| **`county_id`** | uuid nullable | New when geography exists on profiles/org. |
| **`precinct_id`** | uuid nullable | New. |
| **`team_id`** | uuid nullable | May mirror Power5 team when task is team-scoped. |
| **`event_id`** | uuid nullable | When calendar ships — links assignment to event staffing. |
| **`source_system`** | text | `volunteer_coordinator`, `intern_pipeline`, `personal`, `event_engine`, etc. |
| **`escalated_to_profile_id`** | uuid nullable | Optional explicit escalation target. |
| **`reviewed_by_profile_id`** / **`reviewed_at`** | nullable | For CM/coordinator review gates. |

**Personal tasks (if product requires):** either `source_system = 'personal'` + `assignee_profile_id = created_by_profile_id` with RLS “own row only,” or a small `personal_tasks` table merged in the facade.

### 4.4 Status lifecycle (recommended)

```
draft (optional, coordinator-only)
  → assigned → in_progress → completed
                 ↓              ↑
              blocked ─────────┘ (after unblock)
                 ↓
            skipped / declined (policy)
                 ↓
         pending_review → (approved) → completed  [optional gate]
                 ↓
            escalated → reassigned / resolved
```

Map to **existing** statuses first; add new values only with DB checks and RPC updates.

**Extended status vocabulary (target — reconcile with CHECK constraints when migrating):**

| Status | Use |
|--------|-----|
| `draft` | Coordinator-created not yet assigned |
| `open` | Optional pool/claim pattern (if product adds) |
| `assigned` | Default enqueue |
| `in_progress` | Claimed / started |
| `blocked` | Needs attention |
| `awaiting_review` | Same intent as `pending_review` / gate after complete |
| `completed` | Done |
| `cancelled` | Supersedes skip/decline in some policies |
| `archived` | Historical |

**Escalation sub-state (orthogonal or jsonb metadata):** `none` → `needs_attention` → `escalated` → `resolved`.

**Review sub-state:** `not_required` \| `pending_review` \| `approved` \| `rejected` (for tasks that require CM/coordinator sign-off).

### 4.5 Ownership model

- **Creator** (`created_by_profile_id` on `volunteer_tasks` — already present).  
- **Assigner** (`assigned_by_profile_id` on assignment).  
- **Assignee** (assignment).  
- **Supervisor** (implicit via `volunteer_supervisor_teams` + RPCs).  
- **Reviewer** (future CM / lead for `pending_review`).

### 4.6 Audit trail expectations

- Continue **`volunteer_task_events`** pattern: every transition writes an event with `actor_profile_id` + `metadata` JSON (reason codes, old/new assignee).  
- For compliance-sensitive actions (reassign, view PII-heavy notes), prefer **server-only** writers.

---

## 5. How current systems should evolve

| Component | Reuse | Stay role-specific | Unify later |
|-----------|-------|--------------------|-------------|
| `volunteer_task_*` | Primary engine for assignable work; extend columns + RPCs. | — | Optional rename to `campaign_assignments` in far future; not required for v1. |
| Supervisor views / RPCs | All coordinator / captain oversight. | — | Generalize “supervisor” to “field lead” membership table if needed. |
| `workspace_profile_tasks` | Copy and UX for onboarding. | Linear program logic. | Bridge table `workspace_step → template_key`. |
| `daily_tasks` | Scores and streak UX. | Date-bound generation. | “Today” aggregator widget only. |
| `campaign_missions` | KPI reporting, leadership UI. | Not user task lists. | Dashboard widgets reading both KPI and assignment metrics. |
| Intern pipeline | — | Pipeline RPCs and stages. | Optional `source_system` + deep link from unified queue. |

**Non-goal:** Replacing volunteer task tables with a greenfield `tasks` table in one cut — **evolution**, not big-bang rewrite.

**Recommended unification sequence:**

1. Keep current UIs and RPCs working.  
2. Introduce a **canonical task DTO** (§4.2) consumed by new components.  
3. Map existing systems into that shape incrementally (facade reads first).  
4. Build **new management desks** against the DTO + real tables.  
5. Migrate legacy surfaces when ROI is clear.

**Role-specific at UI level (keep):** volunteer mission framing, intern pipeline framing, candidate leadership summaries — **shared** under the hood: status, assignment chain, due dates, review/escalation, audit, **event linkage** (§6.5).

### 5.1 Task UI consumption (all desks)

Every desk should be able to surface the same **logical queues** (via facade + RLS), with different defaults:

| View | Description |
|------|-------------|
| Personal queue | Assignments where `assignee_profile_id = me` |
| Team queue | Supervisor / lead_contact scoped roster |
| Scoped queue | County / precinct / team filter |
| Priority / due soon / overdue | Sort + filters on `due_at` + `priority` |
| Blocked | `status = blocked` + escalation metadata |
| Awaiting review | Review gate states |
| Event-linked | `event_id` not null |

**Key widgets:** My tasks, Needs attention, Overdue, Awaiting review, Team workload summary, Event staffing tasks, Upcoming deadlines (often merged with calendar strip).

---

## 6. Campaign calendar & event architecture

### 6.1 First-class calendar (app-native)

- **Single timeline** for the campaign: meetings, shifts, trainings, public events, deadlines, milestones.  
- **Filtering** by role, scope, and `visibility` / audience (must match RLS — see permissions doc).  
- **Google Calendar** later: treat as **sync projection** (§10), not the source of truth for permissions.

### 6.2 Event types (canonical enum — product)

| `event_type` | Description |
|--------------|-------------|
| `campaign_wide` | Rallies, major deadlines visible org-wide (subject to audience). |
| `internal_meeting` | Staff/HQ — restricted visibility. |
| `volunteer_shift` | Canvass/phone bank shifts; often ties to staffing counts. |
| `training` | Volunteer training sessions. |
| `public_event` | Town halls, public appearances. |
| `filing_deadline` | Legal/finance/compliance milestone (often internal). |
| `milestone` | Generic campaign milestone (endorsement, debate, etc.). |
| `canvass_launch` | Field program kickoff (may be county/precinct scoped). |
| `phone_bank` | Phone bank shift block. |
| `candidate_event` | Principal-attending strategic appearance. |
| `fundraiser` | Finance/compliance-sensitive — often internal visibility until published. |
| `press_event` | Media-facing; coordination with comms lead module. |

County/precinct scoping: use **`scope_kind` + `county_id` / `precinct_id`** (nullable) on the event row; inheritance from parent event optional.

### 6.3 Canonical event model (recommended fields)

| Field | Notes |
|-------|--------|
| `id` | uuid PK. |
| `title` | Required. |
| `description` | Rich text or markdown policy TBD. |
| `event_type` | Enum above. |
| `starts_at`, `ends_at` | timestamptz; `ends_at` nullable for all-day policy. |
| `timezone` | IANA string (e.g. `America/Chicago`) — **required** for multi-region honesty. |
| `is_all_day` | boolean. |
| `location_label` | Free text for display (a.k.a. `location_name`). |
| `location_address` | Optional structured or display address line. |
| `virtual_meeting_url` | Nullable URL for hybrid/virtual. |
| `location_place_id` | Optional future structured geo. |
| `capacity` | Optional venue cap. |
| `visibility` | Align with `campaign-permissions-and-access-model.md`: e.g. `internal`, `volunteers`, `public_summary`, `leadership_only`. |
| `calendar_category` | Optional UX grouping (separate from `event_type` if needed). |
| `audience_roles` | Optional jsonb array of canonical role slugs for **narrowing** within visibility (advanced). |
| `owner_profile_id` | Accountable organizer. |
| `created_by_profile_id` | Creator for intake audit. |
| `publication_status` | `draft` \| `in_review` \| `approved` \| `published` \| `cancelled` \| `completed` \| `archived` (latter states optional). |
| `approval_state` | Optional explicit enum if split from publication: `not_required` \| `pending` \| `approved` \| `rejected` — **either** fold into `publication_status` **or** keep separate for reporting. |
| `publish_audience` | Optional: stakeholder “publish state” slice — `private` \| `internal` \| `role_limited` \| `public` — map to `visibility` + RLS (avoid duplicating meaning without need). |
| `staffing_required` | boolean — whether staffing workflow applies. |
| `staffing_target` | Optional int (volunteers needed). |
| `staffing_signed_up` | Optional cached count or computed. |
| `requires_followup` | Post-event tracking. |
| `followup_status` | Nullable enum for post-event closure. |
| **`related_task_template_keys`** | Optional jsonb — auto-generate volunteer tasks on publish. |
| **`related_task_ids`** | Optional uuids — materialized links after generation. |
| `sync_provider` | null \| `google` (future). |
| `sync_external_id` | Google event id; **nullable**. |
| `sync_updated_at` | Last successful sync. |
| `sync_status` | `none` \| `linked` \| `error` (future). |

### 6.4 Permission & scope mapping (calendar)

Reuse keys from permissions doc:

- `calendar.campaign.view`, `calendar.scoped.view`, `event.create.draft`, `event.review`, `event.approve`, `event.publish`.  
- **RLS:** rows filtered by `visibility` + user’s effective scope (county/precinct/team membership).  
- **Volunteer default:** published events with `visibility` including volunteers + scoped geography match.

### 6.5 Relationship tasks ↔ events

- On **publish** (or on approval): optionally enqueue volunteer tasks from templates (e.g. “Event setup,” “Sign in volunteers”) via existing `volunteer_enqueue_from_template` or successor RPC, passing **`event_id`** on created tasks/assignments.  
- **Shift signup** can be modeled as **assignments** to a placeholder “shift” task or a dedicated `event_rsvps` table (plan either way; keep RSVP writes server-side).

---

## 7. Event intake workflow

| Stage | Actor | System behavior |
|-------|--------|-----------------|
| **1. Submission** | Events coordinator, field lead, or CM (policy) | Create row `publication_status = draft`; optional attachments TBD. |
| **2. Review** | CM / designee / **events coordinator** | Timing conflicts, staffing/location readiness, calendar fit, messaging/approval needs — status `in_review` / `under_review` (name consistently in enums). |
| **3. Approval** | CM or candidate office (policy) | `approved`; immutable log who approved — or `rejected` with reason. |
| **4. Publication** | Authorized role | `published`; visibility enforced; appears on calendar + “coming up” feeds. |
| **5. Staffing & task generation** | Automated + coordinator | Staffing tasks, follow-ups, comms tasks, county/precinct asks, recruitment templates — materialize `volunteer_task_*` rows with `event_id`. |
| **6. Post-event** | Coordinator / events | Attendance/participation, follow-up flag, completion notes, resulting tasks/escalations. |

**Workflow state aliases (normalize in one enum table):** stakeholder `submitted` ≈ handoff from requester to review queue; `under_review` ≈ `in_review`; terminal `completed` / `archived` for past events.

Escalation: draft stuck in review → surfacing on coordinator / CM dashboards (rollup doc §9 patterns).

### 7.1 Calendar visibility by role (summary)

Aligns with `campaign-permissions-and-access-model.md` §9.4 — **RLS wins**:

| Role | Slice |
|------|--------|
| **admin** | All workflow states where policy allows |
| **campaign_manager** | Campaign-wide operational + strategic |
| **candidate** | Strategic, public, approved leadership-relevant — not all low-level ops by default |
| **events_coordinator** | Full pipeline in scope |
| **volunteer_coordinator** | Volunteer-relevant + staffing |
| **County / precinct / lead** | Geo scope + approved campaign-wide items |
| **Volunteer / intern** | Approved items relevant to them |

---

## 8. UI consumption patterns

### 8.1 Full calendar widget

- **Views:** month / week / **list (agenda)** — ship list early if month view slips.  
- **Data:** single RPC or filtered query returning events user may see (never client-filter sensitive fields from overbroad queries).  
- **Filters:** role-scoped, **county/precinct/team**, **event_type**, date range.  
- **Indicators:** approval/publish state badges for roles with `event.review` / `event.publish`.  
- **Interactions:** click-through to event detail; create/edit per permissions; volunteers mostly read + RSVP.

### 8.2 “What’s coming up” strip (under header)

- **Placement:** Immediately **below** `ElectionCountdownBar` inside `AppHeader` or a new `CampaignUpNextStrip` included by dashboard shells (`Dashboard`, desks).  
- **Content:** next **event**, **training**, **deadline**, **staffing** cutoff, **filing/compliance** milestone, role-relevant reminders — typically 3–7 chips/cards from published events + assignments facade + leadership-only deadline query.  
- **Role-filtered:** same data sources, stricter filters for volunteers vs CM.  
- **Mobile:** horizontal scroll cards.  
- **Desktop/tablet:** compact single row or stacked summary cards.

### 8.3 Dashboard widgets

| Widget | Sources |
|--------|---------|
| My assignments | `volunteer_task_assignments` (active). |
| Team / supervised queue | `supervisorTasks` + views. |
| Daily activation | `useDailyMission`. |
| KPI + mission context | `useCampaignKpis`. |
| Upcoming deadlines | Calendar query `event_type in ('filing_deadline','milestone')` + permissions. |
| Events needing staffing | Published + `staffing_required` + gap vs target. |
| Pending approvals | `publication_status` / workflow in draft–review for authorized roles. |
| County/precinct events | Scoped calendar query. |
| Campaign highlights (candidate) | Aggregates + deep links only. |

### 8.4 Admin / CM / candidate summaries

- **Candidate:** narrative-first; aggregates (counts, phase pressure) — align with `campaign-dashboard-role-architecture.md` rollup tables; no PII-heavy queues without backend support.  
- **CM:** operational calendar density, staffing gaps, overdue assignments in scope.  
- **Admin:** integration health, sync errors (future), not a replacement for CM calendar.

### 8.5 Workspace composition notes

- `WorkspaceDock.tsx` scrolls to section IDs; consider a **Calendar** section id in `workspaceDockModel.ts` when the dashboard embeds a month/agenda block.  
- Strip + dock are complementary: strip = **temporal glance**; dock = **deep section jump**.

---

## 9. Phased implementation order (no Google dependency)

| Phase | Focus | Outcomes |
|-------|--------|----------|
| **P0** | **Normalize “assignable work” UX** | Document RPC contracts; extend assignment statuses only if unavoidable; add `scope_kind` / geography FKs when profile schema ready. |
| **P1** | **`useCampaignWork` facade** (name TBD) | One hook returning merged: active volunteer assignments, optional personal tasks, optional intern summaries — **read paths only** first. |
| **P2** | **Events schema + RLS** | `campaign_events` (or agreed name), visibility enum, publication status, owner; no Google fields required yet (nullable columns ok). |
| **P3** | **Intake + publish RPCs** | Draft → review → approve → publish; audit rows. |
| **P4** | **Calendar UI** | Month/agenda + strip under header; wire to P2 query. |
| **P5** | **Event-linked tasks** | On publish, enqueue tasks with `event_id`; coordinator staffing UI. |
| **P6** | **Post-event** | Attendance + follow-up tasks; optional KPI hooks. |
| **P7** | **Google sync** | Populate `sync_*`; worker or Edge function; two-way policy TBD. |

**Stakeholder roadmap (maps to P0–P7 above):**

| Stage | Deliverables |
|-------|----------------|
| **1 — Design & shared models** | Canonical task + event **TypeScript types** / const enums; permission-linked visibility rules; strip + widget mock contracts. |
| **2 — MVP calendar** | Event table + RLS; **list-based** upcoming events; intake form; review/publish workflow; **header strip**. |
| **3 — Task consolidation** | Map volunteer/daily/workspace/intern surfaces to facade DTOs; scoped management views; review/escalation columns/RPCs; **event-linked task generation**. |
| **4 — Rich calendar** | Full calendar embed; role/geo filters; event detail route. |
| **5 — Integrations** | `google_sync_*` metadata; outbound sync; inbound only if needed. |

---

## 10. Google Calendar (later)

- **Source of truth** for *campaign permissions* remains Postgres.  
- **Outbound:** published events optionally push to Google; store `sync_external_id`.  
- **Inbound:** imported events default to `draft` or restricted visibility until reviewed.  
- **Conflict resolution:** `sync_updated_at` + last-writer-wins or manual merge — decide at P7.

---

## 11. Immediate next engineering steps (before Google)

1. **Define canonical `event_type`, task `source_system`, and workflow enums** in code (`src/lib/...` constants) aligned with this doc + permissions doc — single import surface for UI and future migrations.  
2. **Reusable upcoming-events summary** component (props: `items`, `variant: strip | card`) so strip and dashboards share rendering.  
3. **Event intake before full calendar UI:** draft/create + review queue can ship as **lists**; month grid follows.  
4. **Freeze vocabulary** in an ADR or ticket: `visibility`, `publication_status`, RLS test cases per role.  
5. **Add calendar read model:** migrations for events table + RLS + `calendar.campaign.view` tests (policy or RPC).  
6. **Ship “up next” strip** using **assignments only** if events table slips — proves `AppHeader` integration.  
7. **Extend volunteer tasks** with nullable `event_id` + `scope_*` after events PK exists.  
8. **Facade hook** for strip + “my obligations” without duplicate query logic.  
9. **Event-linked task generation** only after publish RPC is trustworthy.  
10. **Align leadership KPI RPCs** with org-wide event publish authority (permissions doc / `is_campaign_leadership` drift).

---

## 12. Maintenance

When shipping features:

1. Update this doc’s §2 audit if new task tables land.  
2. Update permission matrix in `campaign-permissions-and-access-model.md` for new verbs.  
3. Update desk blueprint if a new route owns calendar admin.

---

*End — universal task + calendar architecture for CampaignOS.*
