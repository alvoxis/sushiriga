import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { socialLinks } from '@/data/business';
import { useActiveLocations } from '@/features/pickup/useLocations';
import { useTranslation } from '@/i18n';
import { Logo } from './Logo';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation();
  const active = useActiveLocations();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className="stack">
          <Logo />
          {active.map((location) => (
            <address key={location.id} style={{ fontStyle: 'normal' }}>
              {location.address.street}, {location.address.city} {location.address.postalCode}
            </address>
          ))}
        </div>
        <div>
          <h2 className={styles.heading}>{t('footer.contact')}</h2>
          <ul className={styles.list} role="list">
            {active.map((location) =>
              location.phone ? (
                <li key={location.id}>
                  <a href={`tel:${location.phone.replace(/\s/g, '')}`}>{location.phone}</a>
                </li>
              ) : null,
            )}
            {active.map((location) =>
              location.email ? (
                <li key={`${location.id}-email`}>
                  <a href={`mailto:${location.email}`}>{location.email}</a>
                </li>
              ) : null,
            )}
            <li>
              <Link to={ROUTES.pickup}>{t('pickup.hours')}</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className={styles.heading}>{t('footer.follow')}</h2>
          <ul className={styles.list} role="list">
            {socialLinks.map((link) => (
              <li key={link.id}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={`container ${styles.bottom}`}>
        <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
