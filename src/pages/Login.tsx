/**
 * Real auth: email + password only (signInWithPassword / signUp).
 * Do not use signInWithOtp here — that was the old magic-link path.
 */
import { useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import AppHeader from '../components/AppHeader'

function isRateLimitError(error: AuthError): boolean {
  if (error.status === 429) return true
  return /\b429\b|rate\s*limit|too many requests/i.test(error.message)
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  /** Drives password autocomplete: sign-in vs new account (no guessing which flow). */
  const [authIntent, setAuthIntent] = useState<'signin' | 'signup'>('signin')
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>(
    'info',
  )
  const [busy, setBusy] = useState(false)

  const trimmedEmail = email.trim()
  const canSubmit = trimmedEmail.length > 0 && password.length > 0 && !busy

  const handleSignIn = async () => {
    setAuthIntent('signin')

    if (!canSubmit) {
      setMessageTone('error')
      setMessage('Enter email and password.')
      return
    }

    setBusy(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        setMessageTone('error')
        setMessage(
          isRateLimitError(error)
            ? 'Too many attempts. Wait a moment and try again.'
            : error.message,
        )
        return
      }

      if (!data.session) {
        setMessageTone('error')
        setMessage(
          'Sign-in succeeded but no session was returned. Check Supabase Auth settings.',
        )
        return
      }

      setMessageTone('success')
      setMessage('Signed in. Loading your workspace…')
    } finally {
      setBusy(false)
    }
  }

  const handleSignUp = async () => {
    setAuthIntent('signup')

    if (!canSubmit) {
      setMessageTone('error')
      setMessage('Enter email and password to create an account.')
      return
    }

    if (password.length < 6) {
      setMessageTone('error')
      setMessage('Password must be at least 6 characters (Supabase default).')
      return
    }

    setBusy(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      })

      if (error) {
        setMessageTone('error')
        setMessage(
          isRateLimitError(error)
            ? 'Too many attempts. Wait a moment and try again.'
            : error.message,
        )
        return
      }

      if (data.session) {
        setMessageTone('success')
        setMessage('Account ready. Loading your workspace…')
        return
      }

      setMessageTone('info')
      setMessage(
        'Account created. Check your email to confirm before signing in.',
      )
    } finally {
      setBusy(false)
    }
  }

  const msgColor =
    messageTone === 'success'
      ? '#15803d'
      : messageTone === 'error'
        ? '#b91c1c'
        : 'var(--text-h)'

  const passwordAutoComplete =
    authIntent === 'signin' ? 'current-password' : 'new-password'

  return (
    <>
      <AppHeader />
      <main className="app-shell">
        <h1 className="page-title">Login</h1>
        <p className="subtitle" style={{ marginBottom: 16 }}>
          Use your email and password below. Choose <strong>Sign in</strong> if
          you already have an account, or <strong>Create account</strong> if you
          are new. (Magic link or Google can be added later.)
        </p>

        <form
          className="stack-section"
          style={{ maxWidth: '480px' }}
          onSubmit={(e) => {
            e.preventDefault()
            void handleSignIn()
          }}
        >
          <div className="field-block">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="input-stretch"
            />
          </div>

          <div className="field-block">
            <label htmlFor="login-password">Password</label>
            <div className="login-password-row">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={passwordAutoComplete}
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="input-stretch"
              />
              <button
                type="button"
                className="login-password-toggle"
                disabled={busy}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="login-action-section">
            <p className="login-action-heading">Already have an account?</p>
            <button
              type="submit"
              className="btn-touch btn-primary"
              disabled={!canSubmit}
              onClick={() => setAuthIntent('signin')}
            >
              {busy && authIntent === 'signin' ? 'Working…' : 'Sign in'}
            </button>
          </div>

          <div className="login-action-section">
            <p className="login-action-heading">New here?</p>
            <button
              type="button"
              className="btn-touch"
              disabled={!canSubmit}
              onClick={() => void handleSignUp()}
            >
              {busy && authIntent === 'signup' ? 'Working…' : 'Create account'}
            </button>
          </div>
        </form>

        {message ? (
          <p
            role={messageTone === 'success' ? 'status' : undefined}
            className="subtitle"
            style={{ marginTop: 16, color: msgColor, fontWeight: 500 }}
          >
            {message}
          </p>
        ) : null}
      </main>
    </>
  )
}
