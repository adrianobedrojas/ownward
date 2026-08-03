/**
 * Canonical account types accepted during signup.
 * Single source of truth — import this in both the API route and
 * any server actions that handle account-type validation.
 */
export const ACCOUNT_TYPES = ["owner", "buyer", "owner-buyer", "advisor"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Returns true if the provided value is a valid account type.
 */
export function isValidAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}
