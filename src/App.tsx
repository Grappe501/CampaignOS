import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(
    undefined,
  )

  useEffect(() => {
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
      <div className="app-viewport">
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
              <Dashboard />
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
    </BrowserRouter>
  )
}
