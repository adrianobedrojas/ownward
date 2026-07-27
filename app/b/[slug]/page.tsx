// app/b/[slug]/page.tsx
import CommunityPulseForm from '@/components/CommunityPulseForm';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server'; // Adjust this path if your Supabase server client is located elsewhere (e.g., '@/utils/supabase/server')

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function PublicBusinessPage({ params }: Props) {
    const { slug } = await params;

    // Initialize Supabase for server-side fetching
    const supabase = await createClient();

    // Fetch the business details, ensuring it is marked as public
    const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

    // If there's an error (like it doesn't exist) or it's not public, show a 404
    if (error || !business) {
        notFound();
    }

    return (
        <main className="max-w-4xl mx-auto px-4 py-16 text-slate-100">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
                <h1 className="text-4xl font-bold tracking-tight text-white">{business.name}</h1>

                {business.description ? (
                    <p className="mt-6 text-lg leading-8 text-slate-300">
                        {business.description}
                    </p>
                ) : (
                    <p className="mt-6 text-lg leading-8 text-slate-500 italic">
                        No description provided.
                    </p>
                )}

                <hr className="my-8 border-slate-800" />

                {/* We will add the Community Pulse Survey Component here next! */}
                <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-6">
                    <h2 className="text-lg font-semibold text-cyan-400 mb-4">Community Pulse</h2>
                    <CommunityPulseForm businessId={business.id} />
                </div>
            </div>
        </main>
    );
}