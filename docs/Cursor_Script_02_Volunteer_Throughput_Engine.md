# Cursor Master Script #2 — Volunteer Throughput Engine (End-to-End)

## Purpose

Build the **Volunteer Throughput Engine** as a full production-grade operational layer inside CampaignOS. This is not a cosmetic pass. The purpose is to turn the existing volunteer modules into a **single continuous system** that moves a person from interest to deployment to follow-up with as little manual friction as possible.

This script should solve **one complete category end to end**:

**Volunteer intake → eligibility → recommendation → opportunity matching → assignment → staffing coverage → task completion → event execution linkage → follow-up → reliability scoring → leadership visibility → Agent Jones context**

The codebase already contains substantial volunteer-domain logic, marketplace logic, staffing logic, and recommendation scaffolding. Your task is to **tighten loose ends**, eliminate dead zones between modules, and deliver a unified throughput engine that behaves like part of a self-driving campaign operating system.

Do not build disconnected widgets. Do not create orphan tables or panels. Every new object must participate in the operational loop.

---

## Mission Definition

You are building the second major self-driving systems layer after the Campaign Operating Picture.

The end state is:

1. A volunteer can enter through a campaign surface.
2. The system can determine what they are eligible and suited for.
3. The system can match them to meaningful opportunities.
4. A coordinator can see and govern the pipeline.
5. Event staffing and opportunity demand update the matching logic.
6. Assignment, acceptance, reminders, completion, no-show behavior, and follow-up all flow into reliability and readiness.
7. Leadership can see throughput, fulfillment, and bottlenecks.
8. Agent Jones can reason over the volunteer system in bounded, server-validated ways.

This must feel like an **operational machine**, not a collection of volunteer pages.

---

## Non-Negotiable Standards

- Production-grade code only.
- Keep patterns consistent with the existing repo.
- Prefer strengthening existing modules over introducing parallel replacements.
- Preserve Supabase + Netlify + React architecture.
- Preserve RLS and advisory AI boundaries.
- Minimize speculative refactors.
- All new logic must have route-level value and next-step connectors.
- Do not leave any new screen without an action path.
- Do not rely on browser-only truth for throughput metrics if a DB-backed approach is feasible.
- Maintain mobile and iPad usability as a first-class requirement.

---

## Existing Repo Context You Must Respect

The repo already includes substantial volunteer infrastructure. You must audit and extend, not duplicate, the following existing areas where relevant:

### Existing UI surfaces

- `src/pages/VolunteerCommandCoordinatorPage.tsx`
- `src/pages/VolunteerCommandTeamLeadPage.tsx`
- `src/pages/VolunteerSelfServicePage.tsx`
- `src/pages/OpportunityMarketplacePage.tsx`

### Existing volunteer UI components

- `src/components/volunteer-command/*`
- `src/components/events/command/VolunteerLoadBalancerPanel.tsx`

### Existing hooks

- `src/hooks/useVolunteerCommandCoordinator.ts`
- `src/hooks/useVolunteerMarketplace.ts`
- `src/hooks/useVolunteerRecommendations.ts`
- `src/hooks/useVolunteerOperations.ts`
- `src/hooks/useVolunteerTasks.ts`
- `src/hooks/useVolunteerTeamLead.ts`
- `src/hooks/useVolunteerSelfService.ts`
- `src/hooks/useVolunteerEngagementSummary.ts`

### Existing domain / service files

- `src/lib/volunteerCommandDomain.ts`
- `src/lib/volunteerCommandApi.ts`
- `src/lib/volunteerCommandCoverage.ts`
- `src/lib/volunteerCommandOnboarding.ts`
- `src/lib/volunteerCommandRecommendations.ts`
- `src/lib/volunteerCommandReliability.ts`
- `src/lib/volunteerCommandReliabilityCompute.ts`
- `src/lib/volunteerCommandReminders.ts`
- `src/lib/volunteerOpportunityApi.ts`
- `src/lib/volunteerOpportunityDomain.ts`
- `src/lib/volunteerOpportunityEligibility.ts`
- `src/lib/volunteerOpportunityMatching.ts`
- `src/lib/volunteerOpportunityRanking.ts`
- `src/lib/volunteerOpportunityClaim.ts`
- `src/lib/volunteerOpportunityAnalytics.ts`
- `src/lib/volunteerOpportunitySync.ts`
- `src/lib/volunteerLoadBalancerService.ts`
- `src/lib/volunteerLoadModels.ts`
- `src/lib/volunteerLoadSnapshots.ts`
- `src/lib/volunteerLoadWarnings.ts`
- `src/lib/volunteerEventStaffingAdapter.ts`
- `src/lib/volunteerEligibilityService.ts`
- `src/lib/volunteerEngagementSummary.ts`
- `src/lib/volunteerEngagementTracker.ts`
- `src/lib/volunteerRecommendationEngine.ts`
- `src/lib/volunteerRecommendationSchemas.ts`
- `src/lib/volunteerRecommendationServer.ts`
- `src/lib/volunteerRecommendationSnapshots.ts`
- `src/lib/volunteerRecommendationEmbeddings.ts`
- `src/lib/volunteerRecommendationPrompting.ts`
- `src/lib/volunteerCapacitySelectors.ts`

### Existing Netlify function

- `netlify/functions/volunteer-intelligence.ts`

### Existing migrations likely related

- volunteer command system
- volunteer command operationalization
- volunteer opportunity marketplace
- volunteer recommendation engagement intelligence
- event approval / volunteer RLS
- event staffing and assignment related tables

You must inspect what already exists before adding anything new.

---

## Deliverable Goal

Deliver a **single cohesive Volunteer Throughput Engine** that includes:

- canonical data model and workflow states
- DB-backed throughput metrics
- coordinator command surface improvements
- marketplace improvements
- event staffing integration
- reliable reminders and follow-up
- reliability scoring
- leadership rollup hooks
- Agent Jones safe context integration
- migration(s), services, selectors, hooks, UI wiring, QA checks, and handoff notes

---

## Required Workstreams

(Workstreams 1–9 and build sequence are unchanged from the working master script — see implementation progress in `reports/volunteer-throughput-engine-audit.md`.)

---

## Recommended Next Script After This One

After this volunteer throughput engine is complete, the next highest-value script should be:

**Cursor Master Script #3 — Event → Outcome Loop**

That script should close the political value chain:

event → attendance → conversations → volunteer conversion → voter follow-up → measurable impact
