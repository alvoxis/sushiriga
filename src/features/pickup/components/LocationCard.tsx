import { Card } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Location } from '@/types';
import { OpeningHoursTable } from './OpeningHoursTable';
import styles from './pickup.module.css';

export function LocationCard({ location }: { location: Location }) {
  const { t } = useTranslation();
  const { street, city, postalCode } = location.address;
  return (
    <Card as="article" className={styles.card}>
      <h2 className={styles.name}>{location.name}</h2>
      <dl className={styles.facts}>
        <div>
          <dt>{t('pickup.address')}</dt>
          <dd>
            <address style={{ fontStyle: 'normal' }}>
              {street}, {city} {postalCode}
            </address>
          </dd>
        </div>
        {location.phone && (
          <div>
            <dt>{t('pickup.phone')}</dt>
            <dd>
              <a href={`tel:${location.phone.replace(/\s/g, '')}`}>{location.phone}</a>
            </dd>
          </div>
        )}
        {location.email && (
          <div>
            <dt>{t('pickup.email')}</dt>
            <dd>
              <a href={`mailto:${location.email}`}>{location.email}</a>
            </dd>
          </div>
        )}
        <div>
          <dt>{t('pickup.hours')}</dt>
          <dd>
            <OpeningHoursTable location={location} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}
