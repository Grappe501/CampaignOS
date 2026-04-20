import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setMessage('Enter your email.')
      return
    }

    setBusy(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
    })

    setBusy(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Check your email for the sign-in link.')
  }

  return (
    <div style={{ padding: 20, textAlign: 'left' }}>
      <h1>Login</h1>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: 4 }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', maxWidth: 360, padding: 8 }}
        />
      </div>

      <button type="button" onClick={() => void signIn()} disabled={busy}>
        {busy ? 'Sending…' : 'Sign in with Email'}
      </button>

      {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}
    </div>
  )
}
