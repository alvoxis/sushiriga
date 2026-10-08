import { useTranslation } from '@/i18n';
import type { Location, Weekday } from '@/types';
import { zonedParts } from '@/utils/time';
import styles from './pickup.module.css';

/** Monday-first week, as customary in Latvia. */
const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function OpeningHoursTable({ location }: { location: Location }) {
  const { t } = useTranslation();
  const today = zonedParts(new Date(), location.timeZone).weekday;
  return (
    <table className={styles.hours}>
      <caption className="visually-hidden">{t('pickup.hours')}</caption>
      <tbody>
        {WEEK.map((day) => {
          const intervals = location.openingHours[day];
          return (
            <tr key={day} aria-current={day === today ? 'date' : undefined}>
              <th scope="row">{t(`pickup.weekdays.${day}`)}</th>
              <td>
                {intervals.length
                  ? intervals.map((i) => `${i.opens}–${i.closes}`).join(', ')
                  : t('pickup.closed')}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
