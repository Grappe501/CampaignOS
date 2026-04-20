/**
 * Real auth: email + password only (signInWithPassword / signUp).
 * Do not use signInWithOtp here — that was the old magic-link path.
 */
import { useState } from 'react'
import ApplicationUseNotice from '../components/ApplicationUseNotice'
import { runPostSignInAudit } from '../lib/postAuthAudit'
import type { AuthError } from '@supabase/supabase-js'
import { ensureCampaignProfile } from '../lib/ensureCampaignProfile'
import { supabase } from '../lib/supabaseClient'
import AppHeader from '../components/AppHeader'
import AppFooter from '../components/AppFooter'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'

function isRateLimitError(error: AuthError): boolean {
  if (error.status === 429) return true
  return /\b429\b|rate\s*limit|too many requests/i.test(error.message)
}

/** Surface clearer copy for common Supabase Auth responses. */
function formatAuthError(error: AuthError): string {
  const m = error.message.toLowerCase()
  if (
    m.includes('redirect') ||
    m.includes('redirect_uri') ||
    m.includes('redirect url')
  ) {
    return `${error.message} Add this app’s URL under Supabase → Authentication → URL Configuration (Redirect URLs).`
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'That email already has an account. Use Sign in, or reset password from Supabase.'
  }
  if (m.includes('signup') && m.includes('disabled')) {
    return 'New sign-ups are disabled in this Supabase project. Enable Email signups under Authentication → Providers.'
  }
  if (m.includes('database error saving new user')) {
    return 'Sign-up hit a database error. Run `npx supabase db push` so migration 20260421150000 is applied (drops the auth trigger and adds ensure_campaign_profile).'
  }
  return error.message
}

/** Read live values (helps when the browser autofills before React onChange runs). */
function readCredentials(email: string, password: string) {
  const elEmail = document.getElementById(
    'login-email',
  ) as HTMLInputElement | null
  const elPass = document.getElementById(
    'login-password',
  ) as HTMLInputElement | null
  const e = (elEmail?.value ?? email).trim()
  const p = elPass?.value ?? password
  return { email: e, password: p }
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
  const [rememberDevice, setRememberDevice] = useState(false)

  const passwordAutoComplete =
    authIntent === 'signin' ? 'current-password' : 'new-password'

  const handleSignIn = async () => {
    setAuthIntent('signin')
    const { email: em, password: pw } = readCredentials(email, password)
    if (!em || !pw) {
      setMessageTone('error')
      setMessage('Enter email and password.')
      return
    }

    setBusy(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      })

      if (error) {
        setMessageTone('error')
        setMessage(
          isRateLimitError(error)
            ? 'Too many attempts. Wait a moment and try again.'
            : formatAuthError(error),
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

      await ensureCampaignProfile()

      try {
        await runPostSignInAudit({ rememberDevice: rememberDevice })
      } catch {
        /* audit is additive; never block sign-in */
      }

      setMessageTone('success')
      setMessage('Signed in. Loading your workspace…')
      // Full navigation so App picks up persisted session reliably (avoids race with React auth state).
      window.location.replace('/dashboard')
    } finally {
      setBusy(false)
    }
  }

  const handleSignUp = async () => {
    setAuthIntent('signup')
    const { email: em, password: pw } = readCredentials(email, password)
    if (!em || !pw) {
      setMessageTone('error')
      setMessage('Enter email and password to create an account.')
      return
    }

    if (pw.length < 6) {
      setMessageTone('error')
      setMessage('Password must be at least 6 characters (Supabase default).')
      return
    }

    setBusy(true)
    setMessage(null)

    try {
      // Omit emailRedirectTo unless Supabase has this exact origin in
      // Authentication → URL Configuration (Site URL + Redirect URLs). Passing
      // a non-whitelisted URL makes signUp fail for everyone.
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password: pw,
      })

      if (error) {
        setMessageTone('error')
        setMessage(
          isRateLimitError(error)
            ? 'Too many attempts. Wait a moment and try again.'
            : formatAuthError(error),
        )
        return
      }

      if (data.session) {
        await ensureCampaignProfile()
        try {
          await runPostSignInAudit({ rememberDevice: rememberDevice })
        } catch {
          /* additive */
        }
        setMessageTone('success')
        setMessage('Account ready. Loading your workspace…')
        window.location.replace('/dashboard')
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

  const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

  return (
    <>
      <AppHeader />
      <main className="app-shell login-page">
        <header className="login-hero">
          <p className="login-hero-eyebrow">{brand.campaignName}</p>
          <h1 className="login-hero-title">Campaign workspace</h1>
          <p className="login-hero-slogan">{brand.slogan}</p>
        </header>

        <h2 className="login-section-heading">Account access</h2>
        <ApplicationUseNotice variant="compact" />
        <p className="subtitle" style={{ marginBottom: 16 }}>
          Use your email and password below. Choose <strong>Sign in</strong> if
          you already have an account, or <strong>Create account</strong> if you
          are new. Use the buttons — do not rely on the Enter key, so sign-up is
          never mistaken for sign-in.
        </p>

        <form
          className="stack-section login-form"
          style={{ maxWidth: '480px' }}
          onSubmit={(e) => {
            e.preventDefault()
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
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
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
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
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

          <div className="field-block login-remember-row">
            <label className="login-remember-label">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                disabled={busy}
                className="login-remember-check"
              />
              <span>
                Remember this device (trusted-device record for future UX; you
                still sign in with email and password)
              </span>
            </label>
          </div>

          <div className="login-action-section">
            <p className="login-action-heading">Already have an account?</p>
            <button
              type="button"
              className="btn-touch btn-primary"
              disabled={busy}
              onPointerDown={() => setAuthIntent('signin')}
              onClick={() => void handleSignIn()}
            >
              {busy && authIntent === 'signin' ? 'Working…' : 'Sign in'}
            </button>
          </div>

          <div className="login-action-section">
            <p className="login-action-heading">New here?</p>
            <button
              type="button"
              className="btn-touch"
              disabled={busy}
              onPointerDown={() => setAuthIntent('signup')}
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
      <AppFooter />
    </>
  )
}
