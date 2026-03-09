import Link from 'next/link';
import Image from 'next/image';
import { RankedRestaurant } from '@/lib/ranking';
import { ConfirmationFeature, DetailedFacility } from '@/lib/types';
import { TYPE_LABELS } from '@/lib/labels';

const CONFIRMATION_FEATURE_LABELS: Record<ConfirmationFeature, string> = {
  high_chairs: 'High chairs',
  pram_space: 'Pram space',
  changing_table: 'Baby changing',
  kids_menu: 'Kids menu',
  friendly_staff: 'Friendly staff',
  easy_seating: 'Easy seating',
  toddler_tolerant: 'Toddler tolerant',
};

const FACILITY_LABELS: Record<DetailedFacility, string> = {
  high_chairs: 'High chairs',
  pram_space: 'Pram space',
  changing_table: 'Baby changing',
  kids_menu: 'Kids menu',
  outdoor_seating: 'Outdoor seating',
  play_area: 'Play area',
  baby_friendly_toilets: 'Baby toilets',
};

function ScoreRing({ score }: { score: number }) {
  const pct = score / 5;
  const radius = 20;
  const circ = 2 * Math.PI * radius;
  const dash = pct * circ;

  const color =
    score >= 4.5
      ? '#10b981'
      : score >= 3.5
      ? '#84cc16'
      : score >= 2.5
      ? '#f59e0b'
      : '#ef4444';

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#e7e5e4" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-stone-800">{score.toFixed(1)}</span>
      </div>
    </div>
  );
}

interface BestRestaurantCardProps {
  ranked: RankedRestaurant;
  rank: number;
  distanceLabel?: string;
}

export default function BestRestaurantCard({ ranked, rank, distanceLabel }: BestRestaurantCardProps) {
  const { restaurant, finalScore, confirmationCount, topConfirmedFeatures, confirmedFacilities } =
    ranked;

  const extraFacilities = confirmedFacilities.filter(
    (f) => !['high_chairs', 'pram_space', 'kids_menu'].includes(f),
  );

  const allBadges = [
    ...topConfirmedFeatures.map((f) => ({
      key: f,
      label: CONFIRMATION_FEATURE_LABELS[f] ?? f,
      source: 'confirmation' as const,
    })),
    ...extraFacilities.map((f) => ({
      key: f,
      label: FACILITY_LABELS[f] ?? f,
      source: 'facility' as const,
    })),
  ].slice(0, 5);

  const rankColors: Record<number, string> = {
    1: 'bg-amber-400 text-amber-900',
    2: 'bg-stone-300 text-stone-700',
    3: 'bg-orange-300 text-orange-800',
  };
  const rankBg = rankColors[rank] ?? 'bg-stone-100 text-stone-500';

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group bg-white rounded-2xl border border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col sm:flex-row"
    >
      <div className="relative w-full sm:w-36 h-44 sm:h-auto flex-shrink-0 overflow-hidden bg-stone-100">
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, 144px"
        />
        <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankBg}`}>
          {rank}
        </div>
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {TYPE_LABELS[restaurant.type] ?? restaurant.type}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 text-base leading-snug group-hover:text-emerald-700 transition-colors truncate">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs text-stone-400 truncate">{restaurant.address}</p>
              {distanceLabel && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium flex-shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M6 1v1M6 9v1M1 5h1M10 5h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <circle cx="6" cy="5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  {distanceLabel}
                </span>
              )}
            </div>
          </div>
          <ScoreRing score={finalScore} />
        </div>

        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{restaurant.summary}</p>

        {allBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allBadges.map(({ key, label }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium"
              >
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5l2.5 2.5 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <div className="flex items-center gap-3">
            {confirmationCount > 0 && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5l2.5 2.5 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Verified by {confirmationCount} local parent{confirmationCount !== 1 ? 's' : ''}
              </span>
            )}
            {confirmationCount === 0 && (
              <span className="text-xs text-stone-400 italic">No parent confirmations yet</span>
            )}
          </div>
          <span className="text-xs text-emerald-600 font-medium group-hover:underline flex-shrink-0">
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}
