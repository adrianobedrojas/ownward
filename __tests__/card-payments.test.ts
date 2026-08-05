/**
 * Card-payment clarification tests
 *
 * Verifies that:
 * - Subscription checkout enables the `card` payment method.
 * - Featured Listing checkout enables the `card` payment method.
 * - The English payment wording exists.
 * - The Spanish payment wording exists.
 * - The Pricing page uses the new translation keys.
 */

import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Card payment method configuration', () => {
  it('subscription checkout route enables the card payment method', () => {
    const route = read('app/api/checkout/route.ts');
    expect(route).toContain('payment_method_types: ["card"]');
  });

  it('Featured Listing checkout route enables the card payment method', () => {
    const route = read('app/api/featured-listings/checkout/route.ts');
    expect(route).toContain('payment_method_types: ["card"]');
  });
});

describe('Card payment wording in messages', () => {
  it('has English title and description for card payment notice', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const en = require('../messages/en.json') as Record<string, Record<string, Record<string, string>>>;
    const cardPayment = en['Pricing']?.['cardPayment'];
    expect(cardPayment).toBeDefined();
    expect(cardPayment['title']).toBe('Pay with a credit or debit card');
    expect(cardPayment['description']).toContain('No Stripe account is required');
    expect(cardPayment['description']).toContain('Stripe will process the payment for Ownward');
  });

  it('has Spanish title and description for card payment notice', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const es = require('../messages/es.json') as Record<string, Record<string, Record<string, string>>>;
    const cardPayment = es['Pricing']?.['cardPayment'];
    expect(cardPayment).toBeDefined();
    expect(cardPayment['title']).toBe('Paga con tarjeta de crédito o débito');
    expect(cardPayment['description']).toContain('No necesitas una cuenta de Stripe');
    expect(cardPayment['description']).toContain('Stripe procesará el pago para Ownward');
  });
});

describe('Pricing page uses cardPayment translation keys', () => {
  it('renders cardPayment.title and cardPayment.description from translations', () => {
    const pricingPage = read('app/[locale]/pricing/page.tsx');
    expect(pricingPage).toContain("t('cardPayment.title')");
    expect(pricingPage).toContain("t('cardPayment.description')");
  });
});

describe('FeaturedListingButton card payment clarification', () => {
  it('mentions card payment and no Stripe account requirement in English', () => {
    const button = read('components/FeaturedListingButton.tsx');
    expect(button).toContain('credit or debit card');
    expect(button).toContain('no Stripe account required');
  });

  it('mentions card payment and no Stripe account requirement in Spanish', () => {
    const button = read('components/FeaturedListingButton.tsx');
    expect(button).toContain('tarjeta de crédito o débito');
    expect(button).toContain('no necesitas cuenta de Stripe');
  });

  it('preserves the one-time purchase disclosure in English', () => {
    const button = read('components/FeaturedListingButton.tsx');
    expect(button).toContain('One-time promotional purchase unless checkout states otherwise');
  });

  it('preserves the no-guarantee disclaimer in English', () => {
    const button = read('components/FeaturedListingButton.tsx');
    expect(button).toContain('not guaranteed');
  });
});

describe('Annual billing copy still exists for historical context', () => {
  it('has English annual wording in translations', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const en = require('../messages/en.json') as Record<string, Record<string, unknown>>;
    const pricing = en['Pricing'] as Record<string, unknown>;
    const toggle = pricing['billingToggle'] as Record<string, string>;
    expect(toggle).toBeDefined();
    expect(toggle['monthly']).toBe('Monthly');
    expect(toggle['annual']).toBe('Annual');
    expect(toggle['savingsBadge']).toContain('17%');
    expect(toggle['savingsBadge']).toContain('2 months');
    expect(pricing['perYear']).toBeTruthy();
    expect(pricing['annualBilledOnce']).toContain('year');
    expect(pricing['annualEquivalentSuffix']).toContain('mo');
  });

  it('has Spanish annual wording in translations', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const es = require('../messages/es.json') as Record<string, Record<string, unknown>>;
    const pricing = es['Pricing'] as Record<string, unknown>;
    const toggle = pricing['billingToggle'] as Record<string, string>;
    expect(toggle).toBeDefined();
    expect(toggle['monthly']).toBeTruthy();
    expect(toggle['annual']).toBeTruthy();
    expect(toggle['savingsBadge']).toContain('17%');
    expect(pricing['perYear']).toBeTruthy();
    expect(pricing['annualBilledOnce']).toBeTruthy();
    expect(pricing['annualEquivalentSuffix']).toBeTruthy();
  });
});

describe('PricingCards sends billing interval to checkout', () => {
<<<<<<< HEAD
  it('passes selected billing interval in JSON body', () => {
    const pricingCards = read('app/[locale]/pricing/PricingCards.tsx');
    expect(pricingCards).toContain('interval: billingInterval');
=======
  it('passes monthly interval in JSON body', () => {
    const pricingCards = read('app/[locale]/pricing/PricingCards.tsx');
    expect(pricingCards).toContain("interval: 'monthly'");
>>>>>>> origin/main
    expect(pricingCards).toContain("'monthly'");
    expect(pricingCards).not.toContain("interval: 'annual'");
  });

<<<<<<< HEAD
  it('keeps billing interval toggle state', () => {
    const pricingCards = read('app/[locale]/pricing/PricingCards.tsx');
    expect(pricingCards).toContain('billingInterval');
  });

  it('renders billing interval aria controls', () => {
=======
  it('does not keep billing interval toggle state', () => {
    const pricingCards = read('app/[locale]/pricing/PricingCards.tsx');
    expect(pricingCards).not.toContain('billingInterval');
  });

  it('does not render annual toggle aria controls', () => {
>>>>>>> origin/main
    const pricingCards = read('app/[locale]/pricing/PricingCards.tsx');
    expect(pricingCards).not.toContain('aria-pressed');
  });
});
