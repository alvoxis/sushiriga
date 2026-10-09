import { createServices } from './createServices';
import { readConfig } from './config';
import { createDemoPaymentService } from './mock/demoPaymentService';

describe('service composition', () => {
  it('demo mode = no VITE_API_URL; mocks are wired and payments are marked demo', async () => {
    const services = createServices(readConfig({}));
    expect(services.config.demoMode).toBe(true);
    expect(services.payments.provider).toBe('demo');
    expect(services.ordersAdmin).toBeDefined();
    // Demo mode never takes or simulates a payment.
    expect(await services.payments.availability()).toEqual({ available: false, reason: 'demo' });
  });

  it('with a backend URL the real API is used and there is NO silent fallback to demo payments', async () => {
    const services = createServices(readConfig({ VITE_API_URL: 'https://api.example.test' }));
    expect(services.config.demoMode).toBe(false);
    expect(services.ordersAdmin).toBeUndefined();
    expect(services.promo.mode).toBe('server');
    expect(services.payments.provider).toBe('stripe');
    // Orders this browser did not place are never fetched (no access token).
    expect(await services.orders.getOrder('SR-AAAA-BBBB')).toBeUndefined();
  });

  it('the demo payment provider refuses to exist outside demo mode', () => {
    expect(() =>
      createDemoPaymentService(readConfig({ VITE_API_URL: 'https://api.example.test' })),
    ).toThrow();
  });

  it('never reads secret-looking variables', () => {
    const config = readConfig({
      VITE_STRIPE_PUBLIC_KEY: 'pk_test_123',
      STRIPE_SECRET_KEY: 'sk_test_x',
    });
    expect(JSON.stringify(config)).not.toContain('sk_test');
  });
});
