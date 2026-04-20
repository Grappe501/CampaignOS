import { useCallback, useState } from 'react'

const STORAGE_KEY = 'campaignos-dashboard-focus-calm'

function readInitial(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

/**
 * Calm / focus mode: fewer panels expanded by default + AI guide emphasis.
 * Default on so first load feels light; user can disable anytime.
 */
export function useDashboardFocusMode() {
  const [focusCalmMode, setFocusCalmMode] = useState(readInitial)

  const setFocusCalmModePersist = useCallback((next: boolean) => {
    setFocusCalmMode(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleFocusCalmMode = useCallback(() => {
    setFocusCalmModePersist(!focusCalmMode)
  }, [focusCalmMode, setFocusCalmModePersist])

  return { focusCalmMode, setFocusCalmMode: setFocusCalmModePersist, toggleFocusCalmMode }
}
