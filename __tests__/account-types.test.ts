import { ACCOUNT_TYPES, isValidAccountType } from '@/lib/auth/account-types';

describe('account-types', () => {
  it('exports the canonical set of accepted types', () => {
    expect(ACCOUNT_TYPES).toEqual(['owner', 'buyer', 'owner-buyer', 'advisor']);
  });

  it.each(['owner', 'buyer', 'owner-buyer', 'advisor'])(
    'accepts valid type "%s"',
    (type) => {
      expect(isValidAccountType(type)).toBe(true);
    }
  );

  it.each([
    'admin',
    'superuser',
    'guest',
    '',
    'OWNER',
    'Owner',
    'owner buyer',
    'null',
    'undefined',
  ])(
    'rejects invalid type "%s"',
    (type) => {
      expect(isValidAccountType(type)).toBe(false);
    }
  );
});
