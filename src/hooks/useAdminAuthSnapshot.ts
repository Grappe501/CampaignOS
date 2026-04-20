import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { isDevAuthBypassEnabled } from '../lib/devAuth'

/**
 * Read-only auth user fields for admin audit surfaces (no privileged APIs).
 */
export function useAdminAuthSnapshot() {
  const bypass = isDevAuthBypassEnabled()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !bypass)

  useEffect(() => {
    if (bypass) return
    let cancelled = false
    void supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return
      if (error) console.warn('useAdminAuthSnapshot:', error.message)
      setUser(data.user ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [bypass])

  if (bypass) {
    return { user: null, loading: false }
  }
  return { user, loading }
}
