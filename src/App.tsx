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
import { LeadershipExecutiveBriefingProvider } from './context/LeadershipExecutiveBriefingContext'
import VolunteerCommandCoordinatorPage from './pages/VolunteerCommandCoordinatorPage'
import VolunteerCommandTeamLeadPage from './pages/VolunteerCommandTeamLeadPage'
import VolunteerSelfServicePage from './pages/VolunteerSelfServicePage'
import OpportunityMarketplacePage from './pages/OpportunityMarketplacePage'
import SignupSheetIngestionPage from './pages/SignupSheetIngestionPage'
import SignupSheetBatchPage from './pages/SignupSheetBatchPage'
import MultiEventWarRoomPage from './pages/MultiEventWarRoomPage'
import LeadershipBriefingPage from './pages/LeadershipBriefingPage'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(() =>
    isDevAuthBypassEnabled() ? createDevBypassSession() : undefined,
  )

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
      <DevMockDashboardProvider>
      <div className="app-viewport">
        {isDevAuthBypassEnabled() ? <DevModeBanner /> : null}
      <CampaignEventsProvider>
      <LeadershipExecutiveBriefingProvider>
      <EventIntelligenceLayerProvider>
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
              />
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
              />
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
              />
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
                onDevSessionClear={
                  isDevAuthBypassEnabled()
                    ? () => setSession(null)
                    : undefined
                }
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
      </EventIntelligenceLayerProvider>
      </LeadershipExecutiveBriefingProvider>
      </CampaignEventsProvider>
      </div>
      </DevMockDashboardProvider>
    </BrowserRouter>
  )
}
