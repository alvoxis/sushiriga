/** Route patterns. Use `paths.*` to build concrete URLs. */
export const ROUTES = {
  home: '/',
  menu: '/menu',
  category: '/menu/:category',
  product: '/product/:id',
  cart: '/cart',
  checkout: '/checkout',
  order: '/order/:id',
  account: '/account',
  accountOrders: '/account/orders',
  accountReviews: '/account/reviews',
  accountPromocodes: '/account/promocodes',
  accountTips: '/account/tips',
  reviews: '/reviews',
  pickup: '/pickup',
  assistant: '/assistant',
} as const;

/**
 * Restaurant admin panel: its own layout and lazily-loaded chunks, behind staff sign-in
 * (the server enforces roles; the UI only hides what a role cannot use).
 */
export const ADMIN_ROUTES = {
  root: '/admin',
  menu: '/admin/menu',
  promocodes: '/admin/promocodes',
  reviews: '/admin/reviews',
} as const;

export const paths = {
  category: (slug: string) => `/menu/${encodeURIComponent(slug)}`,
  /** Opens the chapter's book on the page that contains the dish. */
  dishInBook: (slug: string, productId: string) =>
    `/menu/${encodeURIComponent(slug)}?dish=${encodeURIComponent(productId)}`,
  search: (query: string) => `/menu?q=${encodeURIComponent(query)}`,
  product: (id: string) => `/product/${encodeURIComponent(id)}`,
  order: (id: string) => `/order/${encodeURIComponent(id)}`,
};
