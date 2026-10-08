import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import styles from './Logo.module.css';

/** Wordmark + vermilion seal. TODO(brand): replace with the final logo artwork when available. */
export function Logo() {
  return (
    <Link to={ROUTES.home} className={styles.logo} aria-label="SUSHIRIGA">
      <span className={styles.seal} aria-hidden="true">
        SR
      </span>
      <span className={styles.word} aria-hidden="true">
        SUSHIRIGA
      </span>
    </Link>
  );
}
