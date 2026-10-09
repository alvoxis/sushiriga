import { ConfigError, readServerConfig } from './config';

const secret = 'x'.repeat(40);
const stripe = {
  STRIPE_SECRET_KEY: 'sk_test_abc',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
  STRIPE_WEBHOOK_SECRET: 'whsec_abc',
};

describe('server configuration', () => {
  it('production refuses to start without a strong order-token secret', () => {
    expect(() => readServerConfig({ NODE_ENV: 'production' })).toThrow(ConfigError);
    expect(() => readServerConfig({ NODE_ENV: 'production', ORDER_TOKEN_SECRET: 'short' })).toThrow(
      /ORDER_TOKEN_SECRET/,
    );
    expect(readServerConfig({ NODE_ENV: 'production', ORDER_TOKEN_SECRET: secret })).toMatchObject({
      production: true,
      orderTokenSecret: secret,
      stripe: null,
    });
  });

  it('Stripe: all three keys or none, of the right kind, never mixing test and live', () => {
    expect(readServerConfig({ ORDER_TOKEN_SECRET: secret, ...stripe }).stripe).toEqual({
      secretKey: 'sk_test_abc',
      publishableKey: 'pk_test_abc',
      webhookSecret: 'whsec_abc',
    });
    const bad = (env: Record<string, string>) => () =>
      readServerConfig({ ORDER_TOKEN_SECRET: secret, ...stripe, ...env });
    expect(bad({ STRIPE_WEBHOOK_SECRET: '' })).toThrow(/all of/);
    expect(bad({ STRIPE_SECRET_KEY: 'pk_test_abc' })).toThrow(/secret/);
    expect(bad({ STRIPE_PUBLISHABLE_KEY: 'sk_test_abc' })).toThrow(/publishable/);
    expect(bad({ STRIPE_WEBHOOK_SECRET: 'abc' })).toThrow(/whsec_/);
    expect(bad({ STRIPE_PUBLISHABLE_KEY: 'pk_live_abc' })).toThrow(/mix test and live/);
  });

  it('the e2e Stripe stand-in can never be used in production', () => {
    expect(() =>
      readServerConfig({
        NODE_ENV: 'production',
        ORDER_TOKEN_SECRET: secret,
        ...stripe,
        STRIPE_API_BASE: 'http://127.0.0.1:12111',
      }),
    ).toThrow(/never be set in production/);
  });

  it('the e2e test clock can never be used in production', () => {
    expect(() =>
      readServerConfig({
        NODE_ENV: 'production',
        ORDER_TOKEN_SECRET: secret,
        TEST_CLOCK_START: '2026-10-05T12:00:00+03:00',
      }),
    ).toThrow(/never be set in production/);
    expect(
      readServerConfig({ ORDER_TOKEN_SECRET: secret, TEST_CLOCK_START: '2026-10-05T09:00:00Z' })
        .testClockStart,
    ).toEqual(new Date('2026-10-05T09:00:00Z'));
  });

  it('parses ports, origins and the public directory', () => {
    expect(() => readServerConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(
      readServerConfig({
        ORDER_TOKEN_SECRET: secret,
        CORS_ORIGINS: ' https://a.lv , https://b.lv ,',
        PUBLIC_DIR: '',
      }),
    ).toMatchObject({ corsOrigins: ['https://a.lv', 'https://b.lv'], publicDir: null });
  });
});
