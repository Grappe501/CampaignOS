# Voter Contact / Relational Turnout Conversion Layer — Audit

## Summary

CampaignOS now has a **DB-backed voter conversion truth layer** that logs contact attempts, recomputes per-voter conversion state via trigger, exposes **leadership rollups** through a security-definer RPC, and surfaces **operational UI** on Power5, county operations, neighborhood hub, and leadership briefing. **Agent Jones** receives a bounded `voter_conversion_command` digest (validated server-side) alongside existing GOTV command context.

## Modules reused

- **Power5**: `power5_relationship_nodes` (`linked_voter_id`, `connection_strength`, `relationship_kind`, `owner_profile_id`) for relational leverage; quick capture attaches `power5_node_id` on attempts.
- **Voter file**: `raw_vr` FK on attempts/state; county snapshot optional on insert.
- **Profiles / RLS**: `campaign_profiles`, `campaign_profile_id_for_auth()`, `is_campaign_event_editor()` for leadership RPC and broad read for editors.
- **GOTV**: `gotvCountdownEngine` / phase injected into chase priority lines and Agent Jones snapshot.
- **Agent Jones**: `agentJonesContextV2`, Netlify `agent-jones.ts` validation pattern mirrored from `gotv_command_v1`.

## Database objects added

**Migration:** `supabase/migrations/20260430380000_voter_contact_relational_turnout_conversion.sql`

| Object | Purpose |
|--------|---------|
| `voter_conversion_contact_attempts` | Append-only contact log (method, disposition, optional signals, Power5 node link). |
| `voter_conversion_state` | One row per `voter_id`; maintained by trigger fold (no direct volunteer writes). |
| `voter_conversion_fold_state(text)` | SECURITY DEFINER chronological merge + sticky commitment/ballot rules. |
| `tr_voter_conversion_after_attempt_ins` | After insert on attempts → fold. |
| `voter_conversion_leadership_rollups()` | SECURITY DEFINER; county aggregates; **editor-only** via function body guard. |

## Conversion model (finalized)

- **Dispositions** (check-constrained on attempts): from `no_answer` through `ballot_plan_recorded`, `do_not_contact`, etc. (see `voterConversionDomain.ts`).
- **State fields**: `lifecycle_stage`, `support_level`, `commitment_status`, `ballot_plan_status`, `chase_sequence_state`, optional relational owner / primary Power5 node, counts and timestamps.
- **Sticky rules**: `commitment_secured` and `ballot_plan_recorded` persist through benign later touches (e.g. `no_answer` does not clear secured commitment; chase stays `ballot_plan_pending` until ballot recorded). `do_not_contact` / `wrong_contact` reset appropriately.

## Relational model

- Primary relational truth remains **Power5 nodes + edges**; attempts reference `power5_node_id` when logging from the desk.
- **Top connectors** UI ranks nodes by strength + roster link + stage hint (`relationalConversionLinks.ts`).

## Chase sequencing

- **SQL fold** sets `chase_sequence_state` deterministically from disposition sequence.
- **Client** `voterChaseEngine.ts`, `voterConversionPriorities.ts`, and `gotv` phase produce explainable priority lines (no ML).

## UI surfaces

| Surface | Behavior |
|---------|----------|
| Power5 workspace | `VoterConversionQuickCapture` for roster-linked nodes. |
| County operations | Funnel, chase card, commitment backlog, ballot risk, relational queue (editors). |
| Leadership briefing | Headline + funnel + chase + ballot risk + deep links. |
| Neighborhood hub | HQ rollup strip + `TopConnectorPanel` from live Power5 nodes. |

Components live under `src/components/voter-conversion/`.

## Agent Jones

- Client: `buildAgentJonesVoterConversionSnapshot` → `voter_conversion_command` on context v2.
- Server: `validateVoterConversionCommandRaw` — source `voter_conversion_command_v1`, bounded numeric totals, sanitized strings.

## Verification commands

- `npm run check:env` — pass (local).
- `npm run lint` — pass.
- `npm run build` — pass.
- `npx vitest run src/lib/voterConversionDisposition.test.ts` — pass (included in `vitest.config.ts`).

## Known gaps / follow-ups

- **Per-voter command queues** (full sortable tables, export): rollups exist; granular lists need filtered RPCs + pagination by county/chase.
- **Event outcome → conversion**: not auto-wired; recommend scripting attendance → `supporter` / `event_invite_candidate` dispositions via approved services.
- **Automation / task engine**: chase tasks not auto-enqueued; hook `automationTriggerRegistry` in a future pass.
- **Post-vote / “voted” states**: intentionally omitted from product surfaces; keep legally compliant if introduced later.
- **Supervisor teams**: client editor gate uses `canAccessEventCoordinatorDesk`; DB RPC uses `is_campaign_event_editor` (includes supervisor teams) — slight mismatch for rare roles.

## Recommended next master script

**Cursor Master Script #8 — Candidate / Surrogate Message Discipline and Field Narrative Layer** (per original sequence).
