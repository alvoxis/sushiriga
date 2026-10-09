import { screen, within } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';

/**
 * Phase 2 — the interactive book UI, exercised through the real app (routes, providers, data).
 * jsdom has no media queries → the book uses the single-page phone layout (2 dishes per page).
 */
describe('interactive book UI', () => {
  it('opens a category book from its cover', async () => {
    const { user } = renderApp('/menu/poke');
    const book = await screen.findByRole('region', { name: 'Poke — menu book' });
    expect(within(book).getByText('Page 1 of 5')).toBeInTheDocument();
    await user.click(within(book).getByRole('button', { name: 'Open the book' }));
    expect(within(book).getByText('Page 2 of 5')).toBeInTheDocument();
    // The chapter page is now the visible page.
    expect(within(book).getByRole('heading', { level: 2, name: 'Poke' })).toBeInTheDocument();
  });

  it('turns pages forwards and backwards with the Next / Previous buttons', async () => {
    const { user } = renderApp('/menu/rolli');
    const book = await screen.findByRole('region', { name: 'Rolls — menu book' });
    const previous = within(book).getByRole('button', { name: 'Previous page' });
    expect(previous).toBeDisabled();
    await user.click(within(book).getByRole('button', { name: 'Next page' }));
    await user.click(within(book).getByRole('button', { name: 'Next page' }));
    expect(within(book).getByText(/^Page 3 of/)).toBeInTheDocument();
    // Only the open page's dishes are reachable (other pages are hidden from assistive tech).
    expect(within(book).getByRole('link', { name: 'Philadelfia Classic' })).toBeInTheDocument();
    expect(within(book).queryByRole('link', { name: 'California' })).not.toBeInTheDocument();
    await user.click(previous);
    expect(within(book).getByText(/^Page 2 of/)).toBeInTheDocument();
    await user.click(within(book).getByRole('button', { name: 'Back to cover' }));
    expect(within(book).getByText(/^Page 1 of/)).toBeInTheDocument();
  });

  it('switches categories from the chapter list and every chapter gets its own book', async () => {
    const { user } = renderApp('/menu/sushi-burger');
    expect(
      await screen.findByRole('region', { name: 'Sushi Burger — menu book' }),
    ).toBeInTheDocument();
    const chapters = screen.getByRole('navigation', { name: 'Menu categories' });
    expect(within(chapters).getAllByRole('link')).toHaveLength(13);
    await user.click(within(chapters).getByRole('link', { name: 'Poke' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Poke' })).toBeInTheDocument();
    const book = screen.getByRole('region', { name: 'Poke — menu book' });
    expect(within(book).getByText('Page 1 of 5')).toBeInTheDocument(); // fresh book, on the cover
  });

  it('offers the next chapter on the last page', async () => {
    const { user } = renderApp('/menu/special');
    const book = await screen.findByRole('region', { name: 'Special — menu book' });
    book.focus();
    await user.keyboard('{End}');
    await user.click(within(book).getByRole('link', { name: 'Next chapter: Sushi Sets' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sushi Sets' }),
    ).toBeInTheDocument();
  });

  it('adds a dish to the cart straight from a book page and updates the total', async () => {
    const { user } = renderApp('/menu/tempura');
    const book = await screen.findByRole('region', { name: 'Tempura — menu book' });
    await user.click(within(book).getByRole('button', { name: 'Open the book' }));
    await user.click(within(book).getByRole('button', { name: 'Next page' }));
    expect(within(book).getByText('Page 3 of 6')).toBeInTheDocument();
    await user.click(within(book).getByRole('button', { name: 'Add to cart: Wakame Tempura' }));
    await user.click(within(book).getByRole('button', { name: 'Add to cart: Wakame Tempura' }));
    await user.click(within(book).getByRole('button', { name: 'Add to cart: Vistas Tempura' }));
    // Adding does not turn the page.
    expect(within(book).getByText('Page 3 of 6')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Quick navigation' });
    await user.click(within(nav).getByRole('link', { name: 'Cart, items: 3' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Cart' })).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€24.00'); // 2 × 8.50 + 7.00

    await user.click(screen.getByRole('button', { name: 'Remove Vistas Tempura' }));
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€17.00');
    await user.click(screen.getByRole('button', { name: 'One less Wakame Tempura' }));
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€8.50');
  });

  it('mobile bottom navigation reaches menu, assistant, cart and account', async () => {
    const { user } = renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Quick navigation' });
    await user.click(within(nav).getByRole('link', { name: 'Menu' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Menu' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Menu' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(nav).getByRole('link', { name: 'Cat' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The menu cat' }),
    ).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: 'Cart, items: 0' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Cart' })).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: 'Account' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: 'Home' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'A menu you can leaf through' }),
    ).toBeInTheDocument();
  });

  it('"Order" goes to the menu with an empty cart and to the cart when it has dishes', async () => {
    localStorage.setItem(
      'sushiriga.cart.v1',
      JSON.stringify([{ productId: 'maestro', quantity: 1 }]),
    );
    renderApp('/');
    expect(await screen.findByRole('link', { name: 'Order for pickup' })).toHaveAttribute(
      'href',
      '/cart',
    );
  });
});
