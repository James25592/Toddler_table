import Link from 'next/link';
import AdminPanel from './AdminPanel';
import RestaurantSearch from './RestaurantSearch';
import { getAllRestaurants } from '@/lib/restaurants';

export default async function Header() {
  const restaurants = await getAllRestaurants();

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold select-none">
            TT
          </div>
          <div>
            <span className="font-semibold text-stone-900 text-sm leading-tight block group-hover:text-emerald-600 transition-colors">
              Toddler Table
            </span>
            <span className="text-xs text-stone-400 leading-tight block">Guildford</span>
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <RestaurantSearch restaurants={restaurants} />
          <Link
            href="/best"
            className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors"
          >
            Best picks
          </Link>
          <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full hidden sm:inline">
            Guildford, UK
          </span>
          <AdminPanel />
        </nav>
      </div>
    </header>
  );
}
