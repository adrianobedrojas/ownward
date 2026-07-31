'use client';

import { useState } from 'react';

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initiate checkout.');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-16 text-slate-100">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">Ownward Plans & Pricing</h1>
        <p className="mt-3 text-slate-400 text-lg">
          Simple, scalable tools to build, manage, and increase your business value. Plans start at $5/month.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Starter Plan */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold">Starter</h2>
            <p className="text-xs text-slate-400 mt-1">New owners & explorers</p>
            <p className="mt-4 text-3xl font-bold">$5 <span className="text-sm font-normal text-slate-400">/ mo</span></p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li>✓ 1 Business Profile</li>
              <li>✓ Timeline & 10 Milestones/mo</li>
              <li>✓ Basic Health Checklist</li>
              <li>✓ Basic Valuation Range</li>
              <li>✓ Up to 10 Documents</li>
              <li>✓ Up to 500 MB storage</li>
              <li>✓ Standard Support</li>
            </ul>
          </div>
          <button
            onClick={() => handleSubscribe('starter')}
            disabled={loadingPlan !== null}
            className="mt-8 w-full rounded-lg bg-slate-800 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {loadingPlan === 'starter' ? 'Processing...' : 'Get Starter'}
          </button>
        </div>

        {/* Builder Plan (Recommended) */}
        <div className="relative rounded-2xl border-2 border-cyan-400 bg-slate-900 p-8 flex flex-col justify-between shadow-lg shadow-cyan-950/40">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-cyan-400 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Most Popular
          </div>
          <div>
            <h2 className="text-xl font-semibold text-cyan-400">Builder</h2>
            <p className="text-xs text-slate-400 mt-1">Active owners building operations</p>
            <p className="mt-4 text-3xl font-bold">$10 <span className="text-sm font-normal text-slate-400">/ mo</span></p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li>✓ Up to 2 Businesses</li>
              <li>✓ Revenue & Expense Tracking</li>
              <li>✓ Tasks, Goals & 100 Leads</li>
              <li>✓ Advanced Health Report</li>
              <li>✓ Detailed Valuation Estimate</li>
              <li>✓ 100 Documents & Templates</li>
              <li>✓ Up to 5 GB storage</li>
              <li>✓ 2 Team Members</li>
            </ul>
          </div>
          <button
            onClick={() => handleSubscribe('builder')}
            disabled={loadingPlan !== null}
            className="mt-8 w-full rounded-lg bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loadingPlan === 'builder' ? 'Processing...' : 'Start Builder Plan'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="text-xs text-slate-400 mt-1">Serious owners preparing to grow or sell</p>
            <p className="mt-4 text-3xl font-bold">$20 <span className="text-sm font-normal text-slate-400">/ mo</span></p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li>✓ Up to 5 Businesses</li>
              <li>✓ Sale-Readiness Score</li>
              <li>✓ Full Valuation Report (Weekly)</li>
              <li>✓ Customer Concentration Analysis</li>
              <li>✓ Basic Deal Room & Seller Area</li>
              <li>✓ 1,000 Leads & up to 50 GB storage</li>
              <li>✓ Up to 5 Team Members</li>
            </ul>
          </div>
          <button
            onClick={() => handleSubscribe('pro')}
            disabled={loadingPlan !== null}
            className="mt-8 w-full rounded-lg bg-slate-800 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {loadingPlan === 'pro' ? 'Processing...' : 'Get Pro'}
          </button>
        </div>
      </div>
    </main>
  );
}