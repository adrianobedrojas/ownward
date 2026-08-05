'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { BillingPlan, BillingState } from '@/lib/billing';
import { PLAN_CATALOG } from '@/lib/billing';
import { trackGoogleAnalyticsConversion } from '@/lib/google-analytics';
import {
  ALL_PLAN_KEYS,
  COMPARISON_ROW_KEYS,
  getComparisonValue,
  getPlanCardFeatures,
  type PlanRecommendationGoal,
} from '@/lib/pricing';
import PlanFinder from './PlanFinder';

interface PricingCardsProps {
  billingState: BillingState | null;
  recommendedPlan: BillingPlan | null;
  selectedGoal: PlanRecommendationGoal | null;
}

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export default function PricingCards({
  billingState,
  recommendedPlan,
  selectedGoal,
}: PricingCardsProps) {
  const locale = useLocale();
  const isSpanish = locale === 'es';
  const t = useTranslations('Pricing');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);

  const plans = ALL_PLAN_KEYS.map((key) => {
    const plan = PLAN_CATALOG.find((entry) => entry.key === key)!;
    return {
      key,
      isFree: key === 'free',
      monthlyPrice: `$${plan.monthlyPrice}`,
      featured: key === 'builder',
      name: t(`plans.${key}.name`),
      tagline: t(`plans.${key}.tagline`),
      features: getPlanCardFeatures(key),
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
        recurring:
          'Cobro mensual salvo que checkout indique otra cosa, renovación automática hasta cancelar y sin reembolso prorrateado salvo ley aplicable o aviso expreso.',
        cancel: 'Gestiona o cancela en Stripe Customer Portal. La cancelación normalmente aplica al final del período pagado.',
        legalLead: 'Al continuar aceptas los',
        terms: 'Términos',
        and: 'y la',
        privacy: 'Política de privacidad',
      }
    : {
        recurring:
          'Billed on the selected interval at checkout. Auto-renews until canceled; no prorated refunds unless required by law or expressly stated.',
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

  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);

  const formatStorage = (storageBytes: number) => {
    if (storageBytes >= GB) {
      return `${formatNumber(storageBytes / GB)} GB`;
    }

    return `${formatNumber(storageBytes / MB)} MB`;
  };

  const formatPlanFeature = (feature: ReturnType<typeof getPlanCardFeatures>[number]) => {
    switch (feature.key) {
      case 'workspaces':
        return t('featureTemplates.workspaces', { count: feature.count });
      case 'milestones':
        return t('featureTemplates.milestones', { count: formatNumber(feature.count) });
      case 'health':
        return t(`featureTemplates.health.${feature.level}`);
      case 'valuation':
        return t(`featureTemplates.valuation.${feature.level}`);
      case 'documentsStorage':
        return t('featureTemplates.documentsStorage', {
          documents: formatNumber(feature.documents),
          storage: formatStorage(feature.storageBytes),
        });
      case 'leads':
        return t('featureTemplates.leads', { count: formatNumber(feature.count) });
      case 'savedListings':
        return t('featureTemplates.savedListings', { count: formatNumber(feature.count) });
      case 'comparison':
        return t('featureTemplates.comparison', { count: formatNumber(feature.count) });
      case 'listings':
        if (feature.count === 1) {
          return feature.confidential
            ? t('featureTemplates.flexibleListingSingle', { photos: formatNumber(feature.photos) })
            : t('featureTemplates.publicListingSingle', { photos: formatNumber(feature.photos) });
        }

        return t('featureTemplates.listingsMultiple', {
          count: formatNumber(feature.count),
          photos: formatNumber(feature.photos),
        });
      case 'bookkeeping':
        return t('featureTemplates.bookkeeping');
      case 'collaborators':
        return t('featureTemplates.collaborators', { count: formatNumber(feature.count) });
      case 'support':
        return t(`featureTemplates.support.${feature.level}`);
      case 'dealRooms':
        return t('featureTemplates.dealRooms', { count: formatNumber(feature.count) });
      case 'saleReadiness':
        return t('featureTemplates.saleReadiness');
      case 'customerConcentration':
        return t('featureTemplates.customerConcentration');
      case 'sellerCommandCenter':
        return t('featureTemplates.sellerCommandCenter');
      case 'integrations':
        return t('featureTemplates.integrations');
    }
  };

  const formatComparisonValue = (plan: BillingPlan, row: (typeof COMPARISON_ROW_KEYS)[number]) => {
    const value = getComparisonValue(plan, row);

    switch (value.type) {
      case 'count':
        return value.count > 0 ? formatNumber(value.count) : t('comparison.notIncluded');
      case 'listings':
        if (value.count === 1 && value.publicOnly) {
          return t('comparison.publicOnly');
        }

        return formatNumber(value.count);
      case 'docsStorage':
        return t('comparison.docsStorageValue', {
          documents: formatNumber(value.documents),
          storage: formatStorage(value.storageBytes),
        });
      case 'valuation':
        return t(`comparison.valuation.${value.level}`);
      case 'boolean':
        return value.included ? t('comparison.included') : t('comparison.notIncluded');
      case 'dealRooms':
        return value.count > 0
          ? t('comparison.dealRoomsValue', { count: formatNumber(value.count) })
          : t('comparison.notIncluded');
      case 'support':
        return t(`comparison.support.${value.level}`);
    }
  };

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
        body: JSON.stringify({ plan: planKey, interval: 'monthly' }),
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
        trackGoogleAnalyticsConversion(
          'begin_checkout',
          {
            checkout_type: 'subscription',
            plan: planKey,
            interval: 'monthly',
          },
          { dedupeKey: `begin_checkout:subscription:${planKey}:${data.url}` },
        );
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
      <PlanFinder recommendedPlan={recommendedPlan} selectedGoal={selectedGoal} />

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

      <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-center text-sm text-slate-300">
        {isSpanish ? 'Facturación mensual activa para todos los planes de pago.' : 'Monthly billing is active for all paid plans.'}
      </div>

      {isSignedIn && currentPlan && currentPlan !== 'free' ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
          <span>
            {t('currentPlanSummary', {
              plan: t(`plans.${currentPlan}.name`),
              suffix: currentPlanSuffix,
            })}
          </span>
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

      <div className="mt-12 grid grid-cols-1 gap-6 items-stretch pb-12 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.key as BillingPlan);
          const isRecommended = recommendedPlan === plan.key;

          return (
            <div
              id={`plan-${plan.key}`}
              key={plan.key}
              className={`relative rounded-2xl p-6 flex flex-col justify-between ${
                plan.featured
                  ? 'border-2 border-cyan-400 bg-slate-900 shadow-lg shadow-cyan-950/40'
                  : isRecommended
                    ? 'border border-emerald-400 bg-slate-900/80 shadow-lg shadow-emerald-950/30'
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
              {!isCurrent && isRecommended ? (
                <div className="absolute -top-3.5 right-6 rounded-full bg-emerald-300 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-950">
                  {t('recommendedBadge')}
                </div>
              ) : null}
              <div>
                <h2 className={`text-xl font-semibold ${plan.featured ? 'text-cyan-400' : ''}`}>{plan.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{plan.tagline}</p>

                {plan.isFree ? (
                  <p className="mt-4 text-3xl font-bold">
                    $0 <span className="text-sm font-normal text-slate-400">{t('perMonth')}</span>
                  </p>
                ) : (
                  <p className="mt-4 text-3xl font-bold">
                    {plan.monthlyPrice} <span className="text-sm font-normal text-slate-400">{t('perMonth')}</span>
                  </p>
                )}

                <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                  {plan.features.map((feature, index) => (
                    <li key={`${plan.key}-${feature.key}-${index}`}>✓ {formatPlanFeature(feature)}</li>
                  ))}
                </ul>
              </div>

              {plan.isFree ? (
                isCurrent && isSignedIn ? (
                  <div className="mt-6 w-full rounded-lg py-3 text-center text-sm font-semibold bg-slate-800 text-slate-400 cursor-default select-none">
                    {t('explorerCtaCurrentPlan')}
                  </div>
                ) : (
                  <Link
                    href={isSignedIn ? '/dashboard' : '/signup'}
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

      <section className="mb-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-white">{t('includedInEveryPlan.title')}</h2>
        <p className="mt-2 text-sm text-slate-400">{t('includedInEveryPlan.description')}</p>
      </section>

      <section aria-labelledby="plan-comparison-heading" className="mt-4 mb-16 overflow-x-auto">
        <h2 id="plan-comparison-heading" className="mb-2 text-xl font-semibold text-white">
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
                    {formatComparisonValue(key, row)}
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
