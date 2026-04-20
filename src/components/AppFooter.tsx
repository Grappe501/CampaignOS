import { useCampaignFooter } from '../hooks/useCampaignFooter'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'
import {
  APPLICATION_USE_NOTICE,
  CAMPAIGN_PAID_FOR,
} from '../brand/compliance'

const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

export default function AppFooter() {
  const footer = useCampaignFooter()

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
          <p className="app-site-footer-tagline">{footer.slogan}</p>
        </div>

        <nav className="app-site-footer-social" aria-label="Campaign social media">
          {footer.social.map((s) => (
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

        {footer.contactLabel ? (
          <p className="app-site-footer-contact">
            {footer.contactUrl ? (
              <a
                href={footer.contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="app-site-footer-contact-link"
              >
                {footer.contactLabel}
              </a>
            ) : (
              footer.contactLabel
            )}
          </p>
        ) : null}

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

        <p className="app-site-footer-disclaimer">{CAMPAIGN_PAID_FOR}</p>

        <p className="app-site-footer-use-notice">{APPLICATION_USE_NOTICE}</p>

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
