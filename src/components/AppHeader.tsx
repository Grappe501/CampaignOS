import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'

const DRAWER_ID = 'campaignos-nav-drawer'
const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

type AppHeaderProps = {
  /** When set, shows nav + sign out (dashboard shell). */
  onSignOut?: () => void | Promise<void>
  /** Show link to intern desk (middle operational tier). */
  showInternDesk?: boolean
}

export default function AppHeader({ onSignOut, showInternDesk }: AppHeaderProps) {
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
  const isInternDesk = location.pathname.startsWith('/intern')

  return (
    <header className="app-topbar">
      <Link to="/" className="app-brand">
        <span className="app-brand-lockup" aria-label="CampaignOS">
          <img
            className="app-brand-logo"
            src={brand.assets.logoPrimaryUrl}
            alt=""
            width={120}
            height={28}
            loading="eager"
            decoding="async"
          />
          <span className="app-brand-text">CampaignOS</span>
        </span>
      </Link>

      <nav className="campaign-top-nav" aria-label="Chris Jones for Congress">
        {brand.siteChrome.headerNav.map((item) => (
          <a
            key={`${item.label}-${item.href}`}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="campaign-top-nav-link"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="campaign-header-ctas">
        {brand.siteChrome.headerCtas.map((item) => {
          const isDonate = /donate/i.test(item.label)
          return (
            <a
              key={`${item.label}-${item.href}`}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isDonate
                  ? 'campaign-header-cta campaign-header-cta--donate'
                  : 'campaign-header-cta campaign-header-cta--volunteer'
              }
            >
              {item.label}
            </a>
          )
        })}
      </div>

      {onSignOut ? (
        <div className="topbar-end">
          <nav className="desktop-nav" aria-label="Workspace">
            <Link
              to="/dashboard"
              aria-current={isDashboard ? 'page' : undefined}
            >
              Dashboard
            </Link>
            {showInternDesk ? (
              <Link to="/intern" aria-current={isInternDesk ? 'page' : undefined}>
                Intern desk
              </Link>
            ) : null}
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
      ) : (
        <div className="topbar-end topbar-end--login">
          <button
            type="button"
            className="app-menu-btn"
            aria-expanded={drawerOpen}
            aria-controls={DRAWER_ID}
            onClick={() => setDrawerOpen((o) => !o)}
          >
            Menu
          </button>
        </div>
      )}

      {drawerOpen ? (
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
            aria-label="Navigation"
          >
            <h2 className="drawer-panel-title">Menu</h2>
            <p className="drawer-section-label">Campaign website</p>
            {brand.siteChrome.headerNav.map((item) => (
              <a
                key={`drawer-${item.label}-${item.href}`}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="drawer-nav-link"
                onClick={closeDrawer}
              >
                {item.label}
              </a>
            ))}
            {brand.siteChrome.headerCtas.map((item) => (
              <a
                key={`drawer-cta-${item.label}-${item.href}`}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  /donate/i.test(item.label)
                    ? 'drawer-nav-link drawer-nav-link--donate'
                    : 'drawer-nav-link drawer-nav-link--volunteer'
                }
                onClick={closeDrawer}
              >
                {item.label}
              </a>
            ))}
            {onSignOut ? (
              <>
                <p className="drawer-section-label">Workspace</p>
                <Link
                  to="/dashboard"
                  className="drawer-nav-link"
                  aria-current={isDashboard ? 'page' : undefined}
                  onClick={closeDrawer}
                >
                  Dashboard
                </Link>
                {showInternDesk ? (
                  <Link
                    to="/intern"
                    className="drawer-nav-link"
                    aria-current={isInternDesk ? 'page' : undefined}
                    onClick={closeDrawer}
                  >
                    Intern desk
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="btn-touch btn-primary drawer-signout"
                  onClick={() => {
                    closeDrawer()
                    void onSignOut()
                  }}
                >
                  Sign out
                </button>
              </>
            ) : null}
          </nav>
        </>
      ) : null}
    </header>
  )
}
