# Campaign Operating Picture (COP)

## What it is

The **Campaign Operating Picture** is the deterministic operational layer that projects `LeadershipBriefingSnapshot` (from `buildLeadershipBriefing`) into:

- Typed metrics (`CampaignOperatingPicture.metrics`)
- Ranked risks and opportunities
- A ranked `actionQueue` with internal routes (`copRouting.ts`)
- Composite **readiness**, **pressure**, and **momentum** indices
- A bounded **`CopAgentSummary`** for Agent Jones (does not replace deterministic scores)

## Composition

1. **Sources** — same inputs as leadership briefing: program events, staffing `assignmentMap`, approvals list, war-room rows, browser KPI prior (trend only).
2. **Features** — `copFeatureExtraction.ts` normalizes counts to a `CopFeatureVector`.
3. **Metrics** — `copAggregationService.ts` maps features + leadership counts into named `CopMetricSnapshot` rows (catalog in `copMetricCatalog.ts`).
4. **Risks** — `copRiskScoring.ts` (strategic rows + governance/staffing fallbacks).
5. **Actions** — `copActionEngine.ts` (staffing, approvals, closeout, war room, recommendation echoes).
6. **Quality** — `copQualityChecks.ts` sets per-source health and `dataFreshnessScore`.

## Consumers

| Surface | Integration |
|---------|----------------|
| Dashboard | `CampaignOperatingPictureHealthStrip` for leadership roles; KPI rows passed into COP via `useCampaignOperatingPicture({ kpiRows })`. |
| Leadership briefing | `buildCampaignOperatingPicture` from the same memoized `snapshot` as the page. |
| Agent Jones | `campaign_operating_picture` on `AgentJonesContextV2`; validated in `netlify/functions/agent-jones.ts`. |

## Automation (future)

`CampaignOperatingPicture.orchestration` holds placeholder eligibility maps — execution comes in later phases.

## Transitional / deprecated

- Browser KPI prior remains **auxiliary** for trends ( surfaced in `sourceHealth`).
- Do not use COP to bypass approvals or mutate server state.

## Next script

**Volunteer Throughput Engine** — marketplace → staffing → assignment → reminders → closeout → reliability.
