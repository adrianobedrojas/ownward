'use client';

import { useState } from 'react';
import type { BillingPlan, BillingState } from '@/lib/billing';

interface PricingCardsProps {
  /** null when user is not signed in */
  billingState: BillingState | null;
}

const PLANS: {
  key: BillingPlan;
  name: string;
  tagline: string;
  price: string;
  features: string[];
  featured: boolean;
}[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'New owners & explorers',
    price: '$5',
    features: [
      '1 Business Profile',
      'Timeline & 10 Milestones/mo',
      'Basic Health Checklist',
      'Basic Valuation Range',
      'Up to 10 Documents',
      'Up to 500 MB storage',
      'Standard Support',
    ],
    featured: false,
  },
  {
    key: 'builder',
    name: 'Builder',
    tagline: 'Active owners building operations',
    price: '$10',
    features: [
      'Up to 2 Businesses',
      'Revenue & Expense Tracking',
      'Tasks, Goals & 100 Leads',
      'Advanced Health Report',
      'Detailed Valuation Estimate',
      '100 Documents & Templates',
      'Up to 5 GB storage',
      '2 Team Members',
    ],
    featured: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'Serious owners preparing to grow or sell',
    price: '$20',
    features: [
      'Up to 5 Businesses',
      'Sale-Readiness Score',
      'Full Valuation Report (Weekly)',
      'Customer Concentration Analysis',
      'Basic Deal Room & Seller Area',
      '1,000 Leads & up to 50 GB storage',
      'Up to 5 Team Members',
    ],
    featured: false,
  },
];

export default function PricingCards({ billingState }: PricingCardsProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);

  const currentPlan = billingState?.plan ?? null;
  const isSignedIn = billingState !== null;

  const handleSubscribe = async (planKey: string) => {
    // Not signed in → redirect to login
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
          // Active sub on a different plan → send to portal
          const portalRes = await fetch('/api/billing/portal', { method: 'POST' });
          const portalData = await portalRes.json();
          if (portalData.url) {
            window.location.assign(portalData.url);
          } else {
            setStatusMessage({ type: 'error', text: portalData.error ?? 'Unable to open billing portal.' });
          }
        } else {
          setStatusMessage({ type: 'info', text: data.error ?? 'You are already on this plan.' });
        }
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
      } else {
        setStatusMessage({ type: 'error', text: data.error ?? 'Failed to initiate checkout.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
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
        window.location.href = data.url;
      } else {
        setStatusMessage({ type: 'error', text: data.error ?? 'Unable to open billing portal.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planKey: BillingPlan) => currentPlan === planKey;
  const hasActivePaidPlan =
    currentPlan !== null && currentPlan !== 'free' && billingState?.status != null &&
    (billingState.status === 'active' || billingState.status === 'trialing');

  return (
    <>
      {/* Inline status message */}
      {statusMessage && (
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
      )}

      {/* Current plan bar */}
      {isSignedIn && currentPlan && currentPlan !== 'free' && (
        <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200 flex items-center justify-between flex-wrap gap-3">
          <span>
            You are on the <strong className="capitalize">{currentPlan}</strong> plan
            {billingState?.cancelAtPeriodEnd && billingState.currentPeriodEnd
              ? ` — cancels ${new Date(billingState.currentPeriodEnd).toLocaleDateString()}`
              : billingState?.currentPeriodEnd
              ? ` — renews ${new Date(billingState.currentPeriodEnd).toLocaleDateString()}`
              : ''}.
          </span>
          <button
            onClick={handleManageSubscription}
            disabled={loadingPlan === 'manage'}
            className="rounded-lg bg-cyan-400/20 px-4 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/30 disabled:opacity-50"
          >
            {loadingPlan === 'manage' ? 'Opening…' : 'Manage Subscription'}
          </button>
        </div>
      )}

      {/* Privacy control spacing guard — ensure cards don't overlap floating element */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pb-24 md:pb-16">
        {PLANS.map((plan) => {
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
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-cyan-400 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3.5 right-6 bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Current Plan
                </div>
              )}
              <div>
                <h2 className={`text-xl font-semibold ${plan.featured ? 'text-cyan-400' : ''}`}>
                  {plan.name}
                </h2>
                <p className="text-xs text-slate-400 mt-1">{plan.tagline}</p>
                <p className="mt-4 text-3xl font-bold">
                  {plan.price}{' '}
                  <span className="text-sm font-normal text-slate-400">/ mo</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {plan.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </div>

              {isCurrent ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={loadingPlan === 'manage'}
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
                    plan.featured
                      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {loadingPlan === 'manage' ? 'Opening…' : 'Manage Plan'}
                </button>
              ) : hasActivePaidPlan ? (
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loadingPlan !== null}
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
                    plan.featured
                      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {loadingPlan === plan.key ? 'Opening portal…' : `Switch to ${plan.name}`}
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loadingPlan !== null}
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 ${
                    plan.featured
                      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {loadingPlan === plan.key
                    ? 'Processing…'
                    : !isSignedIn
                    ? `Sign in to get ${plan.name}`
                    : plan.key === 'starter'
                    ? 'Get Starter'
                    : plan.key === 'builder'
                    ? 'Start Builder Plan'
                    : 'Get Pro'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
