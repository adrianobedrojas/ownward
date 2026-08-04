'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import {
  STAGE_LABELS,
  STAGE_ORDER,
  type SellerPipelineStage,
  type SellerOpportunity,
} from '@/lib/seller/pipeline';

interface Business { id: string; name: string; profile_completion: number; annual_revenue: number | null; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface InterestEvent {
  id: string;
  listing_id: string;
  event_type: string;
  conversation_id: string | null;
  created_at: string;
  listing_name?: string;
}

interface Props {
  businesses: Business[];
  opportunities: AnyRecord[];
  pendingOffers: AnyRecord[];
  recentAssessments: AnyRecord[];
  interestEvents?: InterestEvent[];
}

function dbToOpportunity(r: AnyRecord): SellerOpportunity {
  return {
    id: r.id,
    businessId: r.business_id,
    stage: r.stage as SellerPipelineStage,
    buyerName: r.buyer_name ?? null,
    askingPrice: r.asking_price ? Number(r.asking_price) : null,
    offeredPrice: r.offered_price ? Number(r.offered_price) : null,
    dealRoomId: r.deal_room_id ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const STAGE_COLORS: Partial<Record<SellerPipelineStage, string>> = {
  preparing: 'text-slate-400',
  listed: 'text-cyan-400',
  inquiry_received: 'text-blue-400',
  buyer_qualification: 'text-indigo-400',
  nda_review: 'text-purple-400',
  due_diligence: 'text-amber-400',
  offer_received: 'text-orange-400',
  negotiation: 'text-yellow-400',
  closing_preparation: 'text-lime-400',
  completed: 'text-emerald-400',
  withdrawn: 'text-slate-500',
};

export default function SellerClient({
  businesses,
  opportunities: rawOpps,
  pendingOffers,
  recentAssessments,
  interestEvents = [],
}: Props) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    businesses[0]?.id ?? ''
  );

  const opportunities = rawOpps.map(dbToOpportunity);
  const businessOpps = opportunities.filter((o) => o.businessId === selectedBusinessId);
  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  const latestAssessment = recentAssessments.find(
    (a) => a.business_id === selectedBusinessId
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-300">Seller Area</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Manage your sale pipeline, buyer interactions, deal rooms, and offers.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Disclaimer: Pipeline stages are for organizational tracking only. Ownward is not a broker,
          escrow agent, law firm, or guarantor. Nothing here constitutes legal or financial advice.
        </p>
      </div>

      {/* Business selector */}
      {businesses.length > 1 && (
        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-1">Select Business</label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Command center summary */}
      {selectedBusiness && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Widget label="Profile" value={`${selectedBusiness.profile_completion ?? 0}%`} />
          <Widget
            label="Readiness Score"
            value={latestAssessment ? `${latestAssessment.overall_score}/100` : 'Not assessed'}
            className={!latestAssessment ? 'text-slate-500' : 'text-cyan-300'}
          />
          <Widget
            label="Annual Revenue"
            value={selectedBusiness.annual_revenue ? fmt(selectedBusiness.annual_revenue) : '—'}
          />
          <Widget
            label="Pending Offers"
            value={String(pendingOffers.filter(o => o.business_id === selectedBusinessId).length)}
            className={pendingOffers.length > 0 ? 'text-amber-400' : 'text-slate-300'}
          />
        </div>
      )}

      {/* Pipeline */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">Sale Pipeline</h2>
          <Link href="/sell/new" className="text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-2 rounded-lg font-semibold">
            + New Opportunity
          </Link>
        </div>

        {businessOpps.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-8 text-center text-slate-400">
            No pipeline opportunities yet.{' '}
            <Link href="/sell/new" className="text-cyan-400 hover:underline">Create your first one.</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {businessOpps
              .sort((a, b) => STAGE_ORDER[b.stage] - STAGE_ORDER[a.stage])
              .map((opp) => (
                <div key={opp.id} className="rounded-xl border border-slate-700 bg-slate-900 p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm text-slate-200">
                      {opp.buyerName ?? 'Unnamed Buyer'}
                    </div>
                    <div className={`text-xs mt-0.5 ${STAGE_COLORS[opp.stage] ?? 'text-slate-400'}`}>
                      {STAGE_LABELS[opp.stage]}
                    </div>
                  </div>
                  <div className="text-right">
                    {opp.askingPrice && (
                      <div className="text-sm font-medium text-slate-200">{fmt(opp.askingPrice)}</div>
                    )}
                    <div className="text-xs text-slate-500">
                      {new Date(opp.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Buyer-Interest Activity */}
      {interestEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Buyer Interest Activity</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
            <div className="divide-y divide-slate-800">
              {interestEvents.slice(0, 10).map((ev) => {
                const isIdentified = ev.conversation_id != null;
                const eventLabel =
                  ev.event_type === 'qualified_view' ? 'Qualified view' :
                  ev.event_type === 'repeat_view' ? 'Repeat view' :
                  ev.event_type === 'saved' ? 'Saved listing' :
                  ev.event_type === 'maybe_interested' ? 'Needs more info' :
                  ev.event_type === 'interested' ? 'Expressed interest' :
                  ev.event_type === 'requested_information' ? 'Requested details' :
                  ev.event_type;

                return (
                  <div key={ev.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${
                        ev.event_type === 'interested' ? 'bg-cyan-400/20 text-cyan-300' :
                        ev.event_type === 'maybe_interested' ? 'bg-amber-400/20 text-amber-300' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {eventLabel}
                      </span>
                      {ev.listing_name && (
                        <span className="text-slate-400 text-xs">{ev.listing_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </span>
                      {isIdentified && ev.conversation_id ? (
                        <Link
                          href={`/messages/${ev.conversation_id}`}
                          className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          View conversation
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-600 italic">Anonymous</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Anonymous views: buyer identity protected. Identified leads show when buyer explicitly contacts you.
          </p>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickLink href="/sale-readiness" label="Sale Readiness" icon="📊" />
        <QuickLink href="/valuation" label="Valuation" icon="💰" />
        <QuickLink href="/customer-concentration" label="Concentration" icon="🎯" />
        <QuickLink href="/deals" label="Deal Rooms" icon="🏛️" />
        <QuickLink href="/messages" label="Messages" icon="💬" />
        <QuickLink href="/documents" label="Documents" icon="📂" />
        <QuickLink href="/tasks" label="Tasks" icon="✅" />
        <QuickLink href="/milestones" label="Milestones" icon="🎯" />
      </div>
    </div>
  );
}

function Widget({
  label,
  value,
  className = 'text-slate-100',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${className}`}>{value}</div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      className="rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-500 p-4 flex items-center gap-3 text-sm text-slate-300 hover:text-slate-100 transition-colors"
    >
      <span className="text-lg">{icon}</span>
      {label}
    </a>
  );
}
