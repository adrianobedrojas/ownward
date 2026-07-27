import { createClient } from '@/lib/supabase/server';
import { getOwnerPulseAnalytics } from '@/app/actions/pulse';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's business profile
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user?.id || '')
    .single();

  let analytics = null;
  if (business) {
    analytics = await getOwnerPulseAnalytics(business.id);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 text-slate-100">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {!business ? (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-slate-300">You haven't set up a business profile yet.</p>
          <Link 
            href="/sell" 
            className="mt-4 inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Create Business Profile
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Header Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400">Total Profile Visits</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {analytics?.totalVisits ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400">Pulse Responses</p>
              <p className="mt-2 text-3xl font-bold text-cyan-400">
                {analytics?.totalResponses ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400">Public Link</p>
              <Link 
                href={`/b/${business.slug}`} 
                target="_blank"
                className="mt-2 block truncate text-sm text-cyan-400 underline hover:text-cyan-300"
              >
                /b/{business.slug}
              </Link>
            </div>
          </div>

          {/* Response Details List */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-semibold text-white">Recent Community Pulse Feed</h2>

            {analytics?.responses && analytics.responses.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-800">
                {analytics.responses.map((item: any) => (
                  <div key={item.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-cyan-400">
                        {item.relationship.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-300">
                      <strong>Intent:</strong> {item.support_intent.replace(/_/g, ' ')}
                    </p>

                    {item.reveal_identity && (
                      <p className="mt-1 text-xs text-slate-400">
                        <strong>Contact:</strong> {item.visitor_name || 'Anonymous'} ({item.visitor_email || 'No email provided'})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No responses collected yet. Share your public profile link to gather community feedback!</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}