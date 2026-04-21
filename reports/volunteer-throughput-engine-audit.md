# Volunteer Throughput Engine — implementation audit

## Summary

This pass establishes the **canonical lifecycle model**, **pure metrics/rollup helpers**, **DB append-only event log**, **single shared coordinator desk load** for `/volunteers/command` (page + floating Agent Jones), and **Netlify-validated** `volunteer_throughput` in Agent Jones context. Deeper UI density, marketplace handshake refactors, and RPC rollups are **partially specified below as follow-ups**.

## Reused (unchanged behavior)

- `volunteers`, `volunteer_assignments`, `volunteer_shifts`, `volunteer_reliability_summaries`, `volunteer_reminder_queue`, `volunteer_opportunities` — existing tables and RLS policies.
- `useVolunteerCommandCoordinator` data loaders and coordinator page UI structure.

## Added

| Area | Notes |
|------|--------|
| `src/lib/volunteerThroughputDomain.ts` | Canonical stages, transition graph, labels, route hints, maps from onboarding/assignments/claim state. |
| `src/lib/volunteerThroughputMetrics.ts` | Pipeline counts, assignment rates, leadership rollup, `buildAgentJonesVolunteerThroughputContext`. |
| `src/lib/volunteerThroughputSelectors.ts` | Re-export hub for UI/leadership. |
| `src/lib/volunteerThroughputApi.ts` | `volunteer_throughput_events` insert/fetch (optional audit trail). |
| `src/context/VolunteerCommandDeskContext.tsx` | One coordinator hook instance for command route + floating Jones. |
| Agent Jones | `volunteer_throughput` on `AgentJonesContextV2`, wiring from `GlobalFloatingAgentJones` → panel → API. |
| Netlify `agent-jones.ts` | `validateVolunteerThroughput` + system prompt line. |

## Database

- **Migration:** `supabase/migrations/20260430340000_volunteer_throughput_engine.sql`
  - Table: `public.volunteer_throughput_events` (append-only, coordinator or self insert, scoped select).

## Lifecycle states finalized (canonical)

`discovered` → `invited` → `interested` → `opted_in` → `eligible` → `recommended` → `claimed` → `assigned` → `reminded` → `engaged` → `completed` → `followed_up`, plus `dropped`, `no_show`, `cooling_off`.

Existing DB enums remain authoritative for writes; this model is the **unified read/analytics vocabulary**.

## Routes improved

- `/volunteers/command` — desk data shared via `VolunteerCommandDeskProvider`; Agent Jones receives throughput when floating panel is open on this route.

## Commands run

- `npm run check:env`
- `npm run lint`
- `npm run build`
- `npm run test` (Vitest — `vitest.config.ts` extended to include `src/lib/volunteerThroughputDomain.test.ts` alongside COP tests)

## Known gaps (recommended next)

1. **Emit** `volunteer_throughput_events` from claim/assignment/reminder transitions (service calls, not UI scattered).
2. **SQL views / RPCs** for time-based metrics (invite→assign, assign→complete) once event timestamps are consistently populated.
3. **Coordin/marketplace/staffing UI** — surface `throughputRouteHint`, urgency, and next-action buttons on cards per Master Script §6–§7.
4. **Cursor Master Script #3 — Event → Outcome Loop** — event → attendance → conversion → measurable impact (per roadmap).

## Recommended next master script

**Cursor Master Script #3 — Event → Outcome Loop** (closes the political value chain after volunteer throughput).
