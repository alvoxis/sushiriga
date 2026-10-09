import { screen, within } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';

/** Phase 3 — real menu data, search and choosing a dish (single-page phone layout in jsdom). */
describe('real menu: search, dish in the book, cart', () => {
  it('search finds a dish and opens its chapter book on the page with it', async () => {
    const { user, router } = renderApp('/menu');
    await user.type(await screen.findByRole('searchbox', { name: 'Search the menu' }), 'kunsei');
    expect(screen.getByText('Found: 2')).toBeInTheDocument();
    const results = screen.getAllByTestId('search-result');
    expect(
      results.map((r) => within(r).getByRole('link', { name: /^(?!Open).*Kunsei/ }).textContent),
    ).toEqual(['29 Kunsei Maki', '34 Kunsei Philadelfia']);
    expect(router.state.location.search).toBe('?q=kunsei'); // the query lives in the URL

    await user.click(
      screen.getByRole('link', { name: 'Open Kunsei Philadelfia in the Rolls book' }),
    );
    const book = await screen.findByRole('region', { name: 'Rolls — menu book' });
    // 2 dishes per page in jsdom: Kunsei Philadelfia is dish #4 → page with dishes 3–4 = face 3.
    expect(within(book).getByText('Page 4 of 10')).toBeInTheDocument();
    const entry = within(book).getByRole('link', { name: 'Kunsei Philadelfia' }).closest('li')!;
    expect(entry).toHaveAttribute('data-highlighted', 'true');
    // …and it can be ordered right there.
    await user.click(
      within(entry).getByRole('button', { name: 'Add to cart: Kunsei Philadelfia' }),
    );
    const nav = screen.getByRole('navigation', { name: 'Quick navigation' });
    expect(within(nav).getByRole('link', { name: 'Cart, items: 1' })).toBeInTheDocument();
  });

  it('search finds chapters, also in Russian', async () => {
    const { user } = renderApp('/menu', 'ru');
    await user.type(await screen.findByRole('searchbox', { name: 'Поиск по меню' }), 'поке');
    await user.click(screen.getByRole('link', { name: 'Поке' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Поке' })).toBeInTheDocument();
  });

  it('shows a clear message when nothing is found', async () => {
    const { user } = renderApp('/menu');
    await user.type(await screen.findByRole('searchbox'), 'pizza');
    expect(screen.getByText(/Nothing found/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('a product page shows only real data and links into the book and back to the chapters', async () => {
    const { user } = renderApp('/product/hotto-set');
    expect(await screen.findByRole('heading', { level: 1, name: 'Hotto Set' })).toBeInTheDocument();
    expect(screen.getByText('€49.99')).toBeInTheDocument();
    expect(screen.getByText('48 pcs')).toBeInTheDocument();
    expect(screen.getByText('Warm')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In this set' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ingredients' })).not.toBeInTheDocument(); // none on the source
    expect(screen.getByText(/not published yet/)).toBeInTheDocument(); // no invented allergens

    await user.click(screen.getByRole('link', { name: 'Open Hotto Set in the Sushi Sets book' }));
    const book = await screen.findByRole('region', { name: 'Sushi Sets — menu book' });
    expect(within(book).getByRole('link', { name: 'Hotto Set' }).closest('li')).toHaveAttribute(
      'data-highlighted',
      'true',
    );
    await user.click(screen.getByRole('link', { name: '← All chapters' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Menu' })).toBeInTheDocument();
  });

  it('a requested dish wins over a stored list view, and choosing a view still works', async () => {
    localStorage.setItem('sushiriga.menu.view', JSON.stringify('list'));
    const { user } = renderApp('/menu/tempura?dish=unagi-crisp');
    expect(await screen.findByRole('region', { name: 'Tempura — menu book' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Book' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'List' }));
    expect(screen.getAllByTestId('product-card')).toHaveLength(5);
  });

  it('the cart keeps its items across navigation and languages, totals update', async () => {
    const { user } = renderApp('/product/poke-eel');
    await user.click(await screen.findByRole('button', { name: 'Add to cart' }));
    await user.click(screen.getByRole('button', { name: /Русский/ }));
    const nav = screen.getByRole('navigation', { name: 'Быстрая навигация' });
    await user.click(within(nav).getByRole('link', { name: 'Корзина, товаров: 1' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Корзина' })).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent(/14,00\s€/);

    await user.click(screen.getByRole('button', { name: 'Ещё Poke Eel' }));
    expect(screen.getByTestId('cart-total')).toHaveTextContent(/28,00\s€/);

    await user.click(screen.getByRole('button', { name: /Latviešu/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Grozs' })).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent(/28,00\s€/);
    await user.click(screen.getByRole('button', { name: 'Noņemt Poke Eel' }));
    expect(screen.getByText('Tavs grozs ir tukšs.')).toBeInTheDocument();
  });
});
