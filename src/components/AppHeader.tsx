import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const DRAWER_ID = 'campaignos-nav-drawer'

type AppHeaderProps = {
  /** When set, shows nav + sign out (dashboard shell). */
  onSignOut?: () => void | Promise<void>
}

export default function AppHeader({ onSignOut }: AppHeaderProps) {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, closeDrawer])

  const isDashboard = location.pathname.startsWith('/dashboard')

  return (
    <header className="app-topbar">
      <Link to="/" className="app-brand">
        CampaignOS
      </Link>

      {onSignOut ? (
        <div className="topbar-end">
          <nav className="desktop-nav" aria-label="Main">
            <Link
              to="/dashboard"
              aria-current={isDashboard ? 'page' : undefined}
            >
              Dashboard
            </Link>
          </nav>

          <button
            type="button"
            className="app-menu-btn"
            aria-expanded={drawerOpen}
            aria-controls={DRAWER_ID}
            onClick={() => setDrawerOpen((o) => !o)}
          >
            Menu
          </button>

          <button
            type="button"
            className="btn-touch signout-desktop-only"
            onClick={() => void onSignOut()}
          >
            Sign out
          </button>
        </div>
      ) : null}

      {drawerOpen && onSignOut ? (
        <>
          <button
            type="button"
            className="drawer-backdrop"
            aria-label="Close menu"
            onClick={closeDrawer}
          />
          <nav
            id={DRAWER_ID}
            className="drawer-panel"
            aria-label="Mobile navigation"
          >
            <h2 className="drawer-panel-title">Menu</h2>
            <Link
              to="/dashboard"
              className="drawer-nav-link"
              aria-current={isDashboard ? 'page' : undefined}
              onClick={closeDrawer}
            >
              Dashboard
            </Link>
            <button
              type="button"
              className="btn-touch btn-primary"
              style={{ marginTop: 'auto' }}
              onClick={() => {
                closeDrawer()
                void onSignOut()
              }}
            >
              Sign out
            </button>
          </nav>
        </>
      ) : null}
    </header>
  )
}
