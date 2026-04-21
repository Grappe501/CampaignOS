import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { DevMockDashboardProvider } from './context/DevMockDashboardProvider'
import DevModeBanner from './components/DevModeBanner'
import {
  createDevBypassSession,
  isDevAuthBypassEnabled,
} from './lib/devAuth'
import Dashboard from './pages/Dashboard'
import InternDesk from './pages/InternDesk'
import CandidateDesk from './pages/CandidateDesk'
import CoordinatorDesk from './pages/CoordinatorDesk'
import Login from './pages/Login'
import Power5Desk from './pages/Power5Desk'
import FieldNarrativePage from './pages/FieldNarrativePage'
import AdminDesk from './pages/AdminDesk'
import CountyEventOperationsPage from './pages/CountyEventOperationsPage'
import EventAnalyticsPage from './pages/EventAnalyticsPage'
import EventCoordinatorDesk from './pages/EventCoordinatorDesk'
import NeighborhoodEventHubPage from './pages/NeighborhoodEventHubPage'
import CampaignEventCalendarPage from './pages/CampaignEventCalendarPage'
import CampaignEventRecordPage from './pages/CampaignEventRecordPage'
import EventCheckInPage from './pages/EventCheckInPage'
import EventPromotionDeskPage from './pages/EventPromotionDeskPage'
import EventReviewRequestsPage from './pages/EventReviewRequestsPage'
import RoleHomeRedirect from './components/RoleHomeRedirect'
import GlobalFloatingAgentJones from './components/GlobalFloatingAgentJones'
import { CampaignEventsProvider } from './context/CampaignEventsContext'
import { EventIntelligenceLayerProvider } from './context/EventIntelligenceLayerContext'
import VolunteerCommandDeskProvider from './context/VolunteerCommandDeskProvider'
import { LeadershipExecutiveBriefingProvider } from './context/LeadershipExecutiveBriefingContext'
import VolunteerCommandCoordinatorPage from './pages/VolunteerCommandCoordinatorPage'
import VolunteerCommandTeamLeadPage from './pages/VolunteerCommandTeamLeadPage'
import VolunteerSelfServicePage from './pages/VolunteerSelfServicePage'
import OpportunityMarketplacePage from './pages/OpportunityMarketplacePage'
import SignupSheetIngestionPage from './pages/SignupSheetIngestionPage'
import SignupSheetBatchPage from './pages/SignupSheetBatchPage'
import MultiEventWarRoomPage from './pages/MultiEventWarRoomPage'
import LeadershipBriefingPage from './pages/LeadershipBriefingPage'
import FinanceCommandPage from './pages/FinanceCommandPage'
import SimulationCommandPage from './pages/SimulationCommandPage'
import { CampaignManagerCockpitProvider } from './context/CampaignManagerCockpitContext'
import { CockpitTelemetryProvider } from './context/CockpitTelemetryContext'
import { EventAiOrchestrationProvider } from './context/EventAiOrchestrationContext'
import CampaignManagerCockpitPage from './pages/CampaignManagerCockpitPage'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(() =>
    isDevAuthBypassEnabled() ? createDevBypassSession() : undefined,
  )

  const onDevSessionClear = isDevAuthBypassEnabled()
    ? () => setSession(null)
    : undefined

  useEffect(() => {
    if (isDevAuthBypassEnabled()) {
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
      },
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (session === undefined) {
    return (
      <div className="app-viewport">
        <div className="loading-screen" role="status" aria-live="polite">
          Loading…
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <CockpitTelemetryProvider>
      <EventAiOrchestrationProvider>
      <DevMockDashboardProvider>
      <div className="app-viewport">
        {isDevAuthBypassEnabled() ? <DevModeBanner /> : null}
      <CampaignEventsProvider>
      <LeadershipExecutiveBriefingProvider>
      <EventIntelligenceLayerProvider>
      <VolunteerCommandDeskProvider>
      <Routes>
        <Route
          path="/login"
          element={
            session ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route
          path="/dashboard"
          element={
            session ? (
              <Dashboard
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/cockpit/campaign-manager"
          element={
            session ? (
              <CampaignManagerCockpitProvider>
                <CampaignManagerCockpitPage
                  onDevSessionClear={onDevSessionClear}
                />
              </CampaignManagerCockpitProvider>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/intern"
          element={
            session ? (
              <InternDesk
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/candidate"
          element={
            session ? (
              <CandidateDesk
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/coordinator"
          element={
            session ? (
              <CoordinatorDesk
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/power5"
          element={
            session ? (
              <Power5Desk
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/field-narrative"
          element={
            session ? (
              <FieldNarrativePage onDevSessionClear={onDevSessionClear} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            session ? (
              <AdminDesk
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/county-ops"
          element={
            session ? (
              <CountyEventOperationsPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/neighborhood"
          element={
            session ? (
              <NeighborhoodEventHubPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/analytics"
          element={
            session ? (
              <EventAnalyticsPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/calendar"
          element={
            session ? (
              <CampaignEventCalendarPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/review-requests"
          element={
            session ? (
              <EventReviewRequestsPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/promotion"
          element={
            session ? (
              <EventPromotionDeskPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/war-room"
          element={
            session ? (
              <MultiEventWarRoomPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/executive-briefing"
          element={<Navigate to="/events/leadership" replace />}
        />
        <Route
          path="/events/leadership"
          element={
            session ? (
              <LeadershipBriefingPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/finance-command"
          element={
            session ? (
              <FinanceCommandPage onDevSessionClear={onDevSessionClear} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/simulation-command"
          element={
            session ? (
              <SimulationCommandPage onDevSessionClear={onDevSessionClear} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/:eventId/checkin"
          element={
            session ? (
              <EventCheckInPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/:eventId/:detailSection"
          element={
            session ? (
              <CampaignEventRecordPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events/:eventId"
          element={
            session ? (
              <CampaignEventRecordPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/events"
          element={
            session ? (
              <EventCoordinatorDesk
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/volunteers/command"
          element={
            session ? (
              <VolunteerCommandCoordinatorPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/volunteers/team-lead"
          element={
            session ? (
              <VolunteerCommandTeamLeadPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/volunteers/me"
          element={
            session ? (
              <VolunteerSelfServicePage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/volunteers/opportunities"
          element={
            session ? (
              <OpportunityMarketplacePage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/ops/signup-sheets/:batchId"
          element={
            session ? (
              <SignupSheetBatchPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/ops/signup-sheets"
          element={
            session ? (
              <SignupSheetIngestionPage
                onDevSessionClear={onDevSessionClear}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            session ? <RoleHomeRedirect /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {session ? <GlobalFloatingAgentJones /> : null}
      </VolunteerCommandDeskProvider>
      </EventIntelligenceLayerProvider>
      </LeadershipExecutiveBriefingProvider>
      </CampaignEventsProvider>
      </div>
      </DevMockDashboardProvider>
      </EventAiOrchestrationProvider>
      </CockpitTelemetryProvider>
    </BrowserRouter>
  )
}
