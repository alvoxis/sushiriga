import { screen, waitFor, within } from '@testing-library/react';
import { products } from '@/data/menu';
import { productName } from '@/features/menu/catalog';
import { createServices, readConfig, type Services } from '@/services';
import { AdminError, type AdminService } from '@/services/admin/adminService';
import { renderApp } from '@/test/renderApp';
import type { AdminOrder, AdminProduct, StaffUser } from '@/types';

const boss: StaffUser = { id: 'u1', email: 'boss@sushiriga.lv', name: 'Boss', role: 'admin' };
const cook: StaffUser = { id: 'u2', email: 'cook@sushiriga.lv', name: 'Cook', role: 'staff' };

function paidOrder(id: string): AdminOrder {
  return {
    id,
    customer: { type: 'guest', name: 'Anna Bērziņa', phone: '+371 20 000 000' },
    items: [
      { productId: 'maestro', quantity: 2, name: 'Maestro', unitPrice: 1050, lineTotal: 2100 },
    ],
    subtotal: 2100,
    discount: 0,
    tip: 300,
    total: 2400,
    location: 'location-1',
    pickupTime: 'asap',
    preparationTime: null,
    status: 'PAID',
    statusHistory: [
      { status: 'PENDING_PAYMENT', at: '2026-10-05T09:00:00.000Z' },
      { status: 'PAID', at: '2026-10-05T09:01:00.000Z' },
    ],
    payment: { provider: 'stripe', reference: 'pi_1' },
    paymentStatus: 'succeeded',
    createdAt: '2026-10-05T09:00:00.000Z',
    updatedAt: '2026-10-05T09:01:00.000Z',
  };
}

/** An in-memory admin backend for the UI (the real one is covered by server/admin.test.ts). */
function fakeAdmin(user: StaffUser, signedIn = false) {
  let session: StaffUser | null = signedIn ? user : null;
  let orders = [paidOrder('SR-AAAA-1111')];
  const menu: AdminProduct[] = products.slice(0, 3).map((product) => ({
    product,
    basePrice: product.price,
    availableOverride: null,
    priceOverride: null,
  }));
  const update = (id: string, change: Partial<AdminOrder>) => {
    orders = orders.map((o) => (o.id === id ? { ...o, ...change } : o));
    return orders.find((o) => o.id === id)!;
  };
  const guard = () => {
    if (!session) throw new AdminError('unauthorized', 'Please sign in');
  };
  const service: AdminService = {
    me: async () => session,
    login: vi.fn(async (email: string, password: string) => {
      if (email !== user.email || password !== 'correct horse battery') {
        throw new AdminError('invalid-credentials', 'Wrong e-mail or password');
      }
      session = user;
      return user;
    }),
    logout: async () => {
      session = null;
    },
    orders: vi.fn(async (status) => {
      guard();
      return orders.filter((o) => !status || status.includes(o.status));
    }),
    accept: vi.fn(async (id, preparationTime) => {
      guard();
      return update(id, { status: 'ACCEPTED', preparationTime });
    }),
    setStatus: vi.fn(async (id, status) => {
      guard();
      return update(id, {
        status,
        ...(status === 'CANCELLED' ? { paymentStatus: 'refunded' } : {}),
      });
    }),
    setPreparationTime: vi.fn(async (id, minutes) => update(id, { preparationTime: minutes })),
    summary: async () => ({
      date: '2026-10-05',
      paidOrders: 1,
      revenue: 2400,
      tips: 300,
      cancelled: 0,
    }),
    menu: async () => menu,
    setProduct: vi.fn(async (productId, change) => {
      const item = menu.find((m) => m.product.id === productId)!;
      return {
        ...item,
        product: { ...item.product, available: change.available ?? item.product.available },
        availableOverride: change.available ?? null,
      };
    }),
    promoCodes: async () => [],
    savePromoCode: async (promo) => ({ ...promo, usageCount: 0 }),
    reviews: async () => [],
    moderateReview: async () => {
      throw new Error('not used');
    },
    expireSession: () => {
      session = null;
    },
  } as AdminService & { expireSession: () => void };
  return service as AdminService & { expireSession: () => void };
}

function liveServices(admin: AdminService): Services {
  const base = createServices(readConfig({}));
  return { ...base, config: { ...base.config, demoMode: false, apiUrl: '/' }, admin };
}

describe('admin panel', () => {
  it('demo mode has no staff accounts and says so', async () => {
    renderApp('/admin');
    expect(await screen.findByText(/works with the backend/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('staff sign in, then accept a paid order with the chosen preparation time', async () => {
    const admin = fakeAdmin(cook);
    const { user } = renderApp('/admin', 'en', liveServices(admin));

    await user.type(await screen.findByLabelText('E-mail'), 'cook@sushiriga.lv');
    await user.type(screen.getByLabelText('Password'), 'wrong password!!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong e-mail or password.');

    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Signed in: Cook')).toBeInTheDocument();
    expect(await screen.findByTestId('admin-summary')).toHaveTextContent(
      'Today: 1 paid orders · €24.00 · tips €3.00',
    );
    // Staff (not admin) do not see promo codes or reviews.
    const nav = screen.getByRole('navigation', { name: 'Admin sections' });
    expect(within(nav).queryByRole('link', { name: 'Promo codes' })).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Menu' })).toBeInTheDocument();

    const card = (await screen.findByText('SR-AAAA-1111')).closest('article')!;
    expect(within(card).getByText(/Anna Bērziņa/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: '+371 20 000 000' })).toHaveAttribute(
      'href',
      'tel:+37120000000',
    );
    await user.selectOptions(within(card).getByLabelText('Preparation time'), '45');
    await user.click(within(card).getByRole('button', { name: 'Accept' }));
    expect(admin.accept).toHaveBeenCalledWith('SR-AAAA-1111', 45);
    // It leaves "New (paid)" and appears in "In progress".
    await waitFor(() => expect(screen.queryByText('SR-AAAA-1111')).not.toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: 'In progress' }));
    const accepted = (await screen.findByText('SR-AAAA-1111')).closest('article')!;
    expect(within(accepted).getByText('Accepted')).toBeInTheDocument();
    expect(
      within(accepted).getByRole('button', { name: 'Mark as “Preparing”' }),
    ).toBeInTheDocument();
  });

  it('cancelling a paid order warns about the refund first', async () => {
    const admin = fakeAdmin(boss, true);
    const { user } = renderApp('/admin', 'en', liveServices(admin));
    const card = (await screen.findByText('SR-AAAA-1111')).closest('article')!;
    await user.click(within(card).getByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancel order SR-AAAA-1111?' });
    expect(dialog).toHaveTextContent(
      'The payment of €24.00 will be refunded in full through Stripe.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Cancel the order' }));
    expect(admin.setStatus).toHaveBeenCalledWith('SR-AAAA-1111', 'CANCELLED', undefined);
  });

  it('administrators see every section; staff mark dishes sold out', async () => {
    const admin = fakeAdmin(boss, true);
    const { user } = renderApp('/admin/menu', 'en', liveServices(admin));
    const nav = await screen.findByRole('navigation', { name: 'Admin sections' });
    expect(within(nav).getByRole('link', { name: 'Promo codes' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Reviews' })).toBeInTheDocument();
    const first = products[0]!;
    const toggle = await screen.findByRole('checkbox', {
      name: `${productName(first, 'en')} — Available`,
    });
    await user.click(toggle);
    expect(admin.setProduct).toHaveBeenCalledWith(first.id, { available: false });
  });

  it('an expired session returns to the sign-in form with an explanation', async () => {
    const admin = fakeAdmin(cook, true);
    const { user } = renderApp('/admin', 'en', liveServices(admin));
    await screen.findByText('SR-AAAA-1111');
    admin.expireSession();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(
      await screen.findByText('Your session has ended. Please sign in again.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
