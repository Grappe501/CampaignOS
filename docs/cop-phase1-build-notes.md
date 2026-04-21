# COP Phase 1 — Build notes (recon)

## Reused anchors (do not duplicate logic)

| Area | Canonical source today | COP role |
|------|------------------------|----------|
| Event / program list | `CampaignEventsContext` + `filterProgramEvents` / `filterProgramEventsForOrchestration` | Input to `buildLeadershipBriefing` (unchanged) |
| Executive snapshot | `buildLeadershipBriefing` in `leadershipBriefingService.ts` | **Primary upstream** — COP wraps this snapshot |
| Staffing bulk | `useCampaignStaffingBulk` → `assignmentMap` | Same inputs as cockpit intel + leadership page |
| KPI rows | `useCampaignKpis` / `kpiEngine.ts` | Optional overlay for dashboard COP strip (counts, not reinvented) |
| Agent Jones executive | `leadershipBriefingAgentBridge.buildAgentJonesEventOperationsExecutive` | Stays; COP adds `campaign_operating_picture` alongside |
| Browser-only trend | `leadershipBriefingKpiStorage` prior snapshot | Treated as **auxiliary** freshness signal inside COP `sourceHealth` |

## Duplicate logic replaced (gradual)

- Dashboard leadership cards and leadership page both historically relied on **separate** digest assembly; COP **`CampaignOperatingPicture`** is the shared deterministic projection from one `LeadershipBriefingSnapshot`.
- KPI percentages from `useCampaignKpis` are **additive** context for `volunteer_throughput` / leadership health metrics, not a second briefing engine.

## Integration strategy

1. Build `CampaignOperatingPicture` via `buildCampaignOperatingPicture({ snapshot, scope, kpiOverlay? })`.
2. **Dashboard** (leadership roles): `useCampaignOperatingPicture` + `CampaignOperatingPictureHealthStrip`.
3. **Leadership page**: same hook or inline `useMemo` from existing `snapshot` — avoid double `buildLeadershipBriefing` (derive COP from snapshot already computed).
4. **Agent Jones**: `buildCopAgentSummary(cop)` → `campaign_operating_picture` on `AgentJonesContextV2`, validated server-side as bounded JSON.

## Out of scope (this phase)

- Geo heatmap UI, full automation executor, GOTV engine — backbone only.

## Next pass (script #2)

Volunteer Throughput Engine: marketplace → staffing → assignment → reminders → closeout → reliability.

## Implementation status

- `src/lib/cop/` — types, aggregation, routing, action engine, agent bridge, quality checks, barrel export.
- Dashboard — `CampaignOperatingPictureHealthStrip` for `isCampaignLeadershipRole` users; `useCampaignOperatingPicture({ kpiRows: campaignKpis.kpis })`.
- Leadership — COP strip from existing briefing `snapshot` (no second briefing build).
- Agent Jones — `campaign_operating_picture` on context + Netlify validation + system prompt line.
- Tests — `npm test` (Vitest) for feature extraction bounds.
