import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import { useCampaignEventsContext } from '../context/CampaignEventsContext'
import { useProfile } from '../hooks/useProfile'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import {
  campaignEventRecordPath,
  campaignEventRecordSectionPath,
} from '../lib/campaignEventSystem'
import { listEventsNeedingCoordinatorReview } from '../lib/eventCoordinatorManagementQueues'
import {
  approveCampaignEventRequestRpc,
  rejectCampaignEventRequestRpc,
} from '../lib/campaignEventsFromSupabase'
import { supabase } from '../lib/supabaseClient'

type EventReviewRequestsPageProps = {
  onDevSessionClear?: () => void
}

export default function EventReviewRequestsPage({ onDevSessionClear }: EventReviewRequestsPageProps) {
  const { profile, loading } = useProfile()

  const handleSignOut = () => {
    if (onDevSessionClear) {
      onDevSessionClear()
      return
    }
    void supabase.auth.signOut()
  }

  const { events: queue, refetch } = useCampaignEventsContext()
  const reviewRows = useMemo(() => listEventsNeedingCoordinatorReview(queue), [queue])
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)

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
          <div className="event-coordinator-desk" id="event-review-requests-page">
            <header className="event-coordinator-desk__command">
              <p className="event-coordinator-desk__eyebrow">Events · intake</p>
              <h1 className="event-coordinator-desk__title">Review requests</h1>
              <p className="event-coordinator-desk__lede">
                Draft and submitted rows that still need coordinator or approver review before they move
                into scheduling and promotion. Production will bind this list to the same pipeline
                statuses as the main desk.
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

            <section className="event-coordinator-desk__section" aria-labelledby="review-queue-heading">
              <h2 id="review-queue-heading" className="event-coordinator-desk__h2">
                Queue ({reviewRows.length})
              </h2>
              {actionErr ? (
                <p className="event-coordinator-desk__placeholder" role="alert">
                  {actionErr}
                </p>
              ) : null}
              {reviewRows.length === 0 ? (
                <p className="event-coordinator-desk__meta" role="status">
                  No draft or submitted events in the current source list.
                </p>
              ) : (
                <ul className="event-coordinator-desk__pressure-list">
                  {reviewRows.map((e) => (
                    <li key={e.event_id}>
                      <span className="event-coordinator-desk__pressure-sev">{e.stage_status}</span>{' '}
                      <Link to={campaignEventRecordPath(e.event_id)}>{e.title}</Link>
                      {' · '}
                      <Link to={campaignEventRecordSectionPath(e.event_id, 'tasks')}>Tasks</Link>
                      {e.approval_required && e.operational_status === 'approval_needed' ? (
                        <>
                          {' · '}
                          <button
                            type="button"
                            className="btn-touch btn-touch--ghost"
                            style={{ display: 'inline', minHeight: 'auto', padding: '2px 8px' }}
                            disabled={actionBusyId === e.event_id}
                            onClick={() => {
                              setActionBusyId(e.event_id)
                              setActionErr(null)
                              void (async () => {
                                const { error } = await approveCampaignEventRequestRpc(e.event_id)
                                if (error) setActionErr(error.message)
                                await refetch()
                                setActionBusyId(null)
                              })()
                            }}
                          >
                            Approve
                          </button>
                          {' '}
                          <button
                            type="button"
                            className="btn-touch btn-touch--ghost"
                            style={{ display: 'inline', minHeight: 'auto', padding: '2px 8px' }}
                            disabled={actionBusyId === e.event_id}
                            onClick={() => {
                              setActionBusyId(e.event_id)
                              setActionErr(null)
                              void (async () => {
                                const { error } = await rejectCampaignEventRequestRpc(
                                  e.event_id,
                                  'Rejected from review queue',
                                )
                                if (error) setActionErr(error.message)
                                await refetch()
                                setActionBusyId(null)
                              })()
                            }}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
      <AppFooter />
    </>
  )
}
