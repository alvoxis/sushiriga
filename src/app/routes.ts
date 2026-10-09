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
 * Reserved for the restaurant admin panel (not registered yet). It will live in its own
 * lazily-loaded bundle behind staff authentication.
 */
export const ADMIN_ROUTES = {
  root: '/admin',
  orders: '/admin/orders',
  menu: '/admin/menu',
  promocodes: '/admin/promocodes',
  reviews: '/admin/reviews',
  tips: '/admin/tips',
  settings: '/admin/settings',
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
