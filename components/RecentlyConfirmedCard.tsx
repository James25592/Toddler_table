import Link from 'next/link';
import Image from 'next/image';
import { Restaurant } from '@/lib/types';

interface RecentConfirmation {
  restaurantId: string;
  confirmedAt: string;
  featureCount: number;
}

interface Props {
  restaurant: Restaurant;
  recentConfirmation: RecentConfirmation;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function RecentlyConfirmedCard({ restaurant, recentConfirmation }: Props) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group bg-white border border-stone-200 rounded-xl hover:border-emerald-200 hover:shadow-md transition-all duration-200 overflow-hidden flex items-center gap-0"
    >
      <div className="relative w-20 h-20 flex-shrink-0 bg-stone-100 overflow-hidden">
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="80px"
        />
      </div>

      <div className="flex-1 px-3 py-2.5 min-w-0">
        <h4 className="text-sm font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors truncate leading-tight">
          {restaurant.name}
        </h4>
        <p className="text-[11px] text-stone-400 truncate mt-0.5">{restaurant.address}</p>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium border border-emerald-100">
            <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6.5l2.5 2.5 5.5-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {recentConfirmation.featureCount} feature{recentConfirmation.featureCount !== 1 ? 's' : ''} confirmed
          </span>
          <span className="text-[11px] text-stone-400">
            {timeAgo(recentConfirmation.confirmedAt)}
          </span>
        </div>
      </div>

      <div className="pr-3 flex-shrink-0">
        <svg
          className="w-4 h-4 text-stone-300 group-hover:text-emerald-400 transition-colors"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M6 12l4-4-4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Link>
  );
}
