import { normalizeContact, phoneDigits, validateContact } from './validateContact';

const ok = { name: 'Anna', phone: '+371 20 000 000', email: '' };

describe('guest contact validation', () => {
  it('accepts a normal guest without e-mail', () => {
    expect(validateContact(ok)).toEqual({});
  });

  it('requires a name of at least 2 characters', () => {
    expect(validateContact({ ...ok, name: '  ' }).name).toBe('required');
    expect(validateContact({ ...ok, name: 'A' }).name).toBe('name');
    expect(validateContact({ ...ok, name: 'A'.repeat(81) }).name).toBe('name');
  });

  it.each(['+371 20000000', '20000000', '(+371) 20-000-000', '+44 20 7946 0958'])(
    'accepts phone %s',
    (phone) => {
      expect(validateContact({ ...ok, phone })).toEqual({});
    },
  );

  it.each(['-------', '12345', '+371 2000000000000000', 'call me', '20000000x'])(
    'rejects phone %s',
    (phone) => {
      expect(validateContact({ ...ok, phone }).phone).toBe('phone');
    },
  );

  it('requires a phone', () => {
    expect(validateContact({ ...ok, phone: ' ' }).phone).toBe('required');
  });

  it.each(['anna@example.lv', 'a.b+c@sub.example.com'])('accepts e-mail %s', (email) => {
    expect(validateContact({ ...ok, email })).toEqual({});
  });

  it.each(['anna', 'anna@', 'anna@example', 'an na@example.lv', '@example.lv'])(
    'rejects e-mail %s',
    (email) => {
      expect(validateContact({ ...ok, email }).email).toBe('email');
    },
  );

  it('normalizes the data sent with the order', () => {
    expect(normalizeContact({ name: ' Anna ', phone: ' 200 ', email: '  ' })).toEqual({
      name: 'Anna',
      phone: '200',
    });
    expect(phoneDigits('+371 (20) 00-00')).toBe('371200000');
  });
});
