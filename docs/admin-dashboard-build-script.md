# Admin Dashboard Build Script for Cursor

**Status:** Implementation guide — paired with `docs/admin-master-dashboard-blueprint.md` (what to build) and the shipped `/admin` page in `src/pages/AdminDesk.tsx` (living code).

This document was the original Cursor task spec; keep it synchronized when acceptance criteria change.

---

## Objective

Build the **Admin Dashboard** as the system-wide command center for CampaignOS: authenticated surface for visibility, intervention, control, and fast navigation across major operating layers.

---

## Context you must respect

- CampaignOS routes include `/dashboard`, `/intern`, `/candidate`, `/coordinator`, `/power5`; **`/admin`** is the command center.
- Use **real** hooks and queries where RLS allows; use **honest readiness** sections where org-wide aggregates are not yet backed by RPCs.
- **Mobile and iPad first** for critical bands (alerts, summary, coming up).
- **Access:** `canAccessAdminDesk` in `src/lib/adminDeskAccess.ts` (admin, staff; dev bypass in development).

---

## Primary source files

- `src/App.tsx` — route registration
- `src/pages/AdminDesk.tsx` — shell
- `src/components/admin/AdminDeskContent.tsx` — sections
- `src/lib/adminDeskAccess.ts` — gate + nav eligibility
- `src/lib/roleHomeRouting.ts` — `admin` home path
- `src/components/AppHeader.tsx` — Command center link
- Reuse patterns from `CoordinatorDesk.tsx`, `Dashboard.tsx`, shared cards

---

## Route and files

- **Route:** `/admin` (authenticated)
- **Page:** `src/pages/AdminDesk.tsx`
- **Content:** `src/components/admin/AdminDeskContent.tsx`

---

## Required page structure (section IDs)

Align with blueprint canonical IDs:

1. **Command header** — `admin-overview`
2. **Critical alerts** — `admin-alerts`
3. **Campaign health** — `admin-health`
4. **Coming up / calendar rail** — `admin-calendar`
5. **Desk rollup** — `admin-desks`
6. **Quick actions** — (inline or `admin-controls` precursor)
7. **Task command center** — `admin-tasks`
8. **Event governance** — `admin-events`
9. **Users / roles / permissions** — `admin-users`
10. **Exceptions / audit** — `admin-exceptions`

---

## Data usage rules

- No invented org-wide metrics.
- Prefer existing hooks: `useProfile`, `useCampaignKpis`, `useVolunteerTasks`, `useDailyMission`.
- Where cross-profile reads are not permitted by RLS, state that **elevated read paths** are required — not placeholder fluff.

---

## Acceptance criteria

- `/admin` loads for allowed roles; others redirect to `/dashboard`.
- Top of page orients: attention, health, coming up.
- Distinct from volunteer/coordinator/candidate desks.
- Lint passes.

---

## Deliverables checklist

After substantive changes, update:

1. files touched  
2. sections and data backing  
3. next backend/RPC steps  

---

*End build script.*
