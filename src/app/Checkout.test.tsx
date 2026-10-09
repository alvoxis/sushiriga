import { screen, within } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';
import type { Order } from '@/types';

/**
 * Phase 4 — cart, pickup scheduling and guest checkout through the real app.
 * Time is fixed in Riga (2026-10-05 is a Monday, opening hours 11:00–22:00, UTC+3 in October).
 */
const riga = (time: string) => new Date(`2026-10-05T${time}:00+03:00`);

function seedCart(items: { productId: string; quantity: number }[]) {
  localStorage.setItem('sushiriga.cart.v1', JSON.stringify(items));
}

async function fillContact(user: ReturnType<typeof renderApp>['user'], phone = '+371 20 000 000') {
  await user.type(await screen.findByLabelText('Name'), 'Anna Bērziņa');
  await user.type(screen.getByLabelText('Phone'), phone);
  await user.type(screen.getByLabelText('E-mail'), 'anna@example.lv');
}

afterEach(() => vi.useRealTimers());

describe('cart', () => {
  it('changes quantities, removes dishes and recalculates subtotal and total', async () => {
    seedCart([
      { productId: 'maestro', quantity: 1 },
      { productId: 'poke-eel', quantity: 2 },
    ]);
    const { user } = renderApp('/cart');
    expect(await screen.findByTestId('cart-subtotal')).toHaveTextContent('€38.50'); // 10.50 + 2 × 14
    await user.click(screen.getByRole('button', { name: 'One more Maestro' }));
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€49.00');
    await user.click(screen.getByRole('button', { name: 'Remove Poke Eel' }));
    expect(screen.getAllByTestId('cart-line')).toHaveLength(1);
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€21.00');
    expect(screen.getByRole('button', { name: 'One less Maestro' })).toBeEnabled();
  });
});

describe('promo codes (mock mode, clearly labelled)', () => {
  it('a test code applies a TEST discount that is never presented as server-checked', async () => {
    seedCart([{ productId: 'maestro', quantity: 2 }]);
    const { user } = renderApp('/cart');
    expect(await screen.findByText(/only test codes work/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Promo code'), 'demo10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(
      await screen.findByText(/Test code DEMO10 applied — demo discount, not checked by a server/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Discount \(test\)/)).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€18.90');
  });

  it.each([
    ['NOPE', 'This promo code does not exist.'],
    ['DEMOEXPIRED', 'This promo code has expired.'],
    ['DEMO5', 'This promo code works from €30.00.'],
  ])('rejects %s with a clear message', async (code, message) => {
    seedCart([{ productId: 'maestro', quantity: 1 }]);
    const { user } = renderApp('/cart');
    await user.type(await screen.findByLabelText('Promo code'), code);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€10.50');
  });
});

describe('pickup time', () => {
  it('only offers possible times and marks them as preliminary', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: riga('11:59') });
    seedCart([{ productId: 'maestro', quantity: 1 }]);
    const { user } = renderApp('/checkout');
    expect(
      await screen.findByRole('radio', { name: 'As soon as possible (≈ 30 min)' }),
    ).toBeChecked();
    expect(screen.getAllByText('Preliminary').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('radio', { name: 'At a specific time' }));
    const options = within(screen.getByLabelText('Time')).getAllByRole('option').slice(1);
    expect(options[0]).toHaveTextContent('12:30'); // now + 30 min, on the 15-minute grid
    expect(options.at(-1)).toHaveTextContent('22:00'); // closing time, never later
  });

  it('before opening: no "as soon as possible", first slot is opening + 30 min', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: riga('09:00') });
    seedCart([{ productId: 'maestro', quantity: 1 }]);
    renderApp('/checkout');
    await screen.findByLabelText('Time');
    expect(screen.queryByRole('radio', { name: /As soon as possible/ })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Time')).getAllByRole('option')[1]).toHaveTextContent(
      '11:30',
    );
  });

  it('too close to closing: no slots are offered and the order cannot continue', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: riga('21:40') });
    seedCart([{ productId: 'maestro', quantity: 1 }]);
    renderApp('/checkout');
    expect(await screen.findByText('There are no pickup times left today.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Time')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review order' })).toBeDisabled();
  });

  it('a slot that has passed while the form was open is rejected', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: riga('11:59') });
    seedCart([{ productId: 'maestro', quantity: 1 }]);
    const { user } = renderApp('/checkout');
    await fillContact(user);
    await user.click(screen.getByRole('radio', { name: 'At a specific time' }));
    await user.selectOptions(
      screen.getByLabelText('Time'),
      within(screen.getByLabelText('Time')).getByRole('option', { name: '12:30' }),
    );
    vi.setSystemTime(riga('12:20')); // 12:30 is now closer than 30 minutes
    await user.click(screen.getByRole('button', { name: 'Review order' }));
    expect(
      await screen.findByText('This time is no longer available — please choose another one.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('order-review')).not.toBeInTheDocument();
  });
});

describe('guest contact validation', () => {
  it('shows clear errors and does not continue', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: riga('12:00') });
    seedCart([{ productId: 'maestro', quantity: 1 }]);
    const { user } = renderApp('/checkout');
    await user.click(await screen.findByRole('button', { name: 'Review order' }));
    expect(screen.getAllByText('Please fill in this field.')).toHaveLength(2); // name + phone
    await user.type(screen.getByLabelText('Name'), 'A');
    await user.type(screen.getByLabelText('Phone'), '-------');
    await user.type(screen.getByLabelText('E-mail'), 'anna@example');
    await user.click(screen.getByRole('button', { name: 'Review order' }));
    expect(screen.getByText('Please enter your name (at least 2 characters).')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid phone number.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid e-mail address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByTestId('order-review')).not.toBeInTheDocument();
  });
});

describe('guest checkout → review → confirm (no payment)', () => {
  it('creates an unpaid PENDING_PAYMENT order without an account and never claims it is paid', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: riga('12:00') });
    seedCart([
      { productId: 'maestro', quantity: 2 },
      { productId: 'poke-eel', quantity: 1 },
    ]);
    const { user, router } = renderApp('/checkout');
    expect(await screen.findByText('No account needed — order as a guest.')).toBeInTheDocument();
    await fillContact(user);
    await user.click(screen.getByRole('button', { name: 'Review order' }));

    // Review page: dishes, quantities, server totals, pickup, contact, demo note.
    const review = await screen.findByTestId('order-review');
    expect(within(review).getByRole('heading', { name: 'Check your order' })).toHaveFocus();
    expect(within(review).getByText('Maestro')).toBeInTheDocument();
    expect(within(review).getAllByText(/2 ×|1 ×/)).toHaveLength(2);
    expect(within(review).getByTestId('review-total')).toHaveTextContent('€35.00');
    expect(within(review).getByText(/Latgales iela 250A, Rīga LV-1063/)).toBeInTheDocument();
    expect(within(review).getByText(/As soon as possible/)).toBeInTheDocument();
    expect(within(review).getByText('Anna Bērziņa')).toBeInTheDocument();
    expect(within(review).getByText('anna@example.lv')).toBeInTheDocument();
    expect(
      within(review).getByText(/Nothing is charged and the restaurant does not receive it/),
    ).toBeInTheDocument();

    // "Change" keeps what was entered.
    await user.click(within(review).getByRole('button', { name: 'Change' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Anna Bērziņa');
    await user.click(screen.getByRole('button', { name: 'Review order' }));

    await user.click(await screen.findByRole('button', { name: 'Confirm demo order' }));
    expect(await screen.findByTestId('order-status')).toHaveTextContent('Awaiting payment');
    expect(screen.getByText('Demo order created — not paid')).toBeInTheDocument();
    expect(
      screen.getByText(/not paid and has not been sent to the restaurant/),
    ).toBeInTheDocument();
    // "Paid" only appears as a FUTURE step of the progress line — never as done or current.
    const progress = screen.getByRole('list', { name: 'Order progress' });
    expect(within(progress).getByText('Paid')).toHaveAttribute('data-state', 'todo');
    expect(within(progress).getByText('Awaiting payment')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: 'Demo: next status' })).not.toBeInTheDocument();

    // Stored as an unpaid guest order; the cart is empty.
    const id = router.state.location.pathname.split('/').pop()!;
    const stored = (JSON.parse(localStorage.getItem('sushiriga.mock.orders.v2')!) as Order[]).find(
      (o) => o.id === id,
    )!;
    expect(stored).toMatchObject({ status: 'PENDING_PAYMENT', payment: null, total: 3500 });
    expect(stored.customer).toMatchObject({
      type: 'guest',
      name: 'Anna Bērziņa',
      email: 'anna@example.lv',
    });
    expect(JSON.parse(localStorage.getItem('sushiriga.cart.v1')!)).toEqual([]);
  });

  it('a test promo code travels to the order and is labelled as a test discount on review', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: riga('12:00') });
    seedCart([{ productId: 'maestro', quantity: 2 }]);
    const { user } = renderApp('/cart');
    await user.type(await screen.findByLabelText('Promo code'), 'DEMO10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await user.click(await screen.findByRole('link', { name: 'Continue to pickup' }));
    await fillContact(user);
    await user.click(screen.getByRole('button', { name: 'Review order' }));
    const review = await screen.findByTestId('order-review');
    expect(within(review).getByText('Discount (test) (DEMO10)')).toBeInTheDocument();
    expect(within(review).getByTestId('review-total')).toHaveTextContent('€18.90');
  });

  it('works in Latvian', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: riga('12:00') });
    seedCart([{ productId: 'maestro', quantity: 1 }]);
    const { user } = renderApp('/checkout', 'lv');
    await user.type(await screen.findByLabelText('Vārds'), 'Anna');
    await user.type(screen.getByLabelText('Tālrunis'), '20000000');
    await user.click(screen.getByRole('button', { name: 'Pārbaudīt pasūtījumu' }));
    expect(await screen.findByRole('heading', { name: 'Pārbaudi pasūtījumu' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Apstiprināt demo pasūtījumu' }));
    expect(await screen.findByTestId('order-status')).toHaveTextContent('Gaida apmaksu');
  });
});
