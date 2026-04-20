import { useCallback, useEffect, useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import AppHeader from '../components/AppHeader'

const COOLDOWN_AFTER_SUCCESS_SEC = 45
const COOLDOWN_AFTER_RATE_LIMIT_SEC = 90

function isRateLimitError(error: AuthError): boolean {
  if (error.status === 429) return true
  return /\b429\b|rate\s*limit|too many requests|email rate limit/i.test(
    error.message,
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>(
    'info',
  )
  const [busy, setBusy] = useState(false)
  const [cooldownLeft, setCooldownLeft] = useState(0)

  useEffect(() => {
    if (cooldownLeft <= 0) return
    const id = window.setInterval(() => {
      setCooldownLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [cooldownLeft])

  const startCooldown = useCallback((seconds: number) => {
    setCooldownLeft(seconds)
  }, [])

  const signIn = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setMessageTone('error')
      setMessage('Enter your email.')
      return
    }

    if (cooldownLeft > 0 || busy) return

    setBusy(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
      })

      if (error) {
        setMessageTone('error')
        if (isRateLimitError(error)) {
          setMessage(
            'Too many sign-in emails were sent recently. Please wait a minute before trying again so your inbox (and our server) get a short break.',
          )
          startCooldown(COOLDOWN_AFTER_RATE_LIMIT_SEC)
        } else {
          setMessage(error.message)
        }
        return
      }

      setMessageTone('success')
      setMessage('Check your email for the magic link.')
      startCooldown(COOLDOWN_AFTER_SUCCESS_SEC)
    } finally {
      setBusy(false)
    }
  }

  const trimmed = email.trim()
  const submitDisabled = busy || cooldownLeft > 0 || !trimmed

  const msgColor =
    messageTone === 'success'
      ? '#15803d'
      : messageTone === 'error'
        ? '#b91c1c'
        : 'var(--text-h)'

  return (
    <>
      <AppHeader />
      <main className="app-shell">
        <h1 className="page-title">Login</h1>
        <p className="subtitle" style={{ marginBottom: 20 }}>
          Sign in with a one-time link sent to your email. No password required.
        </p>

        <form
          className="stack-section"
          style={{ maxWidth: '480px' }}
          onSubmit={(e) => {
            e.preventDefault()
            void signIn()
          }}
        >
          <div className="field-block">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              enterKeyHint="send"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="input-stretch"
            />
          </div>

          <button
            type="submit"
            className="btn-touch btn-primary"
            disabled={submitDisabled}
          >
            {busy ? 'Sending…' : 'Sign in with email'}
          </button>
        </form>

        {cooldownLeft > 0 ? (
          <p className="subtitle" style={{ marginTop: 12 }}>
            You can request another link in {cooldownLeft}s.
          </p>
        ) : null}

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
