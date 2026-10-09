import { screen, within } from '@testing-library/react';
import { createServices, readConfig } from '@/services';
import { createMockPromoService } from '@/services/mock/mockPromoService';
import { renderApp } from '@/test/renderApp';

describe('SUSHIRIGA app', () => {
  it('starts and shows the home page with the menu book', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'A menu you can leaf through' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Menu — menu book' })).toBeInTheDocument();
  });

  it('loads the menu with all visible categories', async () => {
    renderApp('/menu');
    const shelf = await screen.findByRole('navigation', { name: 'Menu categories' });
    expect(within(shelf).getAllByRole('link')).toHaveLength(13);
    expect(within(shelf).getByRole('link', { name: /Rolls, 13 items/ })).toBeInTheDocument();
  });

  it('opens a category from the menu', async () => {
    const { user } = renderApp('/menu');
    await user.click(await screen.findByRole('link', { name: /Tempura, 5 items/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Tempura' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tempura — menu book' })).toBeInTheDocument();
  });

  it('opens a product, adds it to the cart, changes quantity and recalculates the total', async () => {
    const { user } = renderApp('/menu/rolli');
    // switch the category to list view and open a product
    await user.click(await screen.findByRole('radio', { name: 'List' }));
    await user.click(screen.getByRole('link', { name: 'Maestro' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Maestro' })).toBeInTheDocument();
    expect(screen.getByText('€10.50')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(await screen.findByText('Maestro added to the cart')).toBeInTheDocument();

    // go to the cart via the bottom navigation
    await user.click(
      within(screen.getByRole('navigation', { name: 'Quick navigation' })).getByRole('link', {
        name: 'Cart, items: 1',
      }),
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Cart' })).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€10.50');

    await user.click(screen.getByRole('button', { name: 'One more Maestro' }));
    expect(screen.getByTestId('quantity')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('€21.00');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€21.00');

    await user.click(screen.getByRole('button', { name: 'One less Maestro' }));
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€10.50');
  });

  it('counts only available catalog products in the cart badge', async () => {
    localStorage.setItem(
      'sushiriga.cart.v1',
      JSON.stringify([
        { productId: 'no-longer-on-the-menu', quantity: 3 },
        { productId: 'maestro', quantity: 1 },
      ]),
    );
    renderApp('/cart');
    const nav = await screen.findByRole('navigation', { name: 'Quick navigation' });
    expect(within(nav).getByRole('link', { name: 'Cart, items: 1' })).toBeInTheDocument();
    expect(screen.getAllByTestId('cart-line')).toHaveLength(1);
  });

  it('marks a demo order as not paid for real', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-10-05T12:00:00+03:00') });
    localStorage.setItem(
      'sushiriga.cart.v1',
      JSON.stringify([{ productId: 'maestro', quantity: 1 }]),
    );
    const { user } = renderApp('/checkout');
    await user.type(await screen.findByLabelText('Name'), 'Anna');
    await user.type(screen.getByLabelText('Phone'), '+371 20000000');
    await user.click(screen.getByRole('button', { name: 'Place demo order' }));
    expect(await screen.findByTestId('order-status')).toHaveTextContent('Paid');
    expect(screen.getByText(/Demo order: no money was charged/)).toBeInTheDocument();
    expect(
      screen.getByText(/Confirmed by the restaurant when it accepts the order/),
    ).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('promo codes are not simulated: without a server check the field is disabled', async () => {
    localStorage.setItem(
      'sushiriga.cart.v1',
      JSON.stringify([{ productId: 'maestro', quantity: 2 }]),
    );
    renderApp('/cart');
    expect(await screen.findByLabelText('Promo code')).toBeDisabled();
    expect(screen.getByText(/No discount is applied for now/)).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€21.00');
  });

  it('with a server that checks codes, an accepted code updates the total', async () => {
    localStorage.setItem(
      'sushiriga.cart.v1',
      JSON.stringify([{ productId: 'maestro', quantity: 2 }]),
    );
    const services = { ...createServices(readConfig({})), promo: createMockPromoService() };
    const { user } = renderApp('/cart', 'en', services);
    await user.type(await screen.findByLabelText('Promo code'), 'demo10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('Promo code DEMO10 applied')).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€18.90');
  });

  it('turns book pages with the keyboard', async () => {
    const { user } = renderApp('/menu/tempura');
    const book = await screen.findByRole('region', { name: 'Tempura — menu book' });
    expect(within(book).getByText('Page 1 of 6')).toBeInTheDocument();
    book.focus();
    await user.keyboard('{ArrowRight}');
    expect(within(book).getByText('Page 2 of 6')).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(within(book).getByText('Page 6 of 6')).toBeInTheDocument();
  });

  it('switches language and remembers it', async () => {
    const { user } = renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Русский' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Меню, которое можно листать' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('sushiriga.locale')).toBe('"ru"');
    expect(document.documentElement.lang).toBe('ru');
  });

  it('places a guest demo order without an account', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-10-05T12:00:00+03:00') });
    localStorage.setItem(
      'sushiriga.cart.v1',
      JSON.stringify([{ productId: 'maestro', quantity: 1 }]),
    );
    const { user } = renderApp('/checkout');
    await user.type(await screen.findByLabelText('Name'), 'Anna');
    await user.type(screen.getByLabelText('Phone'), '+371 20000000');
    await user.click(screen.getByRole('radio', { name: '€2.00' }));
    await user.click(screen.getByRole('button', { name: 'Place demo order' }));
    expect(await screen.findByTestId('order-status')).toHaveTextContent('Paid');
    expect(screen.getByText('€12.50')).toBeInTheDocument(); // 10.50 + 2.00 tip
    vi.useRealTimers();
  });
});
