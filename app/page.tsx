import Link from 'next/link';
import Header from '@/components/Header';
import TopRestaurantCard from '@/components/TopRestaurantCard';
import RecentlyConfirmedCard from '@/components/RecentlyConfirmedCard';
import { getAllRestaurants } from '@/lib/restaurants';
import { buildRankedRestaurants } from '@/lib/ranking';
import { getSupabaseClient } from '@/lib/supabase';
import { Restaurant } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface RecentConfirmationRow {
  restaurant_id: string;
  created_at: string;
  confirmed_features: string[];
}

async function fetchRecentConfirmations(): Promise<RecentConfirmationRow[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('parent_confirmations')
    .select('restaurant_id, created_at, confirmed_features')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as RecentConfirmationRow[];
}

interface RecentlyConfirmedEntry {
  restaurant: Restaurant;
  restaurantId: string;
  confirmedAt: string;
  featureCount: number;
}

function buildRecentlyConfirmed(
  allRestaurants: Restaurant[],
  confirmations: RecentConfirmationRow[],
): RecentlyConfirmedEntry[] {
  const restaurantMap = new Map(allRestaurants.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const result: RecentlyConfirmedEntry[] = [];

  for (const c of confirmations) {
    if (seen.has(c.restaurant_id)) continue;
    const restaurant = restaurantMap.get(c.restaurant_id);
    if (!restaurant) continue;
    seen.add(c.restaurant_id);
    result.push({
      restaurant,
      restaurantId: c.restaurant_id,
      confirmedAt: c.created_at,
      featureCount: c.confirmed_features?.length ?? 0,
    });
    if (result.length >= 5) break;
  }

  return result;
}

export default async function HomePage() {
  const [allRestaurants, recentConfirmationRows] = await Promise.all([
    getAllRestaurants(),
    fetchRecentConfirmations(),
  ]);

  const ranked = await buildRankedRestaurants(allRestaurants);
  const top10 = ranked.slice(0, 10);
  const recentlyConfirmed = buildRecentlyConfirmed(allRestaurants, recentConfirmationRows);

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">

        <section className="py-10 sm:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Guildford, UK &middot; Updated from real reviews
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight mb-4 tracking-tight">
              Best Toddler Restaurants<br className="hidden sm:block" />{' '}
              <span className="text-emerald-600">in Guildford</span>
            </h1>

            <p className="text-stone-500 text-base sm:text-lg leading-relaxed max-w-xl">
              Ranked by toddler score using real parent reviews &mdash; so you can pick the right spot
              before you leave the house.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 sm:gap-4 mt-8">
            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-stone-400 leading-none">AI-scored</p>
                <p className="text-sm font-semibold text-stone-800 mt-0.5">{allRestaurants.length} venues</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-stone-400 leading-none">Verified by</p>
                <p className="text-sm font-semibold text-stone-800 mt-0.5">
                  {recentConfirmationRows.length > 0
                    ? `${recentConfirmationRows.length}+ parents`
                    : 'local parents'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 4h12M5 8h6M7 12h2"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-stone-400 leading-none">Showing</p>
                <p className="text-sm font-semibold text-stone-800 mt-0.5">Top 10 ranked</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Top 10 Picks</h2>
              <p className="text-sm text-stone-400 mt-0.5">
                Sorted by toddler score &amp; parent confirmations
              </p>
            </div>
            <Link
              href="/best"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
            >
              View all
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 12l4-4-4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {top10.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-stone-400" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-stone-700">No restaurants yet</p>
              <p className="text-xs text-stone-400 mt-1">Check back soon &mdash; restaurants are being added.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {top10.map((rankedRestaurant, i) => (
                <TopRestaurantCard
                  key={rankedRestaurant.restaurant.id}
                  ranked={rankedRestaurant}
                  rank={i + 1}
                />
              ))}
            </div>
          )}
        </section>

        {recentlyConfirmed.length > 0 && (
          <section className="mt-14">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                Recently confirmed by parents
              </h2>
            </div>
            <p className="text-sm text-stone-400 mb-5 ml-4">
              Parents have visited recently and verified these venues.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentlyConfirmed.map((entry) => (
                <RecentlyConfirmedCard
                  key={entry.restaurantId}
                  restaurant={entry.restaurant}
                  recentConfirmation={{
                    restaurantId: entry.restaurantId,
                    confirmedAt: entry.confirmedAt,
                    featureCount: entry.featureCount,
                  }}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 bg-gradient-to-br from-emerald-50 to-stone-50 border border-emerald-100 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 5v5l4 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-900 text-base mb-1">
                Help other Guildford parents
              </p>
              <p className="text-sm text-stone-500 leading-relaxed">
                Visited a restaurant recently? Confirm what you found &mdash; high chairs, pram space,
                kids menu, and more. Your experience makes this guide better for everyone.
              </p>
            </div>
            <Link
              href="/best"
              className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Browse &amp; confirm
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Excellent
                </span>
                <span className="text-xs text-stone-400 ml-auto">4.5+</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                Genuinely great for toddlers &mdash; high chairs, pram space, welcoming staff all confirmed.
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-lime-500" />
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Good
                </span>
                <span className="text-xs text-stone-400 ml-auto">3.5&ndash;4.4</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                Solid choice for families. Some features confirmed, broadly toddler-friendly.
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Mixed
                </span>
                <span className="text-xs text-stone-400 ml-auto">Below 3.5</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                May suit calmer toddlers. Check the details and parent notes before visiting.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
