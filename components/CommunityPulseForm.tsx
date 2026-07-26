'use client';

import { useState, useEffect } from 'react';
import { getOrCreateVisitorToken } from '@/lib/visitor';
import { submitPulseResponse } from '@/app/actions/pulse';

interface Props {
  businessId: string;
}

const RELATIONSHIPS = [
  { value: 'do_not_know', label: 'Just discovered them' },
  { value: 'know_about', label: 'Know about them' },
  { value: 'customer', label: 'Customer / Client' },
  { value: 'community', label: 'Local community member' },
  { value: 'friend_family', label: 'Friend or Family' },
  { value: 'business_connection', label: 'Business Connection' },
];

const INTENTS = [
  { value: 'just_browsing', label: 'Just browsing' },
  { value: 'follow', label: 'Follow their journey' },
  { value: 'become_customer', label: 'Become a customer' },
  { value: 'collaborate', label: 'Collaborate / Partner' },
  { value: 'offer_advice', label: 'Offer advice / mentorship' },
  { value: 'invest_or_buy', label: 'Interested in acquiring or investing' },
];

export default function CommunityPulseForm({ businessId }: Props) {
  const [visitorToken, setVisitorToken] = useState('');
  const [relationship, setRelationship] = useState('');
  const [supportIntent, setSupportIntent] = useState('');
  const [revealIdentity, setRevealIdentity] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = getOrCreateVisitorToken();
    setVisitorToken(token);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!relationship || !supportIntent) {
      setErrorMessage('Please select options for both questions.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const res = await submitPulseResponse({
      businessId,
      visitorToken,
      relationship,
      supportIntent,
      revealIdentity,
      visitorName: revealIdentity ? visitorName : undefined,
      visitorEmail: revealIdentity ? visitorEmail : undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      setErrorMessage(res.error || 'Failed to submit response. You may have already responded.');
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-6 text-center">
        <h3 className="text-lg font-semibold text-cyan-400">Thank you for sharing your feedback!</h3>
        <p className="mt-2 text-sm text-slate-300">
          Your input helps the owner understand how their business is seen by the community.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-200">
          1. What is your relationship to this business?
        </label>
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
        >
          <option value="">-- Select an option --</option>
          {RELATIONSHIPS.map((rel) => (
            <option key={rel.value} value={rel.value}>
              {rel.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200">
          2. How would you like to support or engage with them?
        </label>
        <select
          value={supportIntent}
          onChange={(e) => setSupportIntent(e.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
        >
          <option value="">-- Select an option --</option>
          {INTENTS.map((intent) => (
            <option key={intent.value} value={intent.value}>
              {intent.label}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={revealIdentity}
            onChange={(e) => setRevealIdentity(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
          />
          <span className="text-sm text-slate-300">Share my contact info with the owner (Optional)</span>
        </label>
      </div>

      {revealIdentity && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label className="block text-xs text-slate-400">Your Name</label>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">Your Email</label>
            <input
              type="email"
              value={visitorEmail}
              onChange={(e) => setVisitorEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              placeholder="jane@example.com"
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Pulse Response'}
      </button>
    </form>
  );
}