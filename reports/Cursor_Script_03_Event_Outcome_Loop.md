# Cursor Master Script #3 — Event → Outcome Loop

## Purpose

Build the **Event → Outcome Loop** as a complete production-grade operational category inside CampaignOS. The event system already has substantial depth: planning, staffing, approvals, promotion, day-of operations, and leadership views. This script must solve the next full problem end to end:

**Event creation → promotion → staffing → attendance → conversations / contacts → volunteer conversion → follow-up → outcome capture → leadership rollup → Agent Jones context**

The goal is to move CampaignOS beyond "event operations" into **political outcome operations**.

Events are not the finish line. They are instruments. Every event must produce measurable downstream value:
- attendance
- volunteer activation
- contact growth
- follow-up workload
- conversion into the next action
- strategic learning
- leadership visibility

This script should close the loop so the system can answer:
- What did this event produce?
- Who moved deeper into the campaign because of it?
- What follow-up is still open?
- Which event types generate the best outcomes?
- Where are we losing value between turnout and action?

---

## Mission Definition

You are building the third major self-driving systems layer.

The end state is:

1. Every event has a measurable outcome profile.
2. Attendance is tied to action, not just counted.
3. Follow-up tasks and workflows are created from what happened.
4. Volunteer and voter movement triggered by an event can be tracked.
5. Leadership can compare event types, geographies, formats, and hosts.
6. Agent Jones can reason over event effectiveness and bottlenecks.
7. The campaign can optimize future events based on what produces real political return.

This must feel like an **operational outcome engine**, not a post-event notes feature.

---

## Non-Negotiable Standards

- Production-grade code only.
- Build on the existing event domain; do not fork it into a parallel system.
- Prefer additive schema changes and stable selectors.
- Do not bury outcome logic inside components.
- Do not create dead-end after-action forms.
- Every new event outcome surface must feed a real operational next step.
- Keep AI advisory only.
- Keep mobile and iPad usability first-class.
- Minimize browser-only truth where DB-backed truth is appropriate.
- Match existing repo patterns in `src/lib`, `src/hooks`, `src/components/events`, and Netlify functions.

---

## Existing Repo Context You Must Respect

The codebase already includes extensive event infrastructure. Reuse and extend the following areas where relevant:

### Existing event pages
- `src/pages/CampaignEventCalendarPage.tsx`
- `src/pages/CampaignEventRecordPage.tsx`
- `src/pages/EventPromotionDeskPage.tsx`
- `src/pages/EventReviewRequestsPage.tsx`
- `src/pages/EventAnalyticsPage.tsx`
- `src/pages/MultiEventWarRoomPage.tsx`
- `src/pages/LeadershipBriefingPage.tsx`
- `src/pages/EventCheckInPage.tsx`
- `src/pages/CountyEventOperationsPage.tsx`
- `src/pages/NeighborhoodEventHubPage.tsx`

### Existing event components
- `src/components/events/event-detail/*`
- `src/components/events/command/*`
- `src/components/events/operations/*`
- `src/components/events/war-room/*`
- `src/components/events/leadership/*` where applicable
- `src/components/calendar-widgets/*`

### Existing domain / service files
- `src/lib/campaignEventDomain.ts`
- `src/lib/campaignEventDomainServices.ts`
- `src/lib/campaignEventOperationalSync.ts`
- `src/lib/campaignEventSystem.ts`
- `src/lib/campaignEventTaskEngine.ts`
- `src/lib/eventAfterActionEngine.ts`
- `src/lib/eventAnalyticsSelectors.ts`
- `src/lib/eventBriefingAssembly.ts`
- `src/lib/eventCheckinFollowup.ts`
- `src/lib/eventCommsLifecycle.ts`
- `src/lib/eventCommsPostEventSignals.ts`
- `src/lib/eventCommunicationsPipeline.ts`
- `src/lib/eventDayOfExecutionService.ts`
- `src/lib/eventDayOfClosureDefaults.ts`
- `src/lib/eventDayOfClosureSignals.ts`
- `src/lib/eventHealthActionEngine.ts`
- `src/lib/eventLearningCaptureStorage.ts`
- `src/lib/eventOperationsSelectors.ts`
- `src/lib/eventPostEventWorkflow.ts`
- `src/lib/eventSummaryAI.ts`
- `src/lib/eventSummaryEngine.ts`
- `src/lib/eventTargetingService.ts`
- `src/lib/multiEventWarRoomSelectors.ts`
- `src/lib/leadershipBriefingSelectors.ts`
- `src/lib/leadershipBriefingAggregates.ts`
- `src/lib/leadershipBriefingService.ts`
- `src/lib/kpiEngine.ts`

### Existing volunteer bridge files
- `src/lib/volunteerEventStaffingAdapter.ts`
- `src/lib/volunteerCommandDomain.ts`
- `src/lib/volunteerEngagementTracker.ts`
- `src/lib/volunteerOpportunityAnalytics.ts`

### Existing likely-related migrations
- campaign events core
- campaign event workflow tables
- campaign event outcomes / mobilize activity
- campaign event summary helpers
- campaign events operational domain
- campaign event attendance followups task critical
- event command operational layer
- volunteer system / marketplace / recommendations
- signup sheet ingestion

You must audit current event outcome handling before adding anything new.

---

## Deliverable Goal

Deliver a **single cohesive Event → Outcome Loop** that includes:

- canonical event outcome model
- DB-backed event outcome fact layer
- attendance and check-in integration
- post-event follow-up generation
- volunteer conversion tracking
- voter/contact outcome hooks
- learning and after-action normalization
- event effectiveness analytics
- leadership rollups
- Agent Jones bounded context integration
- migrations, services, selectors, hooks, UI wiring, QA checks, and handoff notes

---

## Required Workstreams

## Workstream 1 — Normalize the event outcome lifecycle

Audit existing event lifecycle and closure logic. Then create a canonical event outcome model that extends the existing event domain.

At minimum define or normalize outcome stages / buckets such as:
- planned
- promoted
- staffed
- ready
- executed
- attendance captured
- follow-up generated
- follow-up in progress
- converted
- closed with learnings
- incomplete / needs recovery

For the event record itself, normalize outcome dimensions such as:
- attendance
- conversations
- volunteer signups
- volunteer assignments generated
- voter or contact records affected
- follow-up tasks created
- commitments made
- donations or pledges if applicable
- strategic learnings
- media / story assets captured

### Required implementation
Create or refine stable outcome-domain files such as:
- `src/lib/eventOutcomeDomain.ts`

This should contain:
- canonical types
- outcome buckets
- status labels
- completion requirements
- risk / missing-data flags
- derived outcome health rules
- route hint helpers

Do not leave outcome rules spread across page components.

---

## Workstream 2 — Build a DB-backed event outcome fact layer

The campaign needs a trustworthy answer to what events are producing. Build a DB-backed outcome metrics layer.

### Add or update DB structures as needed
Prefer additive schema work such as:
- event outcome facts table
- event attendance summary table or view
- event conversion fact table
- post-event follow-up queue table
- event learning capture table
- event outcome snapshot view
- RPCs for event outcome rollups

Integrate with existing event and volunteer tables rather than replacing them.

### Minimum DB outputs required
Provide queryable metrics for:
- total attendance by event
- attendance rate vs RSVP / expected capacity where possible
- number of volunteers activated by event
- number of assignments or follow-up tasks created
- number of new contacts or matched records influenced
- completion rate of post-event follow-up
- time-to-follow-up
- event outcome completeness score
- event effectiveness by event type
- event effectiveness by geography
- events with unresolved follow-up
- events missing closure data
- highest-yield event types
- low-yield event patterns

### Suggested file targets
- `supabase/migrations/<timestamp>_event_outcome_loop.sql`
- `src/lib/eventOutcomeSelectors.ts`
- `src/lib/eventOutcomeMetrics.ts`

---

## Workstream 3 — Tighten attendance, check-in, and conversation capture

The loop starts with what happened on the ground.

### Required behavior
- event check-in / attendance should feed the event outcome layer
- manual attendance imports or signup sheet ingestion should map into the same truth model
- conversation counts or interaction summaries should be recordable without requiring bloated forms
- outcome capture should support partial completion when real-world events are messy
- missing attendance / closure data should produce recoverable flags, not silent failure

### Suggested file targets
- `src/pages/EventCheckInPage.tsx`
- `src/lib/eventCheckinFollowup.ts`
- `src/lib/eventDayOfExecutionService.ts`
- `src/lib/signupSheetImport.ts`
- `src/lib/signupSheetNormalize.ts`
- `src/lib/eventOutcomeDomain.ts`
- `src/components/events/event-detail/EventOutcomesCard.tsx`

### UX expectation
A field operator should be able to record:
- actual attendance
- notable conversations
- volunteer interest
- major issues
- next follow-up needs
in a fast, mobile-friendly way.

---

## Workstream 4 — Build post-event follow-up generation

An event that ends without follow-up is wasted value. Build a deterministic post-event follow-up engine.

### Required behavior
Generate or queue follow-up based on event outcomes such as:
- attendee thank-you
- volunteer interest follow-up
- donor or supporter callback
- organizer debrief
- media / story capture request
- unresolved logistics recovery
- next event invitation
- team lead review
- conversion task creation

These tasks can write into existing task or volunteer systems if available. Reuse instead of duplicating.

### Suggested file targets
- `src/lib/eventPostEventWorkflow.ts`
- `src/lib/eventAfterActionEngine.ts`
- `src/lib/campaignEventTaskEngine.ts`
- `src/lib/eventCheckinFollowup.ts`
- `src/lib/taskEngine.ts` if needed for integration

### Required outputs
Each event should be able to show:
- follow-up tasks created
- follow-up tasks completed
- overdue follow-up tasks
- most important next action
- closure blockers

---

## Workstream 5 — Track volunteer conversion and movement

Events should feed the volunteer engine.

### Required behavior
Track event-driven volunteer movement such as:
- attendee expressed interest
- attendee accepted volunteer follow-up
- attendee claimed an opportunity
- attendee was assigned after event
- attendee completed a first task after event
- attendee became reliable / recurring contributor

This does not require perfect identity resolution in every case, but it must support traceable linkage where data exists.

### Suggested file targets
- `src/lib/volunteerEventStaffingAdapter.ts`
- `src/lib/volunteerEngagementTracker.ts`
- `src/lib/eventOutcomeMetrics.ts`
- `src/lib/eventOutcomeSelectors.ts`

### Required analytics
Expose at minimum:
- volunteer leads generated per event
- volunteer conversions per event
- time from event to first volunteer action
- event types most likely to produce volunteers
- geographies producing strongest volunteer lift

---

## Workstream 6 — Add voter/contact outcome hooks

Not every event creates a volunteer. Some create supporter movement, relational connections, or follow-up contact load.

### Required behavior
Support event outcomes that connect to:
- new supporter/contact records
- matched voter or resident records
- follow-up contact queues
- targeted outreach cohorts
- relationship / Power5 expansion where appropriate

Do not overpromise perfect CRM attribution if the current model is not ready. Build hooks and fact capture that are honest and useful.

### Suggested file targets
- `src/lib/eventTargetingService.ts`
- `src/lib/campaignKnowledge.ts`
- `src/lib/power5Recruitment.ts`
- `src/lib/power5DashboardHints.ts`
- `src/lib/voterMatch.ts`
- `src/lib/eventOutcomeMetrics.ts`

### Required outputs
At minimum provide:
- contact leads captured
- records needing match / review
- follow-up contact queue count
- event cohorts available for future outreach

---

## Workstream 7 — Normalize learning capture and closure quality

After-action learning already appears to exist in parts. Tighten it into a standard operational layer.

### Required behavior
Every event closure should support structured capture of:
- what worked
- what failed
- turnout pattern notes
- staffing adequacy
- communication success / failure
- audience fit
- candidate / surrogate performance notes if relevant
- logistics failures
- recommendations for next time

This should not become an essay wall. Use structured fields plus concise narrative.

### Suggested file targets
- `src/lib/eventLearningCaptureStorage.ts`
- `src/lib/eventAfterActionEngine.ts`
- `src/components/events/event-detail/EventFollowupCard.tsx`
- `src/components/events/event-detail/EventOutcomesCard.tsx`

### Required outputs
Create a closure quality or completeness indicator based on:
- attendance recorded
- follow-up created
- learnings captured
- blockers resolved or documented

---

## Workstream 8 — Upgrade analytics, dashboards, and leadership visibility

The outcome loop must be visible above the event pages.

### Required analytics
Expose clean selectors or services for:
- event yield by type
- event yield by geography
- event yield by host / segment if available
- follow-up backlog
- event-to-volunteer conversion rate
- unresolved closure risk
- attendance variance
- best performing event patterns
- weakest event patterns
- next intervention candidates

### Suggested file targets
- `src/lib/eventAnalyticsSelectors.ts`
- `src/lib/leadershipBriefingSelectors.ts`
- `src/lib/leadershipBriefingAggregates.ts`
- `src/lib/leadershipBriefingService.ts`
- `src/lib/kpiEngine.ts`
- `src/pages/EventAnalyticsPage.tsx`
- `src/pages/LeadershipBriefingPage.tsx`

### UI expectation
Leadership should be able to answer:
- which events are worth repeating
- which formats need redesign
- where follow-up is breaking down
- which geographies are producing energy
without opening five different pages.

---

## Workstream 9 — Agent Jones bounded event outcome integration

Agent Jones should help interpret event effectiveness, but not own the truth layer.

### Required outputs
Create a safe bounded context pack that can summarize:
- recent event yield
- events with high closure risk
- events with missing follow-up
- event types producing strong conversion
- key lessons from recent events
- recommended interventions
- which events should be repeated, recovered, or redesigned

### Suggested file targets
- `src/lib/agentJonesContextV2.ts`
- `src/lib/agentJonesDeskContext.ts`
- `src/lib/agentJonesPrioritySignals.ts`
- `src/lib/agentJonesNavigationHints.ts`
- `src/lib/eventSummaryAI.ts`
- `netlify/functions/agent-jones.ts` if schema validation needs extension

### Important
AI remains advisory only.
No autonomous writes.
All writes continue through explicit app actions and trusted services.

---

## Workstream 10 — Throughput QA and hardening

Add a meaningful QA pass for this category.

### Required verification
- `npm run check:env`
- `npm run lint`
- `npm run build`
- manual smoke tests across:
  - event record page
  - check-in page
  - event analytics
  - leadership briefing
  - event-driven volunteer and follow-up flows
- if possible, add domain-level tests for outcome completeness and follow-up generation helpers

### Add a dedicated audit / handoff note
Generate a markdown report that explains:
- what was reused
- what was added
- DB objects added
- event outcome model finalized
- routes improved
- analytics added
- known gaps remaining
- recommended next script

Suggested output:
- `reports/event-outcome-loop-audit.md`

---

## Build Sequence You Must Follow

## Step 1 — Audit before adding
Read the existing event closure, check-in, follow-up, analytics, and volunteer bridge files first.
Document what exists and where logic is duplicated.

## Step 2 — Normalize the event outcome model
Create canonical domain types, completeness rules, and flags.

## Step 3 — Add DB truth layer
Add migration(s), selectors, rollups, and metrics needed for trusted event outcome reporting.

## Step 4 — Tighten capture and follow-up
Connect attendance, check-in, outcome recording, and post-event workflow generation.

## Step 5 — Add volunteer and contact outcome bridges
Tie event results into volunteer and contact movement wherever traceable.

## Step 6 — Improve analytics and leadership visibility
Surface the outcome layer in event analytics and leadership tools.

## Step 7 — Add Agent Jones bounded context
Keep it small, useful, and validated.

## Step 8 — Verify and document
Run checks, generate audit, summarize remaining gaps.

---

## Detailed Acceptance Criteria

This script is complete only if all of the following are true:

1. There is a canonical event outcome model in code.
2. There is a DB-backed event outcome metrics layer.
3. Attendance and closure data feed the same truth model.
4. Events generate real follow-up workflows.
5. Event-driven volunteer movement can be tracked where data exists.
6. Event-driven contact / outreach hooks exist where feasible.
7. Closure quality and missing-data flags are visible.
8. Leadership can consume event outcome rollups.
9. Agent Jones has a bounded event outcome context.
10. The system feels more focused on results than activities.

---

## Suggested Implementation Notes

### On schema
Prefer append-only facts, snapshots, or helper views where possible. Preserve auditability.

### On event effectiveness
Keep the model explainable. Example reason codes:
- high attendance but weak follow-up completion
- small event, high volunteer conversion
- strong turnout, low contact capture
- staffing shortage reduced yield
- neighborhood format overperformed
- house party generated strong next-step commitments

### On UI
Use action-centered prompts:
- Record outcomes
- Generate follow-up
- Review closure blockers
- Send thank-you queue
- Create volunteer follow-up
- Escalate incomplete closure
- Compare similar events

### On mobile
Favor stacked cards and segmented sections over giant data grids.

### On route integration
Ensure major cards deep link cleanly:
- event record → outcomes → follow-up tasks
- event analytics → event record
- leadership → at-risk events
- war room → event needing recovery
- volunteer conversion panel → marketplace or assignment context where relevant

---

## File Creation / Extension Checklist

You may create or extend files such as:

- `supabase/migrations/<timestamp>_event_outcome_loop.sql`
- `src/lib/eventOutcomeDomain.ts`
- `src/lib/eventOutcomeSelectors.ts`
- `src/lib/eventOutcomeMetrics.ts`
- `src/lib/eventPostEventWorkflow.ts`
- `src/lib/eventAfterActionEngine.ts`
- `src/lib/eventCheckinFollowup.ts`
- `src/lib/eventAnalyticsSelectors.ts`
- `src/lib/eventLearningCaptureStorage.ts`
- `src/lib/volunteerEngagementTracker.ts`
- `src/lib/agentJonesContextV2.ts`
- `src/pages/EventCheckInPage.tsx`
- `src/pages/EventAnalyticsPage.tsx`
- `src/components/events/event-detail/EventOutcomesCard.tsx`
- `src/components/events/event-detail/EventFollowupCard.tsx`
- `reports/event-outcome-loop-audit.md`

Create only what is necessary. Reuse aggressively.

---

## Required Final Outputs

When finished, provide all of the following in the PR or handoff:

1. concise summary of what changed
2. list of migrations added
3. list of key files created / extended
4. commands run
5. verify status
6. remaining known gaps
7. recommended next master script in the sequence

---

## Commit Guidance

Use a conventional commit style such as:

`feat(events): build end-to-end event outcome loop`

If broken into multiple commits, group them logically:
- schema + selectors
- outcome capture + follow-up generation
- volunteer/contact bridges
- analytics + leadership + agent + audit

---

## Recommended Next Script After This One

After the Event → Outcome Loop is complete, the next highest-value script should be:

**Cursor Master Script #4 — Geographic Command Layer**

This script should unify:
- district / county / precinct / neighborhood readiness
- event saturation
- volunteer density
- target-area pressure
- heat maps
- regional intervention logic

This is the bridge from operational systems into statewide field command.

---

## Final Instruction to Cursor

Do this work in a disciplined sequence. Reuse existing event infrastructure wherever possible. Tighten loose ends. Reduce fragmentation. Make every event produce measurable operational truth.

Do not stop at scaffolding. Deliver a working, integrated event outcome system that materially upgrades CampaignOS from activity tracking into political result tracking.
