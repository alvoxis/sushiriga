import { useMediaQuery } from '@/hooks';

/**
 * Dishes per page: a page must be readable without scrolling inside it.
 * Spreads (≥ 768px) fit 4; a single phone page fits 3 on tall screens and 2 on short ones.
 */
export function useProductsPerPage(): number {
  const spread = useMediaQuery('(min-width: 48rem)');
  const tall = useMediaQuery('(min-height: 47.5rem)');
  return spread ? 4 : tall ? 3 : 2;
}
