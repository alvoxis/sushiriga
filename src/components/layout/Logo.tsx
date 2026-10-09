import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import styles from './Logo.module.css';

/** Wordmark + vermilion seal. TODO(brand): replace with the final logo artwork when available. */
export function Logo() {
  return (
    // The accessible name is the visible wordmark (WCAG 2.5.3); the seal is decoration.
    <Link to={ROUTES.home} className={styles.logo}>
      <span className={styles.seal} aria-hidden="true">
        SR
      </span>
      <span className={styles.word}>SUSHIRIGA</span>
    </Link>
  );
}
