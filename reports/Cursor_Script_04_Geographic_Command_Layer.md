# Cursor Master Script #4 — Geographic Command Layer (Statewide Field Control)

## Purpose

Unify **district / county / precinct / neighborhood** field picture into one operational command layer:

- geographic readiness and pressure
- event saturation (density in time windows)
- staffing / comms risk proxies from the live calendar
- follow-up and closure debt by area
- intervention candidates (where to act next)
- heat-style intensity for UI (bands, not cartography)
- bounded **Agent Jones** context (advisory)

This builds on the event program, war room, county ops, and outcome loop — **no parallel calendar**.

## Non-negotiables

- Production-grade, deterministic selectors; no invented census or voter microtargeting.
- Reuse `CampaignCalendarEventRecord`, war-room patterns, and existing geographic fields (`county_id`, `precinct_id`, `district_id`, `neighborhood` when present).
- Prefer pure `src/lib` modules; thin UI wiring.
- AI advisory only; no autonomous writes.

## Workstreams

1. **Domain** — `geographicCommandDomain.ts`: unit kinds, pressure bands, saturation labels, route hints.
2. **Selectors** — `geographicCommandSelectors.ts`: rollups by county (and optional precinct), windowed event counts, staffing/Mobilize/follow-up proxies.
3. **Metrics** — `geographicCommandMetrics.ts`: intervention ranking, heat normalization, Agent Jones snapshot.
4. **UI** — County event operations (and optionally war room): strip or panel showing top pressure areas + deep links.
5. **Agent Jones** — `geographic_command` block in context + Netlify validation.
6. **QA** — `npm run check:env`, `lint`, `test`, `build`; note DB gaps (volunteer density per turf when no table exists).

## Acceptance

- Coordinators see **which geographies are hot**, **under-scheduled**, or **carrying follow-up debt** from real event rows.
- Leadership can reason about **saturation vs readiness** without opening every county view.
- Agent Jones can cite **bounded geographic pressure** when the client supplies the snapshot.

## Recommended next script

**Cursor Master Script #5** — Persisted turf readiness scores (optional materialized rollups, volunteer density join when schema exists).
