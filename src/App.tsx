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
import Login from './pages/Login'

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
          path="/"
          element={
            <Navigate to={session ? '/dashboard' : '/login'} replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
      </DevMockDashboardProvider>
    </BrowserRouter>
  )
}
