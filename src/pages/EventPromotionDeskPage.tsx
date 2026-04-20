import { Link, Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import MobilizePromotionQueueSection from '../components/events/MobilizePromotionQueueSection'
import { useCampaignEventsContext } from '../context/CampaignEventsContext'
import { useProfile } from '../hooks/useProfile'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { supabase } from '../lib/supabaseClient'

type EventPromotionDeskPageProps = {
  onDevSessionClear?: () => void
}

export default function EventPromotionDeskPage({ onDevSessionClear }: EventPromotionDeskPageProps) {
  const { profile, loading } = useProfile()

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const { events: queueEvents } = useCampaignEventsContext()

  if (!loading && profile && !canAccessEventCoordinatorDesk(profile.primary_role)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <AppHeader onSignOut={handleSignOut} />
      <main className="app-shell event-coordinator-desk-shell">
        {loading && !profile ? (
          <div className="loading-screen" role="status" aria-live="polite">
            Loading…
          </div>
        ) : (
          <div className="event-coordinator-desk" id="event-promotion-desk-page">
            <header className="event-coordinator-desk__command">
              <p className="event-coordinator-desk__eyebrow">Events · Mobilize</p>
              <h1 className="event-coordinator-desk__title">Publish &amp; promotion</h1>
              <p className="event-coordinator-desk__lede">
                Full-page Mobilize promotion queue — same lanes and eligibility as the coordinator desk.
                Use per-event records to fix blockers, then return here to track queue health.
              </p>
              <div className="event-coordinator-desk__quick-actions" aria-label="Navigation">
                <Link to="/events" className="btn-touch btn-touch--ghost">
                  ← Event desk
                </Link>
                <Link to="/events/calendar" className="btn-touch btn-touch--ghost">
                  Calendar
                </Link>
              </div>
            </header>

            <MobilizePromotionQueueSection events={queueEvents} />
          </div>
        )}
      </main>
      <AppFooter />
    </>
  )
}
