'use client';

import { useState, useTransition } from 'react';

interface BuyerProfile {
  primary_goal?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_locations?: string[] | null;
  remote_business_ok?: boolean | null;
  desired_involvement?: string | null;
  purchase_timeline?: string | null;
  share_with_sellers?: boolean | null;
}

interface Props {
  initialData: BuyerProfile | null;
}

export default function BuyerPreferencesClient({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    primary_goal: initialData?.primary_goal ?? '',
    budget_min: initialData?.budget_min?.toString() ?? '',
    budget_max: initialData?.budget_max?.toString() ?? '',
    preferred_locations: initialData?.preferred_locations?.join(', ') ?? '',
    remote_business_ok: initialData?.remote_business_ok ?? false,
    desired_involvement: initialData?.desired_involvement ?? '',
    purchase_timeline: initialData?.purchase_timeline ?? '',
    share_with_sellers: initialData?.share_with_sellers ?? false,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const payload = {
        primary_goal: form.primary_goal || null,
        budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        preferred_locations: form.preferred_locations
          ? form.preferred_locations.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        remote_business_ok: form.remote_business_ok,
        desired_involvement: form.desired_involvement || null,
        purchase_timeline: form.purchase_timeline || null,
        share_with_sellers: form.share_with_sellers,
      };
      const res = await fetch('/api/profile/buyer-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="primary_goal" className="block text-sm font-medium text-slate-300">Primary goal</label>
        <select id="primary_goal" name="primary_goal" value={form.primary_goal} onChange={handleChange}
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
          <option value="">—</option>
          <option value="owner_operator">Owner operator</option>
          <option value="passive_investment">Passive investment</option>
          <option value="strategic_add_on">Strategic add-on</option>
          <option value="researching">Just researching</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="budget_min" className="block text-sm font-medium text-slate-300">Budget min ($)</label>
          <input id="budget_min" name="budget_min" type="number" min="0" value={form.budget_min} onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="budget_max" className="block text-sm font-medium text-slate-300">Budget max ($)</label>
          <input id="budget_max" name="budget_max" type="number" min="0" value={form.budget_max} onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label htmlFor="preferred_locations" className="block text-sm font-medium text-slate-300">Preferred locations (comma-separated)</label>
        <input id="preferred_locations" name="preferred_locations" type="text" value={form.preferred_locations} onChange={handleChange}
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
      </div>

      <div>
        <label htmlFor="purchase_timeline" className="block text-sm font-medium text-slate-300">Purchase timeline</label>
        <select id="purchase_timeline" name="purchase_timeline" value={form.purchase_timeline} onChange={handleChange}
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
          <option value="">—</option>
          <option value="immediately">Immediately (0–3 months)</option>
          <option value="3_to_6_months">3–6 months</option>
          <option value="6_to_12_months">6–12 months</option>
          <option value="1_to_2_years">1–2 years</option>
          <option value="exploring">Just exploring</option>
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" name="remote_business_ok" checked={form.remote_business_ok} onChange={handleChange}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500" />
        <span className="text-sm text-slate-300">Open to remote businesses</span>
      </label>

      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" name="share_with_sellers" checked={form.share_with_sellers} onChange={handleChange}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500" />
        <span className="text-sm text-slate-300">Share profile with sellers (opt-in)</span>
      </label>

      <button type="button" disabled={isPending} onClick={handleSave}
        className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
        {saved ? 'Saved' : isPending ? '…' : 'Save preferences'}
      </button>
    </div>
  );
}
