# CampaignOS — build audit report

_Generated: 2026-04-21T02:54:48.916Z · root: `H:/CampaignOS`_

## Summary

| Check | Result |
|-------|--------|
| `node_modules` present | yes |
| `dist/` present (last build artifact) | yes |
| `npm run check:env` | PASS |
| `npm run lint` | skipped (`--skip-verify`) |
| `npm run build` | skipped (`--skip-verify`) |

| Git working tree | dirty (uncommitted changes) |
| Last commit | `7574dbe` on `feat/campaign-manager-cockpitgit` |

### Phase checklist (where you are)

- **Phase 1 — Dependencies installed:** PASS
- **Phase 3 — Environment (.env) valid for client:** PASS
- **Phase 4 — Lint:** skipped
- **Phase 4 — Production build:** skipped

- **Phase 2 — Database:** 39 migration file(s) in repo (apply to Supabase separately via CLI or SQL Editor)
- **Phase 5 — Netlify Functions:** 8 function source file(s) under `netlify/functions/`
- **Phase 6 — Deploy:** `netlify.toml` present; publish dir `dist` after `npm run build`

---

## Master build plan (bottom-up)

CampaignOS is built in layers. Each phase depends on the ones below.

| Phase | Goal | Repo / commands |
|-------|------|-----------------|
| **1. Toolchain** | Node 20+, npm, Vite, TypeScript, ESLint | `package.json`, `npm install` |
| **2. Database** | Schema, RLS, RPCs, seeds | `supabase/migrations/*.sql`, `supabase/seed.sql`, `db push` / SQL Editor |
| **3. Environment** | Client-safe Supabase URL + anon key; optional Functions origin | `.env`, `npm run check:env` |
| **4. Application** | React routes, auth, dashboard, Agent Jones UI | `src/` |
| **5. Serverless** | Netlify Functions (e.g. Agent Jones + OpenAI) | `netlify/functions/`, secrets on Netlify only |
| **6. Deploy** | Static build + functions | `netlify.toml`, `npm run build` → `dist/` |
| **7. Verify** | Repeatable quality gate | `npm run verify` (= lint + build), `npm run launch` (full lift) |

**Operational loop:** migrate → env → `npm run dev` or `netlify dev` → PR previews on Netlify.

---

## Project fingerprint

| Field | Value |
|-------|-------|
| **name** | campaignos |
| **version** | 0.5.0 |
| **type** | module |
| **dependencies** | 4 |
| **devDependencies** | 12 |

### npm scripts

```json
{
  "setup:env": "node scripts/setup-env.mjs",
  "ingest:api-keys": "node scripts/ingest-api-keys.mjs",
  "check:env": "node scripts/check-env.mjs",
  "bootstrap": "npm install && npm run check:env",
  "verify": "npm run lint && npm run build",
  "audit:build": "node scripts/audit-build.mjs",
  "handoff:chatgpt": "node scripts/generate-chatgpt-handoff.mjs",
  "db:list": "node scripts/list-migrations.mjs",
  "launch": "node scripts/launch.mjs",
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "netlify:env:push": "node scripts/netlify-env-push.mjs",
  "ingest:chrisjones": "node scripts/ingest-chris-jones-homepage.ts"
}
```

### Application surface (quick)

| Area | Count |
|------|------:|
| `src/pages` (tsx) | 24 |
| `src/components` | 166 |
| `supabase/migrations` | 39 |
| `netlify/functions` | 8 |

### Routes (from `src/App.tsx`)

- `/` → redirect to dashboard or login
- `/login` → Login
- `/dashboard` → Dashboard (auth required)
- `*` → redirect to `/`

---

## Directory map (depth ≤ 4, ignored dirs shown as `[skipped]`)

```
.env
.env.example
.git/  [skipped]
.gitignore
.netlify/  [skipped]
content/
├── onboarding-source/
  ├── README.md
  ├── STRUCTURE.json
  ├── Volunteer Welcome Kit.md
dist/  [skipped]
docs/
├── admin-dashboard-build-script.md
├── admin-master-dashboard-blueprint.md
├── campaign-api-keys.md
├── campaign-dashboard-role-architecture.md
├── campaign-permissions-and-access-model.md
├── campaign-tasks-and-calendar-architecture.md
├── campaign-universal-tasks-and-calendar-architecture.md
eslint.config.js
index.html
netlify/
├── functions/
  ├── .gitkeep
  ├── agent-jones-transcribe.ts
  ├── agent-jones.ts
  ├── comms-delivery-stub.ts
  ├── event-comms-draft.ts
  ├── mobilize-events.ts
  ├── public-officials.ts
  ├── signin-audit-context.ts
  ├── volunteer-intelligence.ts
├── lib/
  ├── mobilizePass2Core.ts
netlify.toml
node_modules/  [skipped]
package-lock.json
package.json
pnpm-lock.yaml
public/
├── brand/
  ├── chris-jones-head-and-shoulders.jpg
├── favicon.svg
├── icons.svg
README.md
reports/
├── ai-thread-build-map.md
├── build-audit-20260420-030001.md
├── build-audit-20260420-030215.md
├── build-audit-20260420-030421.md
├── build-audit-20260420-115122.md
├── chatgpt-handoff-latest.md
├── plan-voice-stt-tts-v2.md
scripts/
├── audit-build.mjs
├── check-env.mjs
├── generate-chatgpt-handoff.mjs
├── ingest-api-keys.mjs
├── ingest-chris-jones-homepage.ts
├── ingestion/
  ├── chris-jones-homepage.knowledge.seed.json
  ├── chris-jones-homepage.seed.json
├── launch.mjs
├── list-migrations.mjs
├── netlify-env-push.mjs
├── setup-env.mjs
src/
├── App.css
├── App.tsx
├── assets/
  ├── hero.png
  ├── react.svg
  ├── vite.svg
├── brand/
  ├── chrisJonesForCongress.ts
  ├── compliance.ts
├── components/
  ├── admin/
    ├── AdminAuditSystemPanel.tsx
    ├── AdminConfigurationIntegrations.tsx
    ├── AdminDeskContent.tsx
    ├── AdminDeskHealthRollup.tsx
    ├── AdminEventGovernance.tsx
    ├── AdminExceptionsIntervention.tsx
    ├── AdminGeographyReadiness.tsx
    ├── AdminGovernanceRolesPanel.tsx
    ├── AdminQuickActionsBar.tsx
    ├── AdminTaskCommandCenter.tsx
  ├── agentJones/
    ├── AgentJonesAreaRanking.tsx
    ├── AgentJonesCalendarSummary.tsx
    ├── AgentJonesCommandFusionBlock.tsx
    ├── AgentJonesDeploymentSummary.tsx
    ├── AgentJonesFloatingPanel.tsx
    ├── AgentJonesLauncher.tsx
    ├── AgentJonesLeadershipSummary.tsx
    ├── AgentJonesNextActions.tsx
    ├── AgentJonesPriorityCards.tsx
    ├── AgentJonesProactiveAlerts.tsx
    ├── AgentJonesReadinessCoverage.tsx
    ├── AgentJonesResponseComposer.tsx
    ├── AgentJonesSegmentationSummary.tsx
    ├── AgentJonesSummaryStrip.tsx
    ├── AgentJonesTheaterSummary.tsx
    ├── AgentJonesV32Pass1Panel.tsx
    ├── AgentJonesV34Briefing.tsx
    ├── SuggestedPromptList.tsx
  ├── AgentJones.tsx
  ├── AgentJonesPanel.tsx
  ├── AppErrorBoundary.tsx
  ├── AppFooter.tsx
  ├── AppHeader.tsx
  ├── ApplicationUseNotice.tsx
  ├── calendar-widgets/
    ├── CalendarSnapshotCard.tsx
    ├── CandidateScheduleFocusCard.tsx
    ├── CountyEventRailCard.tsx
    ├── EventPressureSummaryCard.tsx
    ├── MobilizeQueueCard.tsx
    ├── PostEventFollowupCard.tsx
    ├── UpcomingCampaignStrip.tsx
  ├── candidate/
    ├── CandidateDeskContent.tsx
    ├── CandidateElectionStrategicCard.tsx
  ├── coordinator/
    ├── CoordinatorAssignmentSegment.tsx
    ├── CoordinatorDeskContent.tsx
    ├── CoordinatorMissionDispatch.tsx
    ├── CoordinatorOperationsBoard.tsx
  ├── daily/
    ├── DailyMissionCard.tsx
    ├── DailyTaskItem.tsx
  ├── dashboard/
    ├── CampaignKpisCard.tsx
    ├── DashboardAiGuideStrip.tsx
    ├── DashboardGrid.tsx
    ├── DashboardHeader.tsx
    ├── DashboardHubNav.tsx
    ├── DashboardPanelFrame.tsx
    ├── ElectedOfficialsWidget.tsx
    ├── ExceptionRequestCard.tsx
    ├── FirstTaskCard.tsx
    ├── LeadershipKpiScaffold.tsx
    ├── NextStepCard.tsx
    ├── OfficialContactModal.tsx
    ├── OnboardingActivationCard.tsx
    ├── OnboardingBranchCard.tsx
    ├── PlaceholderCard.tsx
    ├── Power5SummaryCard.tsx
    ├── ProfilePhotoUpload.tsx
    ├── PublicOfficialsCard.tsx
    ├── StatusCard.tsx
    ├── TrainingCard.tsx
    ├── VolunteerPathCardGrid.tsx
    ├── VoterStatusCard.tsx
  ├── DashboardNavigationRails.tsx
  ├── DevModeBanner.tsx
  ├── DevStateSwitcher.tsx
  ├── ElectionCountdownBar.tsx
  ├── events/
    ├── calendar/
      ├── EventAgendaDayGroup.tsx
      ├── EventAgendaList.tsx
      ├── EventCalendarFilters.tsx
      ├── EventCalendarHeader.tsx
      ├── EventCalendarMonthGrid.tsx
      ├── EventCalendarPage.tsx
      ├── EventCalendarWeekGrid.tsx
    ├── CampaignCalendarArchitecturePanel.tsx
    ├── CampaignSegmentedCalendarPanel.tsx
    ├── command/
      ├── EventApprovalQueue.tsx
      ├── EventCommunicationsCenterPanel.tsx
      ├── EventDayOfMode.tsx
      ├── EventHealthChip.tsx
      ├── EventIntelligenceLayerPanel.tsx
      ├── EventReadinessTimelineStrip.tsx
      ├── RapidActionsBar.tsx
      ├── StaffingCoverageFilters.tsx
      ├── StaffingCoverageHeatmap.tsx
      ├── StaffingCoverageLegend.tsx
      ├── TodayCommandPanel.tsx
      ├── VolunteerLoadBalancerPanel.tsx
    ├── event-detail/
      ├── EventCalendarVisibilityCard.tsx
      ├── EventDetailHeaderCard.tsx
      ├── EventDetailSectionNav.tsx
      ├── eventDetailUtils.ts
      ├── EventFollowupCard.tsx
      ├── EventHealthDrillDown.tsx
      ├── EventHealthFlags.tsx
      ├── EventJonesIntelligenceCard.tsx
      ├── EventLogisticsCard.tsx
      ├── EventMobilizeCard.tsx
      ├── EventOutcomesCard.tsx
      ├── EventOverviewCard.tsx
      ├── EventPublishPipelineCard.tsx
      ├── EventReadinessCommandCard.tsx
      ├── EventRunOfShowCard.tsx
      ├── EventStaffingCard.tsx
      ├── EventStageTrackerCard.tsx
      ├── EventTargetingAudienceCard.tsx
      ├── EventTaskChecklistCard.tsx
    ├── EventCoordinatorDeskContent.tsx
    ├── EventPermissionsMatrixPanel.tsx
    ├── EventRecordDeskContent.tsx
    ├── EventTypeMatrixSection.tsx
    ├── leadership/
      ├── LeadershipBriefingContent.tsx
    ├── MobilizeIntegrationPanel.tsx
    ├── MobilizePromotionQueueSection.tsx
    ├── operations/
      ├── CountyEventOperationsContent.tsx
      ├── EventAnalyticsContent.tsx
      ├── NeighborhoodEventHubContent.tsx
    ├── PostEventAttentionQueueSection.tsx
    ├── war-room/
      ├── MultiEventWarRoomContent.tsx
    ├── widgets/
      ├── CalendarSnapshotCard.tsx
      ├── CandidateScheduleFocusCard.tsx
      ├── EventPressureSummaryCard.tsx
      ├── MobilizeQueueSummaryCard.tsx
      ├── UpcomingCampaignStrip.tsx
  ├── FloatingAgentJones.tsx
  ├── GlobalFloatingAgentJones.tsx
  ├── intern/
    ├── InternDeskAttentionSummary.tsx
    ├── InternDeskContent.tsx
    ├── internDeskFormat.ts
    ├── InternDeskLogAttemptForm.tsx
    ├── InternDeskMissionTasks.tsx
    ├── InternDeskPipelineQueue.tsx
  ├── power5/
    ├── ConnectedAccountsScaffold.tsx
    ├── OutreachAssistModal.tsx
    ├── Power5ContactPlanCard.tsx
    ├── Power5ImpactPanel.tsx
    ├── Power5NodePanel.tsx
    ├── Power5PropagationCard.tsx
    ├── Power5TreeView.tsx
    ├── Power5Workspace.tsx
  ├── RoleHomeRedirect.tsx
  ├── SocialMediaIcon.tsx
  ├── tasks/
    ├── TaskActionBar.tsx
    ├── TaskListCard.tsx
    ├── TaskWorkspaceModal.tsx
  ├── volunteer-command/
    ├── CoordinatorMarketplacePanel.tsx
    ├── CoordinatorRecommendationInsightsPanel.tsx
    ├── OpportunityMatchReasonsCard.tsx
    ├── TeamLeadRecommendationQueue.tsx
    ├── VolunteerCommandNav.tsx
    ├── VolunteerEngagementSummaryCard.tsx
    ├── VolunteerRecommendedOpportunitiesPanel.tsx
  ├── VoterMatchForm.tsx
  ├── VoterWidget.tsx
  ├── workspace/
    ├── WorkspaceDockBar.tsx
    ├── workspaceDockModel.ts
    ├── workspaceSectionGlyphs.tsx
  ├── WorkspaceDock.tsx
├── context/
  ├── CampaignEventsContext.tsx
  ├── devMockDashboardContext.ts
  ├── DevMockDashboardProvider.tsx
  ├── EventIntelligenceLayerContext.tsx
  ├── LeadershipExecutiveBriefingContext.tsx
  ├── leadershipExecutiveBriefingContextTypes.ts
├── hooks/
  ├── useAdminAuthSnapshot.ts
  ├── useAgentJonesVoiceRecorder.ts
  ├── useCalendarWidgetPack.ts
  ├── useCampaignEvents.ts
  ├── useCampaignFooter.ts
  ├── useCampaignKpis.ts
  ├── useCampaignStaffingBulk.ts
  ├── useCoordinatorDesk.ts
  ├── useCoordinatorEngagementInsights.ts
  ├── useDailyMission.ts
  ├── useDashboardFocusMode.ts
  ├── useDevMockDashboard.ts
  ├── useEventOperationalTasks.ts
  ├── useEventStaffingAssignments.ts
  ├── useEventSummaries.ts
  ├── useExceptionRequest.ts
  ├── useHdWorkspace.ts
  ├── useInternLayer.ts
  ├── useLeadershipExecutiveBriefing.ts
  ├── useNowMs.ts
  ├── useOnboardingBranch.ts
  ├── usePower5Outreach.ts
  ├── usePower5Propagation.ts
  ├── usePower5Workspace.ts
  ├── useProfile.ts
  ├── usePublicOfficials.ts
  ├── useTasks.ts
  ├── useTraining.ts
  ├── useVolunteerCommandCoordinator.ts
  ├── useVolunteerEngagementSummary.ts
  ├── useVolunteerMarketplace.ts
  ├── useVolunteerOperations.ts
  ├── useVolunteerRecommendations.ts
  ├── useVolunteerSelfService.ts
  ├── useVolunteerTasks.ts
  ├── useVolunteerTeamLead.ts
  ├── useVoterMatch.ts
├── index.css
├── lib/
  ├── adminDeskAccess.ts
  ├── agentJonesAreaScoring.ts
  ├── agentJonesBrain.ts
  ├── agentJonesCalendarSignals.ts
  ├── agentJonesCampaignManagerCommand.ts
  ├── agentJonesCampaignPhase.ts
  ├── agentJonesCampaignTheater.ts
  ├── agentJonesCapabilities.ts
  ├── agentJonesCommandFusion.ts
  ├── agentJonesContext.ts
  ├── agentJonesContextV2.ts
  ├── agentJonesCountdown.ts
  ├── agentJonesCoverageSignals.ts
  ├── agentJonesDemographicSignals.ts
  ├── agentJonesDeskContext.ts
  ├── agentJonesDeskRouting.ts
  ├── agentJonesDeskSummaries.ts
  ├── agentJonesEscalationSignals.ts
  ├── agentJonesEventDeployment.ts
  ├── agentJonesEventIntelligenceBridge.ts
  ├── agentJonesFieldIntelligence.ts
  ├── agentJonesGeoSignals.ts
  ├── agentJonesGotvSignals.ts
  ├── agentJonesGuidance.ts
  ├── agentJonesInterventionSequence.ts
  ├── agentJonesKnowledge.ts
  ├── agentJonesLeadershipCommand.ts
  ├── agentJonesNavigationHints.ts
  ├── agentJonesPriorities.ts
  ├── agentJonesPrioritySignals.ts
  ├── agentJonesProactiveAlerts.ts
  ├── agentJonesProactiveV32.ts
  ├── agentJonesProactiveV33.ts
  ├── agentJonesProactiveV34.ts
  ├── agentJonesReadinessSignals.ts
  ├── agentJonesRoleDesk.ts
  ├── agentJonesSegmentation.ts
  ├── agentJonesSessionCoaching.ts
  ├── agentJonesSessionStorage.ts
  ├── agentJonesTargetAreaNarratives.ts
  ├── agentJonesTaskPressure.ts
  ├── agentJonesTradeoffs.ts
  ├── agentJonesV31Pack.ts
  ├── agentJonesV32Pack.ts
  ├── agentJonesV33Pack.ts
  ├── agentJonesV34Pack.ts
  ├── agentJonesV34UiHelpers.ts
  ├── agentJonesV3Brain.ts
  ├── agentJonesWhatChanged.ts
  ├── api/
    ├── agentJones.ts
    ├── agentJonesTranscribe.ts
    ├── eventCommsDraft.ts
    ├── mobilizeEvents.ts
    ├── publicOfficials.ts
    ├── volunteerIntelligence.ts
  ├── approvalPrecheckEngine.ts
  ├── calendarWidgetData.ts
  ├── campaignCalendarArchitecture.ts
  ├── campaignCalendarDevFixtures.ts
  ├── campaignCalendarQueueSource.ts
  ├── campaignCalendarSegmentEngine.ts
  ├── campaignClock.ts
  ├── campaignEventCoordinatorOperations.ts
  ├── campaignEventDomain.ts
  ├── campaignEventDomainServices.ts
  ├── campaignEventOperationalSync.ts
  ├── campaignEventReadinessPersistence.ts
  ├── campaignEventRowMapper.ts
  ├── campaignEventsColumns.ts
  ├── campaignEventsFromSupabase.ts
  ├── campaignEventStaffingBulk.ts
  ├── campaignEventStaffingDevFixtures.ts
  ├── campaignEventSystem.ts
  ├── campaignEventTaskEngine.ts
  ├── campaignEventTasksDb.ts
  ├── campaignEventTypeMatrix.ts
  ├── campaignKnowledge.ts
  ├── candidateDeskNarrative.ts
  ├── candidateLeadershipInsights.ts
  ├── coordinatorDeskData.ts
  ├── dailyMissionEngine.ts
  ├── dashboardState.ts
  ├── devAuth.ts
  ├── deviceFingerprint.ts
  ├── devOnboardingMomentum.ts
  ├── devProfilePhoto.ts
  ├── electedOfficialsDisplay.ts
  ├── ensureCampaignProfile.ts
  ├── event-types.config.ts
  ├── eventAfterActionEngine.ts
  ├── eventAnalyticsSelectors.ts
  ├── eventApprovalAuditDb.ts
  ├── eventApprovalService.ts
  ├── eventBriefingAssembly.ts
  ├── eventBriefingSnapshotStorage.ts
  ├── eventCalendarPageFilters.ts
  ├── eventCheckinFollowup.ts
  ├── eventCommsDeterministicDrafts.ts
  ├── eventCommsGaps.ts
  ├── eventCommsLifecycle.ts
  ├── eventCommsLocalStorage.ts
  ├── eventCommsModels.ts
  ├── eventCommsPermissions.ts
  ├── eventCommsPlaybooks.ts
  ├── eventCommsPostEventSignals.ts
  ├── eventCommsScheduling.ts
  ├── eventCommsSchemas.ts
  ├── eventCommsWorkspaceGuards.ts
  ├── eventCommunicationsPipeline.ts
  ├── eventCoordinatorDeskAccess.ts
  ├── eventCoordinatorManagementQueues.ts
  ├── eventDayOfAgentBridge.ts
  ├── eventDayOfClosureDefaults.ts
  ├── eventDayOfClosureSignals.ts
  ├── eventDayOfExecutionService.ts
  ├── eventDayOfGaps.ts
  ├── eventDayOfHealthOverlay.ts
  ├── eventDayOfLocalStorage.ts
  ├── eventDayOfSchemas.ts
  ├── eventDayOfUiLabels.ts
  ├── eventDayOfWorkspaceGuards.ts
  ├── eventExternalPublishing.ts
  ├── eventFieldExecutionPermissions.ts
  ├── eventHealthActionEngine.ts
  ├── eventHealthHistoryDb.ts
  ├── eventHealthScoreService.ts
  ├── eventHealthScoreV2.ts
  ├── eventIntelligenceContracts.ts
  ├── eventIntelligenceJones.ts
  ├── eventLearningCaptureStorage.ts
  ├── eventMediaCapturePlan.ts
  ├── eventOperationsSelectors.ts
  ├── eventPermissionsMatrix.ts
  ├── eventPostEventWorkflow.ts
  ├── eventPressMediaDecision.ts
  ├── eventReadiness.ts
  ├── eventReadinessTimeline.ts
  ├── eventRecordAccess.ts
  ├── eventSocialPlanning.ts
  ├── eventStaffingMatrix.ts
  ├── eventSubmissionApproval.ts
  ├── eventSummaryAI.ts
  ├── eventSummaryEngine.ts
  ├── eventTargetingService.ts
  ├── eventTaskTemplateConfig.ts
  ├── eventWorkflowEngine.ts
  ├── internPipelineEngine.ts
  ├── kpiEngine.ts
  ├── laneScoringEngine.ts
  ├── leadershipBriefingAccess.ts
  ├── leadershipBriefingAgentBridge.ts
  ├── leadershipBriefingAggregates.ts
  ├── leadershipBriefingKpiStorage.ts
  ├── leadershipBriefingSchemas.ts
  ├── leadershipBriefingSelectors.ts
  ├── leadershipBriefingService.ts
  ├── messageAssist.ts
  ├── mobilizeFieldMapping.ts
  ├── mobilizeIntegration.ts
  ├── mobilizePublishEligibility.ts
  ├── mobilizeQueueModel.ts
  ├── mobilizeTagMapping.ts
  ├── multiEventWarRoomIntervention.ts
  ├── multiEventWarRoomSchemas.ts
  ├── multiEventWarRoomSelectors.ts
  ├── multiEventWarRoomService.ts
  ├── multiEventWarRoomTime.ts
  ├── officialContact.ts
  ├── onboardingCampaignModel.ts
  ├── onboardingEngine.ts
  ├── onboardingMomentum.ts
  ├── operationalCommandGaps.ts
  ├── operationalControlContracts.ts
  ├── operationalDriftDetection.ts
  ├── outreachChannels.ts
  ├── outreachModel.ts
  ├── postAuthAudit.ts
  ├── power5ContactStrategy.ts
  ├── power5DashboardHints.ts
  ├── power5Invites.ts
  ├── power5Model.ts
  ├── power5PropagationTypes.ts
  ├── power5Recruitment.ts
  ├── power5Stages.ts
  ├── power5TreeRules.ts
  ├── rankingEngine.ts
  ├── rapidActionAudit.ts
  ├── rapidActionContextSelectors.ts
  ├── rapidActionMutations.ts
  ├── rapidActionOrchestrator.ts
  ├── rapidActionPrecheck.ts
  ├── rapidActionSchemas.ts
  ├── rapidActionsService.ts
  ├── recordSignInAudit.ts
  ├── roleDashboardScaffold.ts
  ├── roleHomeRouting.ts
  ├── signupSheetAccess.ts
  ├── signupSheetImport.ts
  ├── signupSheetNormalize.ts
  ├── similarEventIntelligenceService.ts
  ├── staffingCoverageHeatmapService.ts
  ├── staffingCoverageModels.ts
  ├── staffingCoverageSelectors.ts
  ├── staffingCoverageSnapshots.ts
  ├── staffingIntelligenceAI.ts
  ├── supabaseClient.ts
  ├── supervisorTasks.ts
  ├── taskEngine.ts
  ├── taskScoring.ts
  ├── todayCommandService.ts
  ├── uploadProfilePhoto.ts
  ├── volunteerCapacitySelectors.ts
  ├── volunteerCommandApi.ts
  ├── volunteerCommandCoverage.ts
  ├── volunteerCommandDomain.ts
  ├── volunteerCommandOnboarding.ts
  ├── volunteerCommandRecommendations.ts
  ├── volunteerCommandReliability.ts
  ├── volunteerCommandReliabilityCompute.ts
  ├── volunteerCommandReminders.ts
  ├── volunteerDashboardCards.ts
  ├── volunteerEligibilityService.ts
  ├── volunteerEngagementSummary.ts
  ├── volunteerEngagementTracker.ts
  ├── volunteerEventStaffingAdapter.ts
  ├── volunteerLoadBalancerService.ts
  ├── volunteerLoadModels.ts
  ├── volunteerLoadSnapshots.ts
  ├── volunteerLoadWarnings.ts
  ├── volunteerMarketplaceFilters.ts
  ├── volunteerOpportunityAnalytics.ts
  ├── volunteerOpportunityApi.ts
  ├── volunteerOpportunityClaim.ts
  ├── volunteerOpportunityDomain.ts
  ├── volunteerOpportunityEligibility.ts
  ├── volunteerOpportunityInvites.ts
  ├── volunteerOpportunityMatching.ts
  ├── volunteerOpportunityMerge.ts
  ├── volunteerOpportunityRanking.ts
  ├── volunteerOpportunitySync.ts
  ├── volunteerRecommendationEmbeddings.ts
  ├── volunteerRecommendationEngine.ts
  ├── volunteerRecommendationPrompting.ts
  ├── volunteerRecommendationSchemas.ts
  ├── volunteerRecommendationServer.ts
  ├── volunteerRecommendationSnapshots.ts
  ├── volunteerTaskWorkspace.ts
  ├── voterMatch.ts
  ├── workspaceStructured.ts
├── main.tsx
├── pages/
  ├── AdminDesk.tsx
  ├── CampaignEventCalendarPage.tsx
  ├── CampaignEventRecordPage.tsx
  ├── CandidateDesk.tsx
  ├── CoordinatorDesk.tsx
  ├── CountyEventOperationsPage.tsx
  ├── Dashboard.tsx
  ├── EventAnalyticsPage.tsx
  ├── EventCheckInPage.tsx
  ├── EventCoordinatorDesk.tsx
  ├── EventPromotionDeskPage.tsx
  ├── EventReviewRequestsPage.tsx
  ├── InternDesk.tsx
  ├── LeadershipBriefingPage.tsx
  ├── Login.tsx
  ├── MultiEventWarRoomPage.tsx
  ├── NeighborhoodEventHubPage.tsx
  ├── OpportunityMarketplacePage.tsx
  ├── Power5Desk.tsx
  ├── SignupSheetBatchPage.tsx
  ├── SignupSheetIngestionPage.tsx
  ├── VolunteerCommandCoordinatorPage.tsx
  ├── VolunteerCommandTeamLeadPage.tsx
  ├── VolunteerSelfServicePage.tsx
├── styles/
  ├── app-layout.css
├── vite-env.d.ts
supabase/
├── .temp/
  ├── cli-latest
  ├── gotrue-version
  ├── linked-project.json
  ├── pooler-url
  ├── postgres-version
  ├── project-ref
  ├── rest-version
  ├── storage-migration
  ├── storage-version
├── config.toml
├── migrations/
  ├── 20260418100000_core_campaign_profiles_and_raw_vr.sql
  ├── 20260419120000_voter_match_layer.sql
  ├── 20260420140000_intern_layer_system.sql
  ├── 20260420140000_onboarding_branch_exception.sql
  ├── 20260420180000_workspace_tasks_training.sql
  ├── 20260420194000_campaign_brand_and_knowledge_ingestion.sql
  ├── 20260421140000_fix_signup_triggers_and_profile_pk.sql
  ├── 20260421150000_ensure_profile_rpc_drop_auth_trigger.sql
  ├── 20260422120000_voter_link_profile_sync_and_display_fix.sql
  ├── 20260422180000_auth_audit_trusted_device_scaffold.sql
  ├── 20260422190000_fix_upsert_unique_constraints.sql
  ├── 20260424100000_onboarding_welcome_kit_tables.sql
  ├── 20260424100001_onboarding_welcome_kit_seed.sql
  ├── 20260424120000_onboarding_momentum_profile.sql
  ├── 20260425120000_onboarding_engine_audit_columns.sql
  ├── 20260425140000_profile_photo_storage.sql
  ├── 20260426100000_power5_relational_engine.sql
  ├── 20260427120000_relational_comms_phase1.sql
  ├── 20260428140000_power5_propagation_engine.sql
  ├── 20260429120000_volunteer_coordinator_task_system.sql
  ├── 20260429140000_volunteer_task_workspace_claim.sql
  ├── 20260429160000_daily_activation_engine.sql
  ├── 20260429170000_adaptive_daily_activation.sql
  ├── 20260430130000_campaign_kpi_mission_system.sql
  ├── 20260430140000_campaign_events_core.sql
  ├── 20260430150000_campaign_event_workflow_tables.sql
  ├── 20260430160000_campaign_event_outcomes_mobilize_activity.sql
  ├── 20260430170000_campaign_event_summary_helpers.sql
  ├── 20260430180000_event_staffing_role_slug_docs.sql
  ├── 20260430190000_campaign_events_operational_domain.sql
  ├── 20260430210000_ensure_volunteer_task_assignments.sql
  ├── 20260430220000_campaign_event_attendance_followups_task_critical.sql
  ├── 20260430230000_volunteer_command_system.sql
  ├── 20260430240000_volunteer_command_operationalization.sql
  ├── 20260430250000_volunteer_opportunity_marketplace.sql
  ├── 20260430260000_volunteer_recommendation_engagement_intelligence.sql
  ├── 20260430280000_campaign_event_approval_volunteer_rls.sql
  ├── 20260430290000_signup_sheet_ingestion.sql
  ├── 20260430310000_event_command_operational_layer.sql
├── README.md
├── seed.sql
├── seeds/
  ├── daily_activation_demo.sql
  ├── volunteer_tasks_demo.sql
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
```

_Tree scan counts files only at listed depth; see statistics below for full `src/` counts._

### `src/` file extensions (full tree, no depth cap)

| Extension | Files |
|-----------|------:|
| `.ts` | 294 |
| `.tsx` | 193 |
| `.css` | 3 |
| `.svg` | 2 |
| `.png` | 1 |

**Total files under `src/`:** 493

---

## Supabase migrations (filename order)

- `20260418100000_core_campaign_profiles_and_raw_vr.sql`
- `20260419120000_voter_match_layer.sql`
- `20260420140000_intern_layer_system.sql`
- `20260420140000_onboarding_branch_exception.sql`
- `20260420180000_workspace_tasks_training.sql`
- `20260420194000_campaign_brand_and_knowledge_ingestion.sql`
- `20260421140000_fix_signup_triggers_and_profile_pk.sql`
- `20260421150000_ensure_profile_rpc_drop_auth_trigger.sql`
- `20260422120000_voter_link_profile_sync_and_display_fix.sql`
- `20260422180000_auth_audit_trusted_device_scaffold.sql`
- `20260422190000_fix_upsert_unique_constraints.sql`
- `20260424100000_onboarding_welcome_kit_tables.sql`
- `20260424100001_onboarding_welcome_kit_seed.sql`
- `20260424120000_onboarding_momentum_profile.sql`
- `20260425120000_onboarding_engine_audit_columns.sql`
- `20260425140000_profile_photo_storage.sql`
- `20260426100000_power5_relational_engine.sql`
- `20260427120000_relational_comms_phase1.sql`
- `20260428140000_power5_propagation_engine.sql`
- `20260429120000_volunteer_coordinator_task_system.sql`
- `20260429140000_volunteer_task_workspace_claim.sql`
- `20260429160000_daily_activation_engine.sql`
- `20260429170000_adaptive_daily_activation.sql`
- `20260430130000_campaign_kpi_mission_system.sql`
- `20260430140000_campaign_events_core.sql`
- `20260430150000_campaign_event_workflow_tables.sql`
- `20260430160000_campaign_event_outcomes_mobilize_activity.sql`
- `20260430170000_campaign_event_summary_helpers.sql`
- `20260430180000_event_staffing_role_slug_docs.sql`
- `20260430190000_campaign_events_operational_domain.sql`
- `20260430210000_ensure_volunteer_task_assignments.sql`
- `20260430220000_campaign_event_attendance_followups_task_critical.sql`
- `20260430230000_volunteer_command_system.sql`
- `20260430240000_volunteer_command_operationalization.sql`
- `20260430250000_volunteer_opportunity_marketplace.sql`
- `20260430260000_volunteer_recommendation_engagement_intelligence.sql`
- `20260430280000_campaign_event_approval_volunteer_rls.sql`
- `20260430290000_signup_sheet_ingestion.sql`
- `20260430310000_event_command_operational_layer.sql`

---

## Netlify functions

- `agent-jones-transcribe.ts`
- `agent-jones.ts`
- `comms-delivery-stub.ts`
- `event-comms-draft.ts`
- `mobilize-events.ts`
- `public-officials.ts`
- `signin-audit-context.ts`
- `volunteer-intelligence.ts`

---

## Command output (truncated)

### check:env

```

> campaignos@0.5.0 check:env
> node scripts/check-env.mjs


Required client-safe variables:
✓ VITE_SUPABASE_URL
✓ VITE_SUPABASE_ANON_KEY

Optional client variables:
• VITE_NETLIFY_FUNCTIONS_ORIGIN empty

Optional server-only variables:
• OPENAI_TRANSCRIPTION_MODEL empty
✓ OPENAI_API_KEY
✓ GOOGLE_CIVIC_API_KEY
✓ GOOGLE_API_KEY
✓ OPENCAGE_API_KEY
✓ API_DOT_GOV_KEY
✓ OPENSTATES_API_KEY
✓ FOURSQUARE_API_KEY
✓ NEWSAPI_API_KEY
✓ GUARDIAN_API_KEY
✓ CONGRESS_GOV_API_KEY
✓ SENDGRID_API_KEY
✓ TWILIO_ACCOUNT_SID
✓ TWILIO_AUTH_TOKEN
✓ TWILIO_PHONE_NUMBER
✓ GITHUB_PAT
• NETLIFY_AUTH_TOKEN empty
• NETLIFY_SITE_ID empty

Reminder: OPENAI_API_KEY is set — keep it server-side / Netlify Functions only (never VITE_).

Environment looks good for local frontend development.

```

_Lint and build were skipped._


---

_Report written by `scripts/audit-build.mjs`. Re-run: `npm run audit:build` (add `--skip-verify` for a fast tree-only report)._
