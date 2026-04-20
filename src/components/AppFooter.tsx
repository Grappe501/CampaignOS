import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'

const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

export default function AppFooter() {
  return (
    <footer className="app-site-footer">
      <div className="app-site-footer-inner app-shell">
        <div className="app-site-footer-brand-row">
          <img
            className="app-site-footer-logo"
            src={brand.assets.logoPrimaryUrl}
            alt=""
            width={160}
            height={36}
            loading="lazy"
            decoding="async"
          />
          <p className="app-site-footer-tagline">{brand.slogan}</p>
        </div>

        <nav className="app-site-footer-social" aria-label="Campaign social media">
          {brand.social.map((s) => (
            <a
              key={s.platform}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="app-site-footer-social-link"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <p className="app-site-footer-contact">
          <a
            href={brand.contact.addressUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="app-site-footer-contact-link"
          >
            {brand.contact.addressLabel}
          </a>
        </p>

        <nav className="app-site-footer-links" aria-label="Campaign website">
          {brand.siteChrome.footerNav.map((item) => (
            <a
              key={`${item.label}-${item.href}`}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="app-site-footer-nav-link"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="app-site-footer-bottom">
          <p className="app-site-footer-app-line">
            <span className="app-site-footer-app-name">CampaignOS</span>
            <span className="app-site-footer-app-sep">·</span>
            <span>Volunteer workspace for {brand.campaignName}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
