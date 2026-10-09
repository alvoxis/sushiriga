# Mock / demo services

Everything in this folder is **demo-only**: local, in-browser stand-ins for the future backend.

- Used only when `VITE_API_URL` is empty (`config.demoMode`), wired in `../createServices.ts`.
- ESLint forbids importing this folder anywhere else (except tests).
- `demoPaymentService` never charges money; orders it produces carry `payment.provider = 'demo'`
  and the UI labels them as demo orders.
- `fixtures.ts` holds made-up promo codes (`DEMO*`). They are NOT real promotions.
- Pricing in `mockOrderService` imitates the server so the trust model can be exercised today;
  the real backend must implement the same rules (see `features/cart/cartMath.ts`,
  `features/promo/evaluatePromo.ts`).
