import { useEffect, useState } from 'react';
import { Button, Card, ChoiceGroup } from '@/components/ui';
import { useAdmin } from '@/features/admin/AdminContext';
import { useTranslation } from '@/i18n';
import type { AdminReview, ReviewModeration } from '@/types';
import styles from './admin.module.css';

/** Reviews appear on the site only after an administrator publishes them. */
export default function AdminReviewsPage() {
  const { t, locale } = useTranslation();
  const { admin, describeError } = useAdmin();
  const [tab, setTab] = useState<ReviewModeration>('pending');
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    admin.reviews(tab).then(
      (list) => active && setReviews(list),
      (failure: unknown) => active && setError(describeError(failure)),
    );
    return () => {
      active = false;
    };
  }, [admin, tab, describeError]);

  async function moderate(review: AdminReview, status: ReviewModeration) {
    setError(null);
    try {
      await admin.moderateReview(review.id, status);
      setReviews((list) => (list ?? []).filter((r) => r.id !== review.id));
    } catch (failure) {
      setError(describeError(failure));
    }
  }

  return (
    <div className={styles.page}>
      <h1>{t('admin.reviews.title')}</h1>
      <ChoiceGroup<ReviewModeration>
        legend={t('admin.reviews.tabsLabel')}
        legendHidden
        value={tab}
        onChange={(value) => {
          setReviews(null);
          setTab(value);
        }}
        choices={(['pending', 'published', 'rejected'] as const).map((value) => ({
          value,
          label: t(`admin.reviews.${value}`),
        }))}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {reviews === null ? (
        !error && <p role="status">{t('common.loading')}</p>
      ) : reviews.length === 0 ? (
        <p>{t('admin.reviews.empty')}</p>
      ) : (
        <ul className={styles.orderList} role="list">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card as="article" className={styles.reviewCard}>
                <p aria-label={t('reviews.starLabel', { count: review.rating })}>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </p>
                {review.comment && <p>{review.comment}</p>}
                <p className={styles.muted}>
                  {t('admin.reviews.order', { id: review.orderId })} ·{' '}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(review.createdAt))}
                </p>
                <div className={styles.actions}>
                  {review.status !== 'published' && (
                    <Button size="sm" onClick={() => void moderate(review, 'published')}>
                      {t('admin.reviews.publish')}
                    </Button>
                  )}
                  {review.status !== 'rejected' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void moderate(review, 'rejected')}
                    >
                      {t('admin.reviews.reject')}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
