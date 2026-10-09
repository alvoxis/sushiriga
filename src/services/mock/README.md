# Mock / demo services

Everything in this folder is **demo-only**: local, in-browser stand-ins for the future backend.

- Used only when `VITE_API_URL` is empty (`config.demoMode`), wired in `../createServices.ts`.
- ESLint forbids importing this folder anywhere else (except tests).
- Checkout creates orders as `PENDING_PAYMENT` (`placeOrder`) — no payment is taken or simulated.
  Only `awaitPaidOrder` with a succeeded payment of exactly the quoted amount moves one to `PAID`;
  `updateStatus` refuses `PAID`.
- `demoPaymentService` never charges money and is not used by checkout today.
- `fixtures.ts` holds made-up promo codes (`DEMO*`). They are NOT real promotions. The demo UI
  accepts them through `mockPromoService` (`mode: 'mock'`) and labels every such discount as a
  test discount, not checked by a server.
- Pricing in `mockOrderService` imitates the server so the trust model can be exercised today;
  the real backend must implement the same rules (see `features/cart/cartMath.ts`,
  `features/promo/evaluatePromo.ts`).
