import { useEffect, useState } from 'react';
import { Card, PageHeader } from '@/components/ui';
import { LocationCard } from '@/features/pickup/components/LocationCard';
import { MIN_PREPARATION_MINUTES } from '@/features/pickup/preparationTime';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import type { Location } from '@/types';
import styles from '../page.module.css';

export default function PickupPage() {
  const { t } = useTranslation();
  const { locations } = useServices();
  const [list, setList] = useState<Location[]>([]);
  useDocumentTitle(t('pickup.title'));

  useEffect(() => {
    let active = true;
    locations.listActive().then((loaded) => active && setList(loaded));
    return () => {
      active = false;
    };
  }, [locations]);

  return (
    <div className="container">
      <PageHeader title={t('pickup.title')} lead={t('pickup.lead')} />
      <div className={styles.twoColumns}>
        <div className="stack">
          {list.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
        <Card className="stack">
          <h2 className={styles.cardTitle}>{t('pickup.prepTitle')}</h2>
          <p className={styles.muted}>
            {t('checkout.prepNote', { minutes: MIN_PREPARATION_MINUTES })}
          </p>
        </Card>
      </div>
    </div>
  );
}
