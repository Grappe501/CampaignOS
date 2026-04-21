# Self-Driving Automation Layer — implementation audit

## Summary

CampaignOS now has a **rules-first orchestration path** with a canonical domain model, deterministic trigger evaluation, intervention mapping, **Supabase-backed** queue + audit tables, coordinator desk UI, sync on desk load, and an **Agent Jones** `automation_orchestration_v1` context block validated in `netlify/functions/agent-jones.ts`. AI does not gain new write paths; queue mutations use existing RLS (`is_campaign_event_editor`).

## Migrations (existing)

- `supabase/migrations/20260430360000_self_driving_automation_layer.sql` — `campaign_automation_trigger_events`, `campaign_automation_actions`, `campaign_automation_audit_log`, view `campaign_automation_open_queue_v1`, RLS policies.

## Key modules added or extended

| Area | Files |
|------|--------|
| Domain | `src/lib/automationDomain.ts`, `automationReasonCodes.ts`, `automationGuards.ts`, `automationApprovals.ts` |
| Engine | `src/lib/automationTriggerRegistry.ts`, `automationRulesEngine.ts`, `automationInterventionEngine.ts`, `automationRouting.ts` |
| Persistence | `src/lib/campaignAutomationDb.ts`, `campaignAutomationSync.ts` |
| Selectors / metrics | `src/lib/automationSelectors.ts`, `automationMetrics.ts`, `automationFeedback.ts`, `automationOutcomeScoring.ts`, `automationAudit.ts` |
| Agent Jones | `src/lib/agentJonesAutomationOrchestration.ts`, `src/lib/agentJonesContextV2.ts`, `src/components/AgentJonesPanel.tsx`, `netlify/functions/agent-jones.ts` |
| UI | `src/components/automation/*`, `src/components/events/EventCoordinatorDeskContent.tsx` |
| Hook | `src/hooks/useCampaignAutomationDesk.ts` |
| Tests | `src/lib/automationRulesEngine.test.ts`, `src/lib/automationInterventionEngine.test.ts`, `vitest.config.ts` |

## Reused building blocks

- `todayCommandService` (`buildTodayCommandSnapshot`) — staffing issues, approval backlog, critical mass.
- `eventPostEventWorkflow` (`buildPostEventAttentionQueue`) — follow-up debt.
- `geographicCommandSelectors` + `geographicCommandMetrics` — county pressure / critical band.
- `volunteerLoadBalancerService` — overload signals.
- Event coordinator desk staffing bulk hook pattern (`useCampaignStaffingBulk`).

## Trigger registry (v1)

| Trigger type | Source (deterministic) |
|--------------|------------------------|
| `event_staffing_pressure` | Command panel issues (staffing_gap / blocker) |
| `approval_queue_backlog` | ≥3 pending approval events |
| `post_event_followup_debt` | Post-event attention queue non-empty |
| `geographic_command_pressure` | Top county at **critical** pressure band |
| `command_critical_mass` | Digest `criticalIssuesCount` ≥5 |
| `volunteer_load_hotspot` | Overloaded / burnout-risk volunteers (cap 2) |

## Interventions & guardrails

- Interventions: `route`, `task_suggestion`, `approval_request`, `escalation`, etc. (`automationInterventionEngine.ts` + `automationGuards.ts` execution modes).
- **Requires approval:** `approval_request`, `escalation` → `awaiting_approval` / `pending`.
- **Auto-tracked:** high/critical `route` only (per `executionModeFor`).
- Queue actions: approve, reject, complete, dismiss, snooze 24h + audit log entries.

## UI surfaces

- **Event Coordinator Desk:** orchestration queue panel, pressure line in command header, refresh + action buttons.
- **Not in this pass:** war room-only strip, leadership briefing section (low-effort follow-up: reuse `AutomationPressureSummary` + same hook pattern).

## Commands run

- `npm run check:env` — pass  
- `npm run lint` — pass  
- `npm run build` — pass  
- `npx vitest run` — pass (13 tests including automation)

## Known gaps / next steps

1. **Task/reminder execution:** queue rows store route hints; auto-creating `task_engine` / reminder rows on approve is not wired (by design for safety — add explicit mutation service next).
2. **Cooldown / recurrence:** registry entries define `cooldown_hours`; evaluator does not yet read them (dedupe is via `dedupe_key` + partial unique index on open rows).
3. **Leadership briefing / war room:** add `AutomationPressureSummary` + optional shallow fetch of open queue counts.
4. **Campaign id:** sync uses `'default'`; align with multi-tenant `campaign_id` when the app threads it everywhere.
5. **Master Script #6:** Polling Place / GOTV Command Layer (per product roadmap).

## Recommended next master script

**Cursor Master Script #6 — Polling Place / GOTV Command Layer** (per original sequence).
