import { products } from '@/data/menu';
import { locations } from '@/data/locations';
import type { CheckoutRequest } from '@/types';
import type { PaymentResult } from '../payments/paymentService';
import { createMockOrderService } from './mockOrderService';

const request: CheckoutRequest = {
  customer: { type: 'guest', name: 'Anna', phone: '+371 20000000' },
  items: [{ productId: 'maestro', quantity: 2 }],
  tip: 200,
  locationId: 'location-1',
  pickupTime: 'asap',
};

const demoPayment = (quoteId: string, amount: number): PaymentResult => ({
  paymentId: 'demo-pay-1',
  status: 'succeeded',
  provider: 'demo',
  quoteId,
  amount,
});

const service = () => createMockOrderService({ products, locations });

describe('mock order backend — server-side pricing', () => {
  it('prices the cart from the catalog, ignoring anything the client might add', async () => {
    const tampered = {
      ...request,
      items: [{ productId: 'maestro', quantity: 2, unitPrice: 1, lineTotal: 2 }],
      total: 1,
    } as unknown as CheckoutRequest;
    const quote = await service().quote(tampered);
    expect(quote).toMatchObject({ subtotal: 2100, discount: 0, tip: 200, total: 2300 });
    expect(quote.items[0]).toMatchObject({ unitPrice: 1050, lineTotal: 2100, name: 'Maestro' });
  });

  it('re-validates the promo code itself', async () => {
    const ok = await service().quote({ ...request, promoCode: 'demo10' });
    expect(ok).toMatchObject({ discount: 210, total: 2090, promoCode: 'DEMO10' });
    const expired = await service().quote({ ...request, promoCode: 'DEMOEXPIRED' });
    expect(expired).toMatchObject({ discount: 0, promoRejected: 'expired' });
  });

  it.each([
    ['empty cart', { items: [] }],
    ['bad quantity', { items: [{ productId: 'maestro', quantity: 0 }] }],
    ['unknown product', { items: [{ productId: 'nope', quantity: 1 }] }],
    ['negative tip', { tip: -100 }],
    ['fractional tip', { tip: 10.5 }],
    ['unknown location', { locationId: 'location-2' }],
    ['bad pickup time', { pickupTime: 'tomorrow-ish' }],
  ])('rejects: %s', async (_name, change) => {
    await expect(service().quote({ ...request, ...change } as CheckoutRequest)).rejects.toThrow();
  });
});

describe('mock order backend — placing an order without payment', () => {
  it('placeOrder creates an UNPAID order (PENDING_PAYMENT, no payment) exactly once per quote', async () => {
    const orders = service();
    const quote = await orders.quote(request);
    const order = await orders.placeOrder(quote.quoteId);
    expect(order).toMatchObject({
      status: 'PENDING_PAYMENT',
      payment: null,
      total: 2300,
      preparationTime: null,
    });
    expect(await orders.placeOrder(quote.quoteId)).toEqual(order);
    await expect(orders.placeOrder('quote-unknown')).rejects.toThrow(/not found/);
  });

  it('only a confirmed payment of the exact amount moves it to PAID — staff cannot skip payment', async () => {
    const orders = service();
    const quote = await orders.quote(request);
    const { id } = await orders.placeOrder(quote.quoteId);
    await expect(orders.updateStatus(id, 'PAID')).rejects.toThrow(/only a confirmed payment/);
    await expect(orders.acceptOrder(id, 30)).rejects.toThrow(/not PAID/);
    await expect(
      orders.awaitPaidOrder(quote.quoteId, demoPayment(quote.quoteId, 100)),
    ).rejects.toThrow(/does not match/);
    const paid = await orders.awaitPaidOrder(
      quote.quoteId,
      demoPayment(quote.quoteId, quote.total),
    );
    expect(paid).toMatchObject({ id, status: 'PAID', payment: { provider: 'demo' } });
    expect(paid.statusHistory.map((s) => s.status)).toEqual(['PENDING_PAYMENT', 'PAID']);
  });
});

describe('mock order backend — payment and order lifecycle', () => {
  it('creates a PAID demo order only for a payment of exactly the quoted amount', async () => {
    const orders = service();
    const quote = await orders.quote(request);
    await expect(
      orders.awaitPaidOrder(quote.quoteId, demoPayment(quote.quoteId, 1)),
    ).rejects.toThrow(/does not match/);
    await expect(
      orders.awaitPaidOrder(quote.quoteId, {
        ...demoPayment(quote.quoteId, quote.total),
        status: 'failed',
      }),
    ).rejects.toThrow(/does not match/);

    const order = await orders.awaitPaidOrder(
      quote.quoteId,
      demoPayment(quote.quoteId, quote.total),
    );
    expect(order).toMatchObject({
      status: 'PAID',
      preparationTime: null,
      total: 2300,
      payment: { provider: 'demo', reference: 'demo-pay-1' },
    });
    // idempotent: the same quote never creates a second order
    expect(
      await orders.awaitPaidOrder(quote.quoteId, demoPayment(quote.quoteId, quote.total)),
    ).toEqual(order);
    expect(await orders.getOrder(order.id)).toEqual(order);
  });

  it('rejects unknown quotes', async () => {
    await expect(service().awaitPaidOrder('quote-x', demoPayment('quote-x', 0))).rejects.toThrow(
      /not found/,
    );
  });

  it('staff accept the order by choosing the final preparation time', async () => {
    const orders = service();
    const quote = await orders.quote(request);
    const { id } = await orders.awaitPaidOrder(
      quote.quoteId,
      demoPayment(quote.quoteId, quote.total),
    );
    await expect(orders.updateStatus(id, 'ACCEPTED')).rejects.toThrow(/acceptOrder/);
    await expect(orders.acceptOrder(id, 33 as never)).rejects.toThrow(/Invalid preparation time/);
    expect(await orders.acceptOrder(id, 45)).toMatchObject({
      status: 'ACCEPTED',
      preparationTime: 45,
    });
    await expect(orders.acceptOrder(id, 30)).rejects.toThrow(/not PAID/);
    await expect(orders.updateStatus(id, 'PICKED_UP')).rejects.toThrow(/Cannot change/);
    await orders.updateStatus(id, 'DELAYED', 'busy kitchen');
    expect(await orders.setPreparationTime(id, 50)).toMatchObject({
      status: 'DELAYED',
      preparationTime: 50,
    });
  });
});
