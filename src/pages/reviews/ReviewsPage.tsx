import { useEffect, useState } from 'react';
import { Card, PageHeader, PlaceholderPanel } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import type { PublishedReview } from '@/types';
import styles from '../page.module.css';

export default function ReviewsPage() {
  const { t, locale } = useTranslation();
  const { reviews } = useServices();
  const [list, setList] = useState<PublishedReview[] | null>(null);
  useDocumentTitle(t('reviews.title'));

  useEffect(() => {
    let active = true;
    reviews.listPublished().then((loaded) => active && setList(loaded));
    return () => {
      active = false;
    };
  }, [reviews]);

  return (
    <div className="container">
      <PageHeader title={t('reviews.title')} lead={t('reviews.lead')} />
      {list === null ? (
        <p role="status">{t('common.loading')}</p>
      ) : list.length === 0 ? (
        <PlaceholderPanel title={t('reviews.empty')}>{t('home.reviewsEmpty')}</PlaceholderPanel>
      ) : (
        <ul className={styles.grid} role="list">
          {list.map((review) => (
            <li key={review.id}>
              <Card as="article">
                <p aria-label={t('reviews.starLabel', { count: review.rating })}>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </p>
                {review.comment && <p>{review.comment}</p>}
                <p className={styles.muted}>
                  {new Intl.DateTimeFormat(locale).format(new Date(review.createdAt))}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
