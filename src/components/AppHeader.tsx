import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'
import ElectionCountdownBar from './ElectionCountdownBar'
import { useProfile } from '../hooks/useProfile'
import {
  getPrimaryRoleHomeBucket,
  getRoleHomePath,
  getWorkspacePrimaryNavLabel,
  shouldOmitTeamDeskNavLink,
} from '../lib/roleHomeRouting'
import { canAccessAdminDesk } from '../lib/adminDeskAccess'
import { canAccessEventCoordinatorDesk } from '../lib/eventCoordinatorDeskAccess'
import { canAccessLeadershipBriefing } from '../lib/leadershipBriefingAccess'

const DRAWER_ID = 'campaignos-nav-drawer'
const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

type AppHeaderProps = {
  /** When set, shows nav + sign out (dashboard shell). */
  onSignOut?: () => void | Promise<void>
  /** When false, hides the team desk link (`/intern`). Defaults to on for any signed-in workspace shell. */
  showInternDesk?: boolean
}

export default function AppHeader({ onSignOut, showInternDesk }: AppHeaderProps) {
  const showTeamDeskLink = showInternDesk ?? Boolean(onSignOut)
  const { profile, loading: profileLoading } = useProfile()
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
  const isCandidateDesk = location.pathname.startsWith('/candidate')
  const isCoordinatorDesk = location.pathname.startsWith('/coordinator')
  const isAdminDesk = location.pathname.startsWith('/admin')
  const isEventsDesk = location.pathname.startsWith('/events')
  const isWarRoom = location.pathname === '/events/war-room'
  const isLeadershipBriefing = location.pathname === '/events/leadership'

  const showLeadershipBriefingNav =
    Boolean(onSignOut) &&
    !useLegacyWorkspaceNav &&
    canAccessLeadershipBriefing(profile?.primary_role)

  const useLegacyWorkspaceNav = Boolean(onSignOut && profileLoading)
  const primaryPath = useLegacyWorkspaceNav
    ? '/dashboard'
    : getRoleHomePath(profile?.primary_role)
  const primaryLabel = useLegacyWorkspaceNav
    ? 'Dashboard'
    : getWorkspacePrimaryNavLabel(profile?.primary_role)
  const showVolunteerWorkspaceLink =
    Boolean(onSignOut) && !useLegacyWorkspaceNav && primaryPath !== '/dashboard'
  const omitTeamDeskDuplicate =
    Boolean(onSignOut) &&
    !useLegacyWorkspaceNav &&
    shouldOmitTeamDeskNavLink(profile?.primary_role)
  const showTeamDeskRow =
    showTeamDeskLink && (!onSignOut || useLegacyWorkspaceNav || !omitTeamDeskDuplicate)

  const roleBucket = getPrimaryRoleHomeBucket(profile?.primary_role)
  const showCommandCenterNav =
    Boolean(onSignOut) &&
    !useLegacyWorkspaceNav &&
    canAccessAdminDesk(profile?.primary_role) &&
    roleBucket !== 'admin'

  const showEventsDeskNav =
    Boolean(onSignOut) &&
    !useLegacyWorkspaceNav &&
    canAccessEventCoordinatorDesk(profile?.primary_role)

  return (
    <header className="app-topbar">
      <ElectionCountdownBar />
      <div className="app-topbar-main">
      <Link to="/" className="app-brand">
        <span className="app-brand-lockup" aria-label="Jones-OS">
          <img
            className="app-brand-logo"
            src={brand.assets.logoPrimaryUrl}
            alt=""
            width={120}
            height={28}
            loading="eager"
            decoding="async"
          />
          <span className="app-brand-text">Jones-OS</span>
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
              to={primaryPath}
              aria-current={
                location.pathname === primaryPath ||
                (primaryPath === '/dashboard' && isDashboard) ||
                (primaryPath === '/intern' && isInternDesk) ||
                (primaryPath === '/candidate' && isCandidateDesk) ||
                (primaryPath === '/coordinator' && isCoordinatorDesk) ||
                (primaryPath === '/admin' && isAdminDesk)
                  ? 'page'
                  : undefined
              }
            >
              {primaryLabel}
            </Link>
            {showEventsDeskNav ? (
              <>
                <Link to="/events" aria-current={isEventsDesk && !isWarRoom ? 'page' : undefined}>
                  Events
                </Link>
                <Link to="/events/war-room" aria-current={isWarRoom ? 'page' : undefined}>
                  War room
                </Link>
                {showLeadershipBriefingNav ? (
                  <Link
                    to="/events/leadership"
                    aria-current={isLeadershipBriefing ? 'page' : undefined}
                  >
                    Executive briefing
                  </Link>
                ) : null}
              </>
            ) : null}
            {showCommandCenterNav ? (
              <Link to="/admin" aria-current={isAdminDesk ? 'page' : undefined}>
                Command center
              </Link>
            ) : null}
            {showVolunteerWorkspaceLink ? (
              <Link
                to="/dashboard"
                aria-current={isDashboard ? 'page' : undefined}
              >
                Volunteer workspace
              </Link>
            ) : null}
            {showTeamDeskRow ? (
              <Link to="/intern" aria-current={isInternDesk ? 'page' : undefined}>
                Team desk
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
                  to={primaryPath}
                  className="drawer-nav-link"
                  aria-current={
                    location.pathname === primaryPath ||
                    (primaryPath === '/dashboard' && isDashboard) ||
                    (primaryPath === '/intern' && isInternDesk) ||
                    (primaryPath === '/candidate' && isCandidateDesk) ||
                    (primaryPath === '/coordinator' && isCoordinatorDesk) ||
                    (primaryPath === '/admin' && isAdminDesk)
                      ? 'page'
                      : undefined
                  }
                  onClick={closeDrawer}
                >
                  {primaryLabel}
                </Link>
                {showEventsDeskNav ? (
                  <>
                    <Link
                      to="/events"
                      className="drawer-nav-link"
                      aria-current={isEventsDesk && !isWarRoom ? 'page' : undefined}
                      onClick={closeDrawer}
                    >
                      Events
                    </Link>
                    <Link
                      to="/events/war-room"
                      className="drawer-nav-link"
                      aria-current={isWarRoom ? 'page' : undefined}
                      onClick={closeDrawer}
                    >
                      War room
                    </Link>
                    {showLeadershipBriefingNav ? (
                      <Link
                        to="/events/leadership"
                        className="drawer-nav-link"
                        aria-current={isLeadershipBriefing ? 'page' : undefined}
                        onClick={closeDrawer}
                      >
                        Executive briefing
                      </Link>
                    ) : null}
                  </>
                ) : null}
                {showCommandCenterNav ? (
                  <Link
                    to="/admin"
                    className="drawer-nav-link"
                    aria-current={isAdminDesk ? 'page' : undefined}
                    onClick={closeDrawer}
                  >
                    Command center
                  </Link>
                ) : null}
                {showVolunteerWorkspaceLink ? (
                  <Link
                    to="/dashboard"
                    className="drawer-nav-link"
                    aria-current={isDashboard ? 'page' : undefined}
                    onClick={closeDrawer}
                  >
                    Volunteer workspace
                  </Link>
                ) : null}
                {showTeamDeskRow ? (
                  <Link
                    to="/intern"
                    className="drawer-nav-link"
                    aria-current={isInternDesk ? 'page' : undefined}
                    onClick={closeDrawer}
                  >
                    Team desk
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
      </div>
    </header>
  )
}
