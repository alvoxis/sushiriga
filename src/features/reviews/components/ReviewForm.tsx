import { useEffect, useState, type FormEvent } from 'react';
import { Button, TextArea } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import type { Rating } from '@/types';
import { MAX_COMMENT_LENGTH, validateReview } from '../validateReview';
import { RatingInput } from './RatingInput';
import styles from './reviews.module.css';

/** Review for a picked-up order. Only the overall rating is required; nothing is pre-filled. */
export function ReviewForm({
  orderId,
  customerId,
  onSubmitted,
}: {
  orderId: string;
  customerId?: string;
  onSubmitted?: () => void;
}) {
  const { t } = useTranslation();
  const { reviews, config } = useServices();
  const [rating, setRating] = useState<Rating | null>(null);
  const [foodRating, setFoodRating] = useState<Rating | null>(null);
  const [serviceRating, setServiceRating] = useState<Rating | null>(null);
  const [speedRating, setSpeedRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // One review per order: if this order already has one, say thanks instead of a second form.
  useEffect(() => {
    let active = true;
    reviews.getForOrder(orderId).then(
      (existing) => active && existing && setDone(true),
      () => undefined, // the form still works; the server rejects a duplicate
    );
    return () => {
      active = false;
    };
  }, [reviews, orderId]);

  const draft = {
    orderId,
    ...(customerId ? { customerId } : {}),
    ...(rating ? { rating } : {}),
    ...(foodRating ? { foodRating } : {}),
    ...(serviceRating ? { serviceRating } : {}),
    ...(speedRating ? { speedRating } : {}),
    ...(comment.trim() ? { comment: comment.trim() } : {}),
  };
  const errors = validateReview(draft);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (errors.length || !rating) return;
    setBusy(true);
    setFailed(false);
    try {
      await reviews.submit({ ...draft, rating });
      setDone(true);
      onSubmitted?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    // A real backend publishes reviews only after moderation.
    return <p role="status">{config.demoMode ? t('reviews.thanks') : t('reviews.pending')}</p>;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <h2>{t('reviews.formTitle')}</h2>
      <RatingInput
        label={t('reviews.overall')}
        value={rating}
        onChange={setRating}
        {...(showErrors && errors.includes('rating-required')
          ? { error: t('reviews.ratingRequired') }
          : {})}
      />
      <RatingInput label={t('reviews.food')} value={foodRating} onChange={setFoodRating} />
      <RatingInput label={t('reviews.service')} value={serviceRating} onChange={setServiceRating} />
      <RatingInput label={t('reviews.speed')} value={speedRating} onChange={setSpeedRating} />
      <TextArea
        label={t('reviews.comment')}
        hint={t('reviews.commentHint')}
        value={comment}
        maxLength={MAX_COMMENT_LENGTH}
        onChange={(event) => setComment(event.target.value)}
      />
      {failed && (
        <p className={styles.error} role="alert">
          {t('reviews.failed')}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {t('reviews.submit')}
        </Button>
      </div>
    </form>
  );
}
