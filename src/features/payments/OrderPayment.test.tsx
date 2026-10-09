import { screen, waitFor } from '@testing-library/react';
import { createServices, readConfig, type Services } from '@/services';
import {
  PaymentError,
  type PaymentAvailability,
  type PaymentService,
} from '@/services/payments/paymentService';
import { renderApp } from '@/test/renderApp';
import type { Order } from '@/types';
import { loadStripeJs } from './stripe';

// Stripe.js cannot run in jsdom: the loader is replaced by a stand-in with the same calls.
vi.mock('./stripe', () => ({ loadStripeJs: vi.fn() }));

const order: Order = {
  id: 'SR-7K4Q-9M2X',
  customer: { type: 'guest', name: 'Anna', phone: '+371 20 000 000' },
  items: [{ productId: 'maestro', quantity: 2, name: 'Maestro', unitPrice: 1050, lineTotal: 2100 }],
  subtotal: 2100,
  discount: 0,
  tip: 100,
  total: 2200,
  location: 'location-1',
  pickupTime: 'asap',
  preparationTime: null,
  status: 'PENDING_PAYMENT',
  statusHistory: [{ status: 'PENDING_PAYMENT', at: '2026-10-05T09:00:00.000Z' }],
  payment: null,
  createdAt: '2026-10-05T09:00:00.000Z',
  updatedAt: '2026-10-05T09:00:00.000Z',
};
const paid: Order = {
  ...order,
  status: 'PAID',
  payment: { provider: 'stripe', reference: 'pi_1' },
  statusHistory: [...order.statusHistory, { status: 'PAID', at: '2026-10-05T09:01:00.000Z' }],
};

function fakeStripe(confirmResult: object = { paymentIntent: { status: 'succeeded' } }) {
  const element = { mount: vi.fn(), destroy: vi.fn() };
  const elements = { create: vi.fn(() => element), getElement: vi.fn(() => element) };
  const stripe = {
    elements: vi.fn(() => elements),
    confirmPayment: vi.fn(async () => confirmResult),
  };
  vi.mocked(loadStripeJs).mockResolvedValue(stripe as never);
  return { stripe, elements, element };
}

/** The real app with "live" services: a backend that has this order and Stripe configured. */
function liveServices(payments: Partial<PaymentService>, availability: PaymentAvailability) {
  const base = createServices(readConfig({}));
  const services: Services = {
    ...base,
    config: { ...base.config, demoMode: false, apiUrl: '/' },
    ordersAdmin: undefined,
    orders: { ...base.orders, getOrder: async (id) => (id === order.id ? order : undefined) },
    payments: {
      provider: 'stripe',
      availability: async () => availability,
      start: vi.fn(async () => ({ clientSecret: 'pi_1_secret_x', amount: 2200 })),
      refresh: vi.fn(async () => paid),
      ...payments,
    },
  };
  return services;
}

const stripeOn: PaymentAvailability = {
  available: true,
  provider: 'stripe',
  publishableKey: 'pk_test_x',
};

describe('paying an order online', () => {
  it('without a payment provider it says so and offers no payment', async () => {
    renderApp(
      `/order/${order.id}`,
      'en',
      liveServices({}, { available: false, reason: 'not-configured' }),
    );
    expect(await screen.findByText(/Online payment is not available yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay online' })).not.toBeInTheDocument();
    expect(screen.getByTestId('order-status')).toHaveTextContent('Awaiting payment');
  });

  it('pays the server amount in the Payment Element; PAID comes from the server', async () => {
    const { stripe, elements, element } = fakeStripe();
    const services = liveServices({}, stripeOn);
    const { user } = renderApp(`/order/${order.id}`, 'en', services);

    expect(await screen.findByText('To pay: €22.00')).toBeInTheDocument();
    expect(screen.getByText(/never reach SUSHIRIGA/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pay online' }));

    expect(services.payments.start).toHaveBeenCalledWith(order.id);
    expect(loadStripeJs).toHaveBeenCalledWith('pk_test_x', 'en');
    expect(stripe.elements).toHaveBeenCalledWith(
      expect.objectContaining({ clientSecret: 'pi_1_secret_x', locale: 'en' }),
    );
    expect(elements.create).toHaveBeenCalledWith('payment', { layout: 'tabs' });
    expect(element.mount).toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: 'Pay €22.00' }));
    expect(stripe.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect: 'if_required',
        confirmParams: { return_url: `${window.location.origin}/order/${order.id}` },
      }),
    );
    expect(services.payments.refresh).toHaveBeenCalledWith(order.id);
    await waitFor(() => expect(screen.getByTestId('order-status')).toHaveTextContent('Paid'));
    expect(screen.queryByText('To pay: €22.00')).not.toBeInTheDocument();
  });

  it('shows Stripe’s own message when a card is declined, and stays unpaid', async () => {
    fakeStripe({ error: { type: 'card_error', message: 'Your card was declined.' } });
    const services = liveServices({}, stripeOn);
    const { user } = renderApp(`/order/${order.id}`, 'en', services);
    await user.click(await screen.findByRole('button', { name: 'Pay online' }));
    await user.click(await screen.findByRole('button', { name: 'Pay €22.00' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your card was declined.');
    expect(services.payments.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pay €22.00' })).toBeEnabled();
  });

  it('a pickup time that can no longer be met blocks payment and suggests a new order', async () => {
    fakeStripe();
    const services = liveServices(
      {
        start: vi.fn(async () => {
          throw new PaymentError('pickup-unavailable', 'too late');
        }),
      },
      stripeOn,
    );
    const { user } = renderApp(`/order/${order.id}`, 'en', services);
    await user.click(await screen.findByRole('button', { name: 'Pay online' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/can no longer be met/);
    expect(screen.getByRole('link', { name: 'Place a new order' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay online' })).not.toBeInTheDocument();
  });

  it('back from the bank page: asks the server, then removes the secret from the URL', async () => {
    const services = liveServices({}, stripeOn);
    const { router } = renderApp(
      `/order/${order.id}?payment_intent=pi_1&payment_intent_client_secret=pi_1_secret_x&redirect_status=succeeded`,
      'en',
      services,
    );
    await waitFor(() => expect(screen.getByTestId('order-status')).toHaveTextContent('Paid'));
    expect(services.payments.refresh).toHaveBeenCalledWith(order.id);
    expect(router.state.location.search).toBe('');
  });
});
