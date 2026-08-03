'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { BillingPlan, BillingState } from '@/lib/billing';
import { PLAN_CATALOG } from '@/lib/billing';

interface PricingCardsProps {
  billingState: BillingState | null;
}

/** All four plan keys including Explorer. */
const ALL_PLAN_KEYS = ['free', 'starter', 'builder', 'pro'] as const;

// Annual equivalent monthly rates (annualPrice / 12, rounded to 2 decimal places)
const ANNUAL_EQUIVALENT_MONTHLY: Record<string, string> = {
  starter: '4.17',
  builder: '8.33',
  pro: '16.67',
};

// Comparison table row order
const COMPARISON_ROW_KEYS = [
  'workspaces',
  'listings',
  'milestones',
  'leads',
  'docsStorage',
  'valuationLevel',
  'bookkeeping',
  'collaborators',
  'confidentialListings',
  'dealRooms',
  'support',
] as const;

export default function PricingCards({ billingState }: PricingCardsProps) {
  const locale = useLocale();
  const isSpanish = locale === 'es';
  const t = useTranslations('Pricing');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  const isAnnual = billingInterval === 'annual';

  const plans = ALL_PLAN_KEYS.map((key) => {
    const plan = PLAN_CATALOG.find((entry) => entry.key === key)!;
    return {
      key,
      isFree: key === 'free',
      monthlyPrice: `$${plan.monthlyPrice}`,
      annualPrice: `$${plan.annualPrice}`,
      annualEquivalentMonthly: ANNUAL_EQUIVALENT_MONTHLY[key] ?? null,
      featured: key === 'builder',
      name: t(`plans.${key}.name`),
      tagline: t(`plans.${key}.tagline`),
      features: t.raw(`plans.${key}.features`) as string[],
    };
  });

  const currentPlan = billingState?.plan ?? null;
  const isSignedIn = billingState !== null;
  const hasActivePaidPlan =
    currentPlan !== null &&
    currentPlan !== 'free' &&
    billingState?.status != null &&
    (billingState.status === 'active' || billingState.status === 'trialing');

  const disclosure = isSpanish
    ? {
        recurring: isAnnual
          ? 'Cobro anual salvo que checkout indique otra cosa, renovación automática hasta cancelar y sin reembolso prorrateado salvo ley aplicable o aviso expreso.'
          : 'Cobro mensual salvo que checkout indique otra cosa, renovación automática hasta cancelar y sin reembolso prorrateado salvo ley aplicable o aviso expreso.',
        cancel: 'Gestiona o cancela en Stripe Customer Portal. La cancelación normalmente aplica al final del período pagado.',
        legalLead: 'Al continuar aceptas los',
        terms: 'Términos',
        and: 'y la',
        privacy: 'Política de privacidad',
      }
    : {
        recurring: isAnnual
          ? 'Billed annually unless checkout states otherwise, auto-renews until canceled, and no prorated refunds unless required by law or expressly stated.'
          : 'Billed monthly unless checkout states otherwise, auto-renews until canceled, and no prorated refunds unless required by law or expressly stated.',
        cancel: 'Manage or cancel in Stripe Customer Portal. Cancellation normally takes effect at period end.',
        legalLead: 'By continuing you agree to the',
        terms: 'Terms',
        and: 'and the',
        privacy: 'Privacy Policy',
      };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));

  const handleSubscribe = async (planKey: string) => {
    if (!isSignedIn) {
      window.location.assign(`/${locale}/login?next=${encodeURIComponent(`/${locale}/pricing`)}`);
      return;
    }

    setLoadingPlan(planKey);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, interval: billingInterval }),
      });
      const data = await res.json();

      if (res.status === 401) {
        window.location.assign(`/${locale}/login?next=${encodeURIComponent(`/${locale}/pricing`)}`);
        return;
      }

      if (res.status === 409) {
        if (data.portalRedirect) {
          const portalRes = await fetch('/api/billing/portal', { method: 'POST' });
          const portalData = await portalRes.json();
          if (portalData.url) {
            window.location.assign(portalData.url);
          } else {
            setStatusMessage({ type: 'error', text: portalData.error ?? t('errors.billingPortal') });
          }
        } else {
          setStatusMessage({ type: 'info', text: data.error ?? t('errors.samePlan') });
        }
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
      } else {
        setStatusMessage({ type: 'error', text: data.error ?? t('errors.checkout') });
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: 'error', text: t('errors.unexpected') });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPlan('manage');
    setStatusMessage(null);

    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
      } else {
        setStatusMessage({ type: 'error', text: data.error ?? t('errors.billingPortal') });
      }
    } catch {
      setStatusMessage({ type: 'error', text: t('errors.unexpected') });
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planKey: BillingPlan) => currentPlan === planKey;

  let currentPlanSuffix = '';
  if (billingState?.cancelAtPeriodEnd && billingState.currentPeriodEnd) {
    currentPlanSuffix = t('cancelsOn', { date: formatDate(billingState.currentPeriodEnd) });
  } else if (billingState?.currentPeriodEnd) {
    currentPlanSuffix = t('renewsOn', { date: formatDate(billingState.currentPeriodEnd) });
  }

  return (
    <>
      {statusMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className={`mt-6 mb-2 rounded-xl border px-4 py-3 text-sm ${
            statusMessage.type === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
          }`}
        >
          {statusMessage.text}
        </div>
      ) : null}

      {/* Billing interval toggle — shown for paid plans only */}
      <div className="mt-8 flex items-center justify-center gap-3" role="group" aria-label={t('billingToggle.label')}>
        <button
          type="button"
          aria-pressed={billingInterval === 'monthly'}
          onClick={() => setBillingInterval('monthly')}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
            billingInterval === 'monthly'
              ? 'bg-cyan-400 text-slate-950'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {t('billingToggle.monthly')}
        </button>
        <button
          type="button"
          aria-pressed={billingInterval === 'annual'}
          onClick={() => setBillingInterval('annual')}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
            billingInterval === 'annual'
              ? 'bg-cyan-400 text-slate-950'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {t('billingToggle.annual')}
        </button>
        {isAnnual ? (
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
            {t('billingToggle.savingsBadge')}
          </span>
        ) : null}
      </div>

      {isSignedIn && currentPlan && currentPlan !== 'free' ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
          <span>{t('currentPlanSummary', { plan: currentPlan, suffix: currentPlanSuffix })}</span>
          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={loadingPlan === 'manage'}
            className="rounded-lg bg-cyan-400/20 px-4 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/30 disabled:opacity-50"
          >
            {loadingPlan === 'manage' ? t('opening') : t('manageSubscription')}
          </button>
        </div>
      ) : null}

      {/* Plan cards: 1 col → 2 col (md) → 4 col (xl) */}
      <div className="mt-12 grid grid-cols-1 gap-6 items-stretch pb-24 md:grid-cols-2 xl:grid-cols-4 md:pb-16">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.key as BillingPlan);
          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-6 flex flex-col justify-between ${
                plan.featured
                  ? 'border-2 border-cyan-400 bg-slate-900 shadow-lg shadow-cyan-950/40'
                  : 'border border-slate-800 bg-slate-900/60'
              }`}
            >
              {plan.featured ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-950">
                  {t('mostPopular')}
                </div>
              ) : null}
              {isCurrent ? (
                <div className="absolute -top-3.5 right-6 rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-950">
                  {t('currentPlanBadge')}
                </div>
              ) : null}
              <div>
                <h2 className={`text-xl font-semibold ${plan.featured ? 'text-cyan-400' : ''}`}>{plan.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{plan.tagline}</p>

                {/* Price display */}
                {plan.isFree ? (
                  <p className="mt-4 text-3xl font-bold">
                    $0{' '}
                    <span className="text-sm font-normal text-slate-400">{t('perMonth')}</span>
                  </p>
                ) : isAnnual && plan.annualEquivalentMonthly ? (
                  <>
                    <p className="mt-4 text-3xl font-bold">
                      {plan.annualPrice}{' '}
                      <span className="text-sm font-normal text-slate-400">{t('perYear')}</span>
                    </p>
                    <p className="mt-1 text-sm text-emerald-300">
                      ${plan.annualEquivalentMonthly}{t('annualEquivalentSuffix')}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{t('annualBilledOnce')}</p>
                  </>
                ) : (
                  <p className="mt-4 text-3xl font-bold">
                    {plan.monthlyPrice}{' '}
                    <span className="text-sm font-normal text-slate-400">{t('perMonth')}</span>
                  </p>
                )}

                <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
              </div>

              {/* CTA button */}
              {plan.isFree ? (
                /* Explorer CTA — never triggers Stripe checkout */
                isCurrent && isSignedIn ? (
                  <div className="mt-6 w-full rounded-lg py-3 text-center text-sm font-semibold bg-slate-800 text-slate-400 cursor-default select-none">
                    {t('explorerCtaCurrentPlan')}
                  </div>
                ) : (
                  <Link
                    href={isSignedIn ? `/${locale}/dashboard` : `/${locale}/signup`}
                    className="mt-6 block w-full rounded-lg py-3 text-center text-sm font-semibold bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    {t('explorerCtaSignedOut')}
                  </Link>
                )
              ) : isCurrent ? (
                <button
                  type="button"
                  onClick={handleManageSubscription}
                  disabled={loadingPlan === 'manage'}
                  className={`mt-6 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
                    plan.featured
                      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {loadingPlan === 'manage' ? t('opening') : t('managePlan')}
                </button>
              ) : hasActivePaidPlan ? (
                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loadingPlan !== null}
                  className={`mt-6 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
                    plan.featured
                      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {loadingPlan === plan.key ? t('openingPortal') : t('switchTo', { plan: plan.name })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loadingPlan !== null}
                  className={`mt-6 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
                    plan.featured
                      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {loadingPlan === plan.key
                    ? t('processing')
                    : !isSignedIn
                      ? t('signInToGet', { plan: plan.name })
                      : t(`buttons.${plan.key}`)}
                </button>
              )}

              {/* Billing disclosure — only for paid plans */}
              {!plan.isFree ? (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs leading-5 text-slate-400">
                  <p>{disclosure.recurring}</p>
                  <p className="mt-1">{disclosure.cancel}</p>
                  <p className="mt-2">
                    {disclosure.legalLead}{' '}
                    <Link href="/terms" className="font-semibold text-cyan-300 hover:text-cyan-200">
                      {disclosure.terms}
                    </Link>{' '}
                    {disclosure.and}{' '}
                    <Link href="/privacy" className="font-semibold text-cyan-300 hover:text-cyan-200">
                      {disclosure.privacy}
                    </Link>
                    .
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Compact comparison section */}
      <section aria-labelledby="plan-comparison-heading" className="mt-4 mb-16 overflow-x-auto">
        <h2
          id="plan-comparison-heading"
          className="mb-2 text-xl font-semibold text-white"
        >
          {t('comparison.title')}
        </h2>
        <p className="mb-6 text-sm text-slate-400">{t('comparison.subtitle')}</p>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="py-2 pr-4 text-left text-slate-400 font-normal w-36" scope="col"></th>
              {ALL_PLAN_KEYS.map((key) => (
                <th key={key} className="py-2 px-3 text-center font-semibold text-white" scope="col">
                  {t(`plans.${key}.name`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROW_KEYS.map((row, i) => (
              <tr key={row} className={i % 2 === 0 ? 'bg-slate-900/40' : ''}>
                <td className="py-2 pr-4 text-slate-400 font-medium">{t(`comparison.rowLabels.${row}`)}</td>
                {ALL_PLAN_KEYS.map((key) => (
                  <td key={key} className="py-2 px-3 text-center text-slate-300">
                    {t(`comparison.values.${key}.${row}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
