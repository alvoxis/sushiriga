/* eslint-disable react-refresh/only-export-components -- route table, not a component module */
import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { RouteError } from './layouts/RouteError';
import { ADMIN_ROUTES, ROUTES } from './routes';

// Every page is its own chunk (code splitting); the home page is part of the main bundle path.
const HomePage = lazy(() => import('@/pages/home/HomePage'));
const MenuPage = lazy(() => import('@/pages/menu/MenuPage'));
const CategoryPage = lazy(() => import('@/pages/menu/CategoryPage'));
const ProductPage = lazy(() => import('@/pages/product/ProductPage'));
const CartPage = lazy(() => import('@/pages/cart/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/checkout/CheckoutPage'));
const OrderPage = lazy(() => import('@/pages/order/OrderPage'));
const AccountPage = lazy(() => import('@/pages/account/AccountPage'));
const AccountOrdersPage = lazy(() => import('@/pages/account/AccountOrdersPage'));
const AccountReviewsPage = lazy(() => import('@/pages/account/AccountReviewsPage'));
const AccountPromocodesPage = lazy(() => import('@/pages/account/AccountPromocodesPage'));
const AccountTipsPage = lazy(() => import('@/pages/account/AccountTipsPage'));
const ReviewsPage = lazy(() => import('@/pages/reviews/ReviewsPage'));
const PickupPage = lazy(() => import('@/pages/pickup/PickupPage'));
const AssistantPage = lazy(() => import('@/pages/assistant/AssistantPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
// Admin panel: separate chunks, never loaded by customers.
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminMenuPage = lazy(() => import('@/pages/admin/AdminMenuPage'));
const AdminPromoPage = lazy(() => import('@/pages/admin/AdminPromoPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));

export const routeObjects: RouteObject[] = [
  {
    path: ROUTES.home,
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ROUTES.menu, element: <MenuPage /> },
      { path: ROUTES.category, element: <CategoryPage /> },
      { path: ROUTES.product, element: <ProductPage /> },
      { path: ROUTES.cart, element: <CartPage /> },
      { path: ROUTES.checkout, element: <CheckoutPage /> },
      { path: ROUTES.order, element: <OrderPage /> },
      { path: ROUTES.account, element: <AccountPage /> },
      { path: ROUTES.accountOrders, element: <AccountOrdersPage /> },
      { path: ROUTES.accountReviews, element: <AccountReviewsPage /> },
      { path: ROUTES.accountPromocodes, element: <AccountPromocodesPage /> },
      { path: ROUTES.accountTips, element: <AccountTipsPage /> },
      { path: ROUTES.reviews, element: <ReviewsPage /> },
      { path: ROUTES.pickup, element: <PickupPage /> },
      { path: ROUTES.assistant, element: <AssistantPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: ADMIN_ROUTES.root,
    element: (
      <Suspense fallback={null}>
        <AdminLayout />
      </Suspense>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <AdminOrdersPage /> },
      { path: ADMIN_ROUTES.menu, element: <AdminMenuPage /> },
      { path: ADMIN_ROUTES.promocodes, element: <AdminPromoPage /> },
      { path: ADMIN_ROUTES.reviews, element: <AdminReviewsPage /> },
    ],
  },
];
