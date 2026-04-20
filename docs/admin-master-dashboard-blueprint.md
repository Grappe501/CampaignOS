# CampaignOS Admin Master Dashboard Blueprint

**Status:** Blueprint + **MVP shipped** at `/admin` (`AdminDesk` / `AdminDeskContent`); extend per phases below.  
**Purpose:** System-wide **command center** specification: what `/admin` must surface, in what order, and which engines it aggregates.  
**Companions:**  
- `docs/campaign-dashboard-role-architecture.md` — desk family, `/admin` route, rollups.  
- `docs/campaign-permissions-and-access-model.md` — `admin.*` keys, backend-first mutations.  
- `docs/campaign-universal-tasks-and-calendar-architecture.md` — task + event engines admin will govern.  
- `docs/admin-dashboard-build-script.md` — Cursor implementation spec; keep aligned with shipped page.

---

## Purpose

This is the **system-wide command dashboard** for CampaignOS. It is the single place where campaign leadership operations can see the entire machine at once: users, roles, permissions, tasks, events, calendar pressure, field readiness, desk health, alerts, data integrity, and workflow bottlenecks.

This is not a volunteer page with extra links. This is the **control tower**.

The admin dashboard should answer six questions within seconds:

1. What needs attention right now?
2. Is the campaign operationally healthy?
3. Where are the biggest risks or blockages?
4. Which roles, counties, precincts, or desks are falling behind?
5. What is coming up that requires intervention?
6. What can I act on immediately from this screen?

---

## Guiding principles

- **See everything, act fast.** The page must surface system-wide visibility first, then provide direct links into action surfaces.
- **One command layer, many scopes.** Admin can view campaign-wide, county, precinct, role, desk, event, and user slices.
- **Urgency first.** Critical problems and deadlines sit above all informational widgets.
- **Permission-aware but comprehensive.** Admin sees all system objects, even when other roles only see filtered slices.
- **Mobile and iPad optimized from the start.** The most important elements must remain visible and usable on smaller screens.
- **Rollup, drilldown, intervene.** Every summary should lead to a queue, filtered list, or desk.

---

## Admin dashboard mission

The Admin desk exists to manage the entire CampaignOS operating system, not just the candidate campaign narrative.

It is responsible for:

- user and role oversight
- system health and integrity
- permissions and access management
- task flow governance
- event and calendar governance
- exception and escalation handling
- desk rollout readiness
- configuration and platform operations
- global alerting and risk response

---

## What the admin dashboard must show

At a minimum, the admin dashboard must unify visibility into:

- all dashboards/desks
- all user roles
- task engine health
- calendar/event system health
- volunteer activity and dropoff signals
- coordinator bottlenecks
- county/precinct coverage gaps
- permission anomalies
- unresolved exceptions
- upcoming campaign milestones and deadlines
- audit and sync failures
- system configuration status

---

## Page architecture

### Page order

The admin dashboard should be built in this order from top to bottom:

1. Header and global command strip
2. Critical alerts and intervention bar
3. Campaign health overview
4. Upcoming campaign calendar and deadline rail
5. Desk and role health rollup
6. Task system command center
7. Event and calendar governance center
8. User, role, and permission management center
9. County and precinct readiness map
10. Exceptions, audit, and data integrity center
11. Quick actions and system controls
12. Activity feed and recent changes

---

## Above-the-fold layout

### 1. Header block

#### Required contents

- Page title: **Admin Command Center**
- Current campaign scope selector
- Date and time context
- Global search
- Quick-create actions
- “View as role” or desk preview control
- Sign out

#### Header summary strip

Directly under the title should be a horizontally scrollable summary strip on mobile and a compact multi-card row on desktop.

Each tile should show:

- urgent alerts count
- open exceptions count
- overdue tasks count
- upcoming events in next 7 days
- users awaiting role or permission action
- counties needing attention
- precinct coverage gaps
- system issues or failed syncs

This is the first thing you should see when you log in.

---

### 2. Critical alerts and intervention bar

This is the most important section on the page.

#### Purpose

Show only items that may require immediate admin intervention.

#### Alert categories

- permissions conflict
- event approval backlog
- overdue critical tasks
- desk not configured
- county lead missing
- precinct captain vacancy
- failed calendar sync
- unresolved roster exception
- user access problem
- data integrity mismatch
- deadline risk

#### Each alert card should include

- alert severity
- title
- why it matters
- impacted scope (campaign/county/precinct/user/desk)
- age of alert
- primary action button
- secondary drilldown link

#### Interaction model

Admin should be able to:

- filter alerts by severity
- clear resolved alerts
- assign alerts
- open the underlying queue
- escalate to CM or role owner

---

### 3. Campaign health overview

This is the system-wide pulse.

#### Core tiles

- total active users
- users by role
- active volunteers
- open tasks
- overdue tasks
- open events
- pending approvals
- counties active
- precincts covered vs uncovered
- intern pipeline movement
- volunteer activation trend
- recent completion velocity

#### Purpose

This should answer: is the campaign machine moving?

#### Layout

- desktop: 2 to 3 rows of compact KPI cards
- tablet: wrapped cards
- mobile: horizontal KPI rail plus expandable detail section

---

### 4. Upcoming campaign calendar and deadline rail

This sits directly under campaign health.

#### Components

- mini universal calendar widget
- next 7/14/30 days toggle
- “What’s coming up” horizontal event strip
- key deadlines block
- approval-needed events block

#### Event categories

- public campaign events
- internal staff meetings
- trainings
- volunteer shifts
- filing deadlines
- GOTV milestones
- press and surrogate events
- county and precinct events

#### What admin needs to do here

- approve or reject event submissions
- publish or unpublish events
- open staffing needs
- jump to event operations
- inspect visibility settings
- review event-linked task generation

---

## Main operational sections

### 5. Desk and role health rollup

This is where admin sees the status of every desk in the system.

#### Desks to roll up

- Admin
- Campaign Manager
- Candidate
- Assistant Campaign Manager
- Volunteer Coordinator
- Events Coordinator
- County Lead
- Precinct Captain
- Lead Contact
- Intern
- Volunteer

#### For each desk show

- total users in desk
- active users today/this week
- open tasks
- overdue tasks
- unresolved alerts
- upcoming deadlines/events
- setup completeness
- any missing required assignments

#### Desk health states

- healthy
- needs attention
- blocked
- not configured
- understaffed

#### Interaction

Each row/card should link into:

- desk preview
- filtered users
- filtered tasks
- filtered alerts
- filtered events

#### Why this matters

This is how admin sees whether the system itself is structurally staffed and functioning.

---

### 6. Task system command center

This is one of the two main engines.

#### Required views

- open tasks by role
- overdue tasks by role
- tasks by county
- tasks by precinct
- tasks by owner
- tasks awaiting approval/review
- stalled tasks
- tasks generated from events
- tasks with no owner
- tasks blocked by missing permissions or dependencies

#### Top panels

1. Task health summary
2. Overdue and urgent queue
3. Assignment gaps
4. Task flow by role
5. Escalation queue
6. Recent completions and velocity

#### Admin actions

- reassign task
- bulk assign
- escalate
- change due date
- resolve block
- inspect audit history
- open linked event or desk

#### Admin question answered here

Where is work piling up, and why?

---

### 7. Event and calendar governance center

This is the second main engine.

#### Required views

- event approval queue
- published events
- draft/submitted events
- events missing staffing
- events missing owners
- events with conflicts
- events with visibility issues
- events missing follow-up tasks
- upcoming high-priority campaign moments

#### Top panels

1. Event approval queue
2. Universal calendar health
3. Staffing risk panel
4. Visibility/publication panel
5. Follow-up completion panel
6. Future sync readiness panel

#### Admin actions

- approve or reject
- assign event owner
- publish or unpublish
- adjust visibility
- generate or review linked tasks
- mark event critical
- open event intake details

#### Special requirement

The universal calendar widget should be visible here in expanded form with filters for:

- all
- internal
- public
- county
- precinct
- trainings
- shifts
- deadlines

---

### 8. User, role, and permission management center

This is the governance layer.

#### Required views

- all users
- users by role
- users missing role assignment
- users with conflicting role states
- permission exceptions
- pending access requests
- role coverage gaps
- temporary permission overrides
- recently changed roles

#### Top panels

1. User directory summary
2. Role coverage matrix
3. Permission issues queue
4. Pending approvals/access changes
5. Role assignment actions
6. Temporary override log

#### Admin actions

- assign role
- remove role
- approve access request
- inspect effective permissions
- grant temporary override
- revoke temporary override
- impersonation/view-as preview if supported later

#### Why this matters

Without this section, the system becomes unmanageable as more desks come online.

---

### 9. County and precinct readiness map

This is where admin sees field structure readiness.

#### Show by geography

- county lead assigned or missing
- precinct captain coverage
- volunteer activity by area
- event density by area
- task backlog by area
- coverage gaps
- areas needing recruitment/support

#### Views

- map view if feasible later
- list/table view immediately
- county drilldown
- precinct drilldown

#### Status model

- fully staffed
- partially staffed
- underactive
- high backlog
- urgent intervention needed

#### Admin actions

- assign responsible lead
- open local queue
- open local event calendar
- inspect local desk health

---

### 10. Exceptions, audit, and data integrity center

This is the trust layer.

#### Required visibility

- roster exceptions
- unresolved profile mismatches
- sync failures
- duplicate users
- missing linked records
- incomplete onboarding records
- audit anomalies
- recent admin actions
- system warnings

#### Top panels

1. Exception queue
2. Data integrity panel
3. Audit activity feed
4. Recent risky changes
5. Sync and ingestion status

#### Admin actions

- inspect record chain
- resolve or dismiss exception
- re-run sync later when supported
- open linked user/desk/task/event
- tag for engineering follow-up

---

### 11. Quick actions and system controls

This section should be sticky or highly accessible.

#### Quick actions

- create user
- assign role
- open event intake queue
- create campaign event
- create system task
- assign county lead
- assign precinct captain
- publish campaign update
- open permissions review
- open data exception queue

#### System controls

- feature/config toggles
- desk rollout flags
- widget visibility controls
- knowledge/brand content controls
- calendar settings
- future integration settings

---

### 12. Activity feed and recent changes

#### Show

- recent role changes
- recent event approvals
- recent task escalations
- recent desk activity spikes/drops
- recent exceptions resolved
- recent admin actions

#### Purpose

This gives admin narrative awareness of what just changed across the system.

---

## Recommended widget inventory

### Global widgets the admin dashboard should use

- urgent alerts rail
- KPI summary cards
- upcoming events strip
- mini calendar widget
- desk health matrix
- role coverage matrix
- task backlog heat widget
- county/precinct readiness widget
- exception queue widget
- audit activity feed
- quick action launcher
- system health status widget

---

## Mobile and iPad layout requirements

### Mobile

Prioritize these in order:

1. alerts bar
2. summary strip
3. what’s coming up
4. quick actions
5. task backlog
6. event approvals
7. exceptions
8. desk health

### Mobile behavior

- use horizontal scroll for summary cards and upcoming items
- collapse secondary detail sections
- keep quick actions in a floating or sticky compact launcher
- never bury urgent alerts below informational cards

### iPad

- two-column layouts are acceptable
- calendar + alerts can sit side-by-side
- desk health and task health can appear in parallel rows
- drilldown panels should open cleanly without feeling desktop-only

---

## Recommended filters and global controls

The admin dashboard should support persistent top-level filtering by:

- date range
- campaign scope
- county
- precinct
- desk type
- role
- severity
- task status
- event status
- permission issue type

These filters should affect all rollup widgets where possible.

---

## The admin page above-the-fold blueprint

### Desktop first screen

#### Row 1

- title and controls
- quick create button group
- global search

#### Row 2

- alert/intervention bar across full width

#### Row 3

- summary strip with 6 to 8 key metrics

#### Row 4

- left: upcoming campaign and calendar rail
- right: campaign health / system health summary

#### Row 5

- left: task backlog at a glance
- right: event approval and exception queue at a glance

This first screen should make it possible to understand the entire campaign’s operational state in under one minute.

---

## Immediate build priorities for Admin MVP

### Phase 1: must ship first

1. Admin shell page
2. Header + global summary strip
3. Critical alerts bar
4. Campaign health overview
5. Upcoming events and deadlines strip
6. Desk health rollup
7. Quick actions

### Phase 2: operational control

8. Task system command center
9. Event approval/calendar governance center
10. User/role/permission management center
11. Exceptions and audit center

### Phase 3: advanced command layer

12. County/precinct readiness map
13. advanced filtering
14. system configuration controls
15. integration readiness and sync monitoring

---

## Data dependencies the admin build should expect

The dashboard will need rollups from:

- user directory/profile system
- role and permission model
- desk registry or desk mapping layer
- shared task engine
- shared event/calendar engine
- exception and audit systems
- county/precinct geography and assignments
- KPI and activity aggregation layer

Where those do not exist yet, the admin page should still be structured first using read-safe sections and placeholder empty states that clearly indicate missing system wiring.

**Repo grounding (today):** `/admin` is registered in `src/App.tsx` with `AdminDesk` + section IDs in `AdminDeskContent.tsx`. Org-wide rollups still require elevated RPCs; panels state honest RLS limits. Extend widgets per phases below without renaming section IDs.

---

## Canonical section IDs for engineering

Recommended top-level section IDs:

- `admin-overview`
- `admin-alerts`
- `admin-health`
- `admin-calendar`
- `admin-desks`
- `admin-tasks`
- `admin-events`
- `admin-users`
- `admin-geography`
- `admin-exceptions`
- `admin-controls`
- `admin-activity`

These should later map cleanly into dock navigation and shared widgets.

---

## What admin should be able to do without leaving the page

At minimum, the admin dashboard should support direct action for:

- assign or change user role
- open and resolve alerts
- approve/reject event submissions
- publish/unpublish event
- reassign task
- escalate task
- resolve exception
- open desk-specific filtered views
- inspect system/user/event/task details
- launch key creation flows

If admin cannot do these from the dashboard, it is not yet functioning as a real command center.

---

## Final recommendation

Build the Admin dashboard as the **master operating surface for the whole campaign**, then let Campaign Manager and Candidate consume filtered strategic views of the same underlying engines.

Admin should be the only place where everything converges:

- all roles
- all desks
- all scopes
- all alerts
- all exceptions
- all event governance
- all task governance
- all access governance

That is how you make this *your dashboard* and truly see everything.

---

## Document maintenance

| When | Action |
|------|--------|
| New admin widget shipped | Add to widget inventory; update phase table if needed. |
| New rollup RPC | Note in Data dependencies; align with `campaign-dashboard-role-architecture.md` §9.4. |
| Route added | Update `App.tsx` family map in dashboard architecture doc. |

---

*End of admin master dashboard blueprint.*
