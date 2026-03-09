import { Suspense } from 'react';
import Link from 'next/link';
import { getAllRestaurants } from '@/lib/restaurants';
import { buildRankedRestaurants, filterRanked, filterByVenueTypes, ActiveFilter, FILTER_OPTIONS, VENUE_TYPE_OPTIONS, VenueType } from '@/lib/ranking';
import Header from '@/components/Header';
import BestPageFilters from '@/components/BestPageFilters';
import RestaurantListClient from '@/components/RestaurantListClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { filter?: string; type?: string };
}

function parseFilters(raw: string | undefined): ActiveFilter[] {
  if (!raw) return [];
  const valid = new Set(FILTER_OPTIONS.map((f) => f.key));
  return raw
    .split(',')
    .filter((f): f is ActiveFilter => valid.has(f as ActiveFilter));
}

function parseVenueTypes(raw: string | undefined): VenueType[] {
  if (!raw) return [];
  const valid = new Set(VENUE_TYPE_OPTIONS.map((o) => o.key));
  return raw
    .split(',')
    .filter((t): t is VenueType => valid.has(t as VenueType));
}

export default async function BestRestaurantsPage({ searchParams }: PageProps) {
  const activeFilters = parseFilters(searchParams.filter);
  const activeVenueTypes = parseVenueTypes(searchParams.type);
  const allRestaurants = await getAllRestaurants();
  const ranked = await buildRankedRestaurants(allRestaurants);
  const byType = filterByVenueTypes(ranked, activeVenueTypes);
  const displayed = filterRanked(byType, activeFilters);

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 mb-5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All restaurants
          </Link>

          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Guildford, UK
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 leading-tight mb-3">
            Best toddler-friendly<br className="hidden sm:block" /> restaurants
          </h1>
          <p className="text-stone-500 text-base max-w-xl leading-relaxed">
            Ranked by toddler score, parent confirmations, and real parent ratings. Updated as parents share their experiences.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-stone-400" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold text-stone-700">Filter by need</span>
            </div>
            {(activeFilters.length + activeVenueTypes.length) > 0 && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                {activeFilters.length + activeVenueTypes.length} active
              </span>
            )}
          </div>
          <Suspense fallback={null}>
            <BestPageFilters activeFilters={activeFilters} activeVenueTypes={activeVenueTypes} />
          </Suspense>
        </div>

        <RestaurantListClient ranked={displayed} />

        <div className="mt-10 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-emerald-900 mb-1">Rankings improve with parent input</p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Visit a restaurant and confirm what you found — high chairs, pram space, and more. Your experience helps other parents make better choices.
          </p>
        </div>
      </main>
    </div>
  );
}
