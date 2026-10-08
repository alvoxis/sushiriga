import type { Locale } from '@/types';
import { en, type Messages } from './en';
import { lv } from './lv';
import { ru } from './ru';

export const translations: Record<Locale, Messages> = { lv, ru, en };
export type { Messages };
