import { useEffect, useState } from 'react'

/** Client clock for overdue checks; seeded on mount, then updates every 60s. */
export function useNowMs(): number {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return nowMs
}
