import type { CreateOrderInput } from './orderService';
import { createMockOrderService } from './mockOrderService';

const input: CreateOrderInput = {
  customer: { type: 'guest', name: 'Anna', phone: '+371 20000000' },
  items: [{ productId: 'maestro', quantity: 2, name: 'Maestro', unitPrice: 1050, lineTotal: 2100 }],
  expectedDiscount: 210,
  tip: 200,
  locationId: 'location-1',
  pickupTime: 'asap',
  paymentId: 'demo',
};

describe('mock order service', () => {
  it('creates a PAID guest order without a preparation time', async () => {
    const orders = createMockOrderService();
    const order = await orders.createOrder(input);
    expect(order).toMatchObject({
      status: 'PAID',
      preparationTime: null,
      subtotal: 2100,
      discount: 210,
      tip: 200,
      total: 2090,
    });
    expect(await orders.getOrder(order.id)).toEqual(order);
  });

  it('staff accept the order by choosing the final preparation time', async () => {
    const orders = createMockOrderService();
    const { id } = await orders.createOrder(input);
    await expect(orders.updateStatus(id, 'ACCEPTED')).rejects.toThrow(/acceptOrder/);
    await expect(orders.acceptOrder(id, 33 as never)).rejects.toThrow(/Invalid preparation time/);
    expect(await orders.acceptOrder(id, 45)).toMatchObject({
      status: 'ACCEPTED',
      preparationTime: 45,
    });
    await expect(orders.acceptOrder(id, 30)).rejects.toThrow(/not PAID/);
  });

  it('enforces transitions and lets staff change the time later', async () => {
    const orders = createMockOrderService();
    const { id } = await orders.createOrder(input);
    await orders.acceptOrder(id, 30);
    await expect(orders.updateStatus(id, 'PICKED_UP')).rejects.toThrow(/Cannot change/);
    await orders.updateStatus(id, 'DELAYED', 'busy kitchen');
    expect(await orders.setPreparationTime(id, 50)).toMatchObject({
      status: 'DELAYED',
      preparationTime: 50,
    });
  });
});
