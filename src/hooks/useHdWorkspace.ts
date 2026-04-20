import { useCallback, useState } from 'react'

const STORAGE_KEY = 'campaignos-dashboard-hd'

function readHd(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === '0') return false
    return true
  } catch {
    return true
  }
}

export function useHdWorkspace() {
  const [hdWorkspace, setHdWorkspace] = useState(readHd)

  const toggleHdWorkspace = useCallback(() => {
    setHdWorkspace((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const setHdWorkspaceExplicit = useCallback((value: boolean) => {
    setHdWorkspace(value)
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  return {
    hdWorkspace,
    toggleHdWorkspace,
    setHdWorkspace: setHdWorkspaceExplicit,
  }
}
