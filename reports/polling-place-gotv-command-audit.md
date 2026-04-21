# Polling Place / GOTV Command Layer — audit

## Summary

CampaignOS now includes a **DB-backed turnout command layer**: canonical GOTV domain, deterministic countdown phases, explainable per-site readiness, Supabase tables for sites/shifts/assignments/incidents, county + neighborhood + leadership surfaces, **Agent Jones** `gotv_command_v1` validation, automation triggers for critical sites and county clusters, and QA tests.

## Migration

- `supabase/migrations/20260430370000_polling_place_gotv_command_layer.sql`
  - `campaign_polling_places`, `campaign_turnout_site_shifts`, `campaign_turnout_site_assignments`, `campaign_turnout_incidents`, `campaign_turnout_intervention_log`
  - View `campaign_turnout_open_shift_slots_v1`
  - RLS aligned with `is_campaign_event_editor` for writes; authenticated read

## Key files

| Area | Path |
|------|------|
| Domain / calendar | `src/lib/gotvDomain.ts`, `gotvCountdownEngine.ts` |
| Readiness / coverage | `src/lib/gotvReadiness.ts`, `gotvCoverageService.ts`, `gotvShiftPlanning.ts`, `gotvAssignments.ts` |
| Metrics / analytics | `src/lib/gotvMetrics.ts`, `gotvSelectors.ts`, `gotvAnalytics.ts` |
| Incidents / interventions | `src/lib/gotvIncidentDomain.ts`, `gotvIncidentService.ts`, `gotvInterventions.ts` |
| DB | `src/lib/gotvDb.ts` |
| Hook | `src/hooks/useGotvCommandLayer.ts` |
| Agent Jones | `src/lib/agentJonesGotvCommand.ts`, `agentJonesContextV2.ts`, `agentJonesCountdown.ts`, `netlify/functions/agent-jones.ts` |
| UI | `src/components/gotv/*`, `CountyEventOperationsContent.tsx`, `NeighborhoodEventHubContent.tsx`, `LeadershipBriefingContent.tsx`, `ElectionCountdownBar.tsx` |
| Automation | `automationDomain.ts`, `automationReasonCodes.ts`, `automationRulesEngine.ts`, `automationInterventionEngine.ts`, `automationTriggerRegistry.ts` |

## Countdown phases (deterministic)

`pre_early_vote_ramp`, `early_vote_launch`, `early_vote_sustain`, `pre_election_96h`, `pre_election_48h`, `election_day`, `post_close_wrap`, `post_election_review` — driven by `GOTV_ELECTION_CALENDAR` + `campaignClock` poll close.

## Readiness scoring

Heuristic 0–100 from: slot coverage vs needed, captain/lead confirmation, open incidents, unconfirmed invite ratio in hot phases, importance weighting — **reason strings always populated** when penalized.

## Automation triggers added

- `gotv_site_critical_coverage` — red band sites (severity scales with phase)
- `gotv_county_cluster_weak` — 2+ orange/red sites same county

## Commands run

- `npm run check:env`
- `npm run lint`
- `npm run build`
- `npx vitest run`

## Known gaps

1. **Volunteer self-service** assignment UX to shifts not built (editors use DB / future UI).
2. **Early vote dates** in `gotvDomain` are placeholders — must match official jurisdiction calendar.
3. **campaignAutomationSync** does not yet pass `gotvRollups` (Agent Jones + rules evaluation in panel do).
4. **RPC/reporting** rollups optional next: materialized county summaries if site count grows large.

## Recommended next master script

**Cursor Master Script #7 — Voter Contact / Relational Turnout Conversion Layer** (per product sequence).
