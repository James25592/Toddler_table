import Link from 'next/link';
import Image from 'next/image';
import { Restaurant } from '@/lib/types';
import ToddlerScoreBadge from './ToddlerScoreBadge';
import StarRating from './StarRating';
import { TYPE_LABELS } from '@/lib/labels';

interface RestaurantCardProps {
  restaurant: Restaurant;
  confirmationCount?: number;
}

export default function RestaurantCard({ restaurant, confirmationCount = 0 }: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-stone-300 hover:shadow-md transition-all duration-200 flex flex-col"
    >
      <div className="relative h-44 overflow-hidden bg-stone-100">
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-stone-600 text-xs font-medium px-2 py-1 rounded-full">
            {TYPE_LABELS[restaurant.type] ?? restaurant.type}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-stone-900 text-base leading-snug group-hover:text-emerald-700 transition-colors">
              {restaurant.name}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5 truncate">{restaurant.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <StarRating rating={restaurant.googleRating} reviewCount={restaurant.googleReviewCount} />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Toddler score</span>
          <ToddlerScoreBadge score={restaurant.toddlerScore} size="sm" showLabel />
        </div>

        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 flex-1">
          {restaurant.summary}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-stone-100">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-stone-400">
              {restaurant.positiveSignals.length} positive signal{restaurant.positiveSignals.length !== 1 ? 's' : ''}
            </span>
            {confirmationCount > 0 && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5l2.5 2.5 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Verified by {confirmationCount} local parent{confirmationCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="text-xs text-emerald-600 font-medium group-hover:underline">
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}
