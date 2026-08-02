'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { BillingPlan, BillingState } from '@/lib/billing';
import { PLAN_CATALOG } from '@/lib/billing';

interface PricingCardsProps {
  billingState: BillingState | null;
}

const PLAN_KEYS = ['starter', 'builder', 'pro'] as const;

export default function PricingCards({ billingState }: PricingCardsProps) {
  const locale = useLocale();
  const isSpanish = locale === 'es';
  const t = useTranslations('Pricing');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);

  const plans = PLAN_KEYS.map((key) => {
    const plan = PLAN_CATALOG.find((entry) => entry.key === key)!;
    return {
      key,
      price: `$${plan.monthlyPrice}`,
      featured: key === 'builder',
      name: t(`plans.${key}.name`),
      tagline: t(`plans.${key}.tagline`),
      features: t.raw(`plans.${key}.features`) as string[],
    };
  });

  const currentPlan = billingState?.plan ?? null;
  const isSignedIn = billingState !== null;
  const disclosure = isSpanish
    ? {
        recurring: 'Cobro mensual salvo que checkout indique otra cosa, renovación automática hasta cancelar y sin reembolso prorrateado salvo ley aplicable o aviso expreso.',
        cancel: 'Gestiona o cancela en Stripe Customer Portal. La cancelación normalmente aplica al final del período pagado.',
        legalLead: 'Al continuar aceptas los',
        terms: 'Términos',
        and: 'y la',
        privacy: 'Política de privacidad',
      }
    : {
        recurring: 'Billed monthly unless checkout states otherwise, auto-renews until canceled, and no prorated refunds unless required by law or expressly stated.',
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
      window.location.assign(`/login?next=${encodeURIComponent('/pricing')}`);
      return;
    }

    setLoadingPlan(planKey);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();

      if (res.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent('/pricing')}`);
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
  const hasActivePaidPlan =
    currentPlan !== null &&
    currentPlan !== 'free' &&
    billingState?.status != null &&
    (billingState.status === 'active' || billingState.status === 'trialing');

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

      <div className="mt-12 grid grid-cols-1 gap-8 items-stretch pb-24 md:grid-cols-3 md:pb-16">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.key);
          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-8 flex flex-col justify-between ${
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
                <p className="mt-4 text-3xl font-bold">
                  {plan.price} <span className="text-sm font-normal text-slate-400">{t('perMonth')}</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
              </div>

              {isCurrent ? (
                <button
                  type="button"
                  onClick={handleManageSubscription}
                  disabled={loadingPlan === 'manage'}
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
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
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
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
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
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
            </div>
          );
        })}
      </div>
    </>
  );
}
