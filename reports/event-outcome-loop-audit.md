# Event → Outcome Loop — Audit & Handoff

## Summary

CampaignOS now has a **canonical outcome domain** in TypeScript, an **additive Supabase layer** (extended `campaign_event_outcomes`, `campaign_event_learning_capture`, rollup view, attendance sync trigger, expanded follow-up types), and **wired UI + Agent Jones** so event operations treat outcomes as operational truth rather than a dead-end form.

## What was reused

- `campaign_event_outcomes`, `campaign_event_attendance`, `campaign_event_followups` (existing).
- `eventPostEventWorkflow.ts` — capture lane taxonomy; upgraded via `eventOutcomeSelectors.ts` with DB context.
- `eventAfterActionEngine.ts`, `eventIntelligenceJones.ts`, `EventIntelligenceLayerPanel.tsx` — enrichment and briefing; extended with outcome row + learning DB + `outcome_loop` for Jones.
- `eventLearningCaptureStorage.ts` — still writes localStorage; now also serializes to `campaign_event_learning_capture`.
- `campaignEventsFromSupabase.ts` — attendance/follow-up queries; extended with outcome + learning helpers.
- Netlify `agent-jones.ts` — strict validation extended for `event_intelligence.outcome_loop`.

## What was added

| Area | Deliverable |
|------|-------------|
| DB | `supabase/migrations/20260430350000_event_outcome_loop.sql` |
| Domain | `src/lib/eventOutcomeDomain.ts` |
| Selectors | `src/lib/eventOutcomeSelectors.ts` |
| Metrics | `src/lib/eventOutcomeMetrics.ts` |
| Hook | `src/hooks/useEventOutcomeSnapshot.ts` |
| Tests | `src/lib/eventOutcomeDomain.test.ts` |
| Spec doc | `reports/Cursor_Script_03_Event_Outcome_Loop.md` |

### DB objects (migration)

- **Columns** on `campaign_event_outcomes`: `conversation_count`, `volunteer_assignments_created`, `contacts_influenced_count`, `pledges_or_donations_count`, `conversation_summary`, `outcome_stage`, `closure_recovery_notes`, `first_followup_at`.
- **Table** `campaign_event_learning_capture` (`event_id` PK, `payload` jsonb, RLS for editors).
- **Triggers** on `campaign_event_attendance` (INSERT/DELETE) → sync `campaign_event_outcomes.attendance_count`.
- **View** `campaign_event_outcome_rollups_v1` (event + outcome + check-in/follow-up counts + learning flag).
- **CHECK** expansion on `campaign_event_followups.followup_type` (`media_story`, `logistics_recovery`, `next_event_invite`, `team_lead_review`, `conversion_task`).

### App wiring

- `CampaignCalendarEventRecord` + row mapper + `CAMPAIGN_EVENT_LIST_SELECT`: `expected_audience_size`, `actual_audience_size` for attendance-rate context.
- `EventOutcomesCard.tsx`: live snapshot, closure quality, lanes from DB, links to check-in + analytics.
- `EventCheckInPage.tsx`: deep link to `#event-outcomes`.
- `markEventCompletedAndFollowUps`: sets `outcome_stage` to `executed` then `followup_generated` and `first_followup_at` (with safe partial update helper).
- `volunteerEngagementTracker.ts`: `volunteerCampaignEventMetadata(eventId)` for traceable metadata.
- `leadershipBriefingSelectors.ts`: `completedEventsWithOpenFollowupPhase`.
- `eventAnalyticsSelectors.ts` + `eventTargetingService.ts`: re-export yield + `contactOutcomeHookSummary`.

## Event outcome model (finalized)

- **Stages**: `EVENT_OUTCOME_STAGES` in `eventOutcomeDomain.ts` (aligned with DB CHECK).
- **Health**: `computeEventOutcomeHealth` + `deriveEffectivenessHints` (advisory reason tokens).
- **Agent Jones**: `buildAgentJonesEventOutcomeLoopSnapshot` → `event_intelligence.outcome_loop` (bounded, validated server-side).

## Commands run

```bash
npm run check:env
npm run lint
npm run test
npm run build
```

(Executed successfully in this workspace; re-run after applying the migration to your Supabase project.)

## Verify status

- Lint / test / build: passed locally (`vitest` includes `src/lib/eventOutcomeDomain.test.ts`).
- **Manual smoke**: event record → Outcomes card loads snapshot; intelligence layer → save learning hits Supabase; check-in increases attendance and outcomes row count (after migration applied); Agent Jones on event desk receives `outcome_loop` when intelligence layer is active.

## Known gaps (honest)

- **Rollup view** is not yet bulk-fetched on `EventAnalyticsPage` / `LeadershipBriefingPage` — pure helpers (`buildEventYieldByType`, etc.) are ready; wire a Supabase query to `campaign_event_outcome_rollups_v1` when you want leadership dashboards without N+1 fetches.
- **Signup sheet ingestion** does not yet push into `campaign_event_outcomes`; attendance trigger covers check-in table only.
- **Volunteer conversion** remains metadata + existing engagement events; no new table for “event → first task” latency (could be a future fact table).
- **Partial outcome updates** use select-then-insert/update to avoid PostgREST upsert nulling columns.

## Recommended next master script

**Cursor Master Script #4 — Geographic Command Layer** (per original sequence): unify district/county/precinct readiness, event saturation, volunteer density, and regional intervention logic.
