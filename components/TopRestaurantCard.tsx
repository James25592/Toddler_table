import Link from 'next/link';
import Image from 'next/image';
import { RankedRestaurant } from '@/lib/ranking';
import { ConfirmationFeature, DetailedFacility } from '@/lib/types';

const FEATURE_LABELS: Partial<Record<ConfirmationFeature | DetailedFacility, string>> = {
  high_chairs: 'High chairs',
  pram_space: 'Pram space',
  changing_table: 'Baby changing',
  kids_menu: 'Kids menu',
  friendly_staff: 'Friendly staff',
  easy_seating: 'Easy seating',
  toddler_tolerant: 'Toddler tolerant',
  outdoor_seating: 'Outdoor seating',
  play_area: 'Play area',
  baby_friendly_toilets: 'Baby toilets',
};

const AI_FEATURE_LABELS: Record<string, string> = {
  high_chairs: 'High chairs',
  pram_space: 'Pram space',
  changing_table: 'Baby changing',
  kids_menu: 'Kids menu',
  staff_child_friendly: 'Friendly staff',
  noise_tolerant: 'Noise tolerant',
};

const RANK_STYLES: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: 'bg-amber-400', text: 'text-amber-900', ring: 'ring-amber-300' },
  2: { bg: 'bg-stone-300', text: 'text-stone-700', ring: 'ring-stone-200' },
  3: { bg: 'bg-orange-300', text: 'text-orange-800', ring: 'ring-orange-200' },
};

function scoreColor(score: number): string {
  if (score >= 4.5) return '#10b981';
  if (score >= 3.5) return '#84cc16';
  if (score >= 2.5) return '#f59e0b';
  return '#ef4444';
}

function ScoreRing({ score }: { score: number }) {
  const pct = score / 5;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#e7e5e4" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold text-stone-900">{score.toFixed(1)}</span>
        <span className="text-[9px] text-stone-400 font-medium mt-0.5">/ 5</span>
      </div>
    </div>
  );
}

interface Props {
  ranked: RankedRestaurant;
  rank: number;
}

export default function TopRestaurantCard({ ranked, rank }: Props) {
  const { restaurant, finalScore, confirmationCount, topConfirmedFeatures, confirmedFacilities } =
    ranked;

  const toddlerFeatures = (restaurant as unknown as { toddler_features?: Record<string, unknown> })
    .toddler_features ?? {};
  const aiConfirmedFeatureKeys = Object.entries(toddlerFeatures)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  const featureBadges: { key: string; label: string }[] = [];

  const seen = new Set<string>();

  for (const f of topConfirmedFeatures) {
    const label = FEATURE_LABELS[f];
    if (label && !seen.has(f)) {
      featureBadges.push({ key: f, label });
      seen.add(f);
    }
  }

  for (const f of confirmedFacilities) {
    const label = FEATURE_LABELS[f as DetailedFacility];
    if (label && !seen.has(f)) {
      featureBadges.push({ key: f, label });
      seen.add(f);
    }
  }

  for (const f of aiConfirmedFeatureKeys) {
    const label = AI_FEATURE_LABELS[f];
    if (label && !seen.has(f)) {
      featureBadges.push({ key: f, label });
      seen.add(f);
    }
  }

  const displayBadges = featureBadges.slice(0, 4);

  const rankStyle = RANK_STYLES[rank] ?? {
    bg: 'bg-stone-100',
    text: 'text-stone-500',
    ring: 'ring-stone-100',
  };

  const scoreLabel =
    finalScore >= 4.5
      ? 'Excellent'
      : finalScore >= 3.5
      ? 'Good'
      : finalScore >= 2.5
      ? 'Average'
      : 'Below average';

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group bg-white rounded-2xl border border-stone-200 hover:border-emerald-200 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div className="relative h-48 overflow-hidden bg-stone-100 flex-shrink-0">
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        <div
          className={`absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-2 shadow-md ${rankStyle.bg} ${rankStyle.text} ${rankStyle.ring}`}
        >
          {rank <= 3 ? (
            <span>{rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}</span>
          ) : (
            <span>{rank}</span>
          )}
        </div>

        {restaurant.type && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full">
              {restaurant.type}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white text-base leading-tight drop-shadow-md line-clamp-1">
            {restaurant.name}
          </h3>
          <p className="text-white/70 text-[11px] mt-0.5 truncate drop-shadow-sm">
            {restaurant.address}
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-3">
          <ScoreRing score={finalScore} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-700">Toddler score</span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  color: scoreColor(finalScore),
                  backgroundColor: `${scoreColor(finalScore)}18`,
                }}
              >
                {scoreLabel}
              </span>
            </div>
            {confirmationCount > 0 && (
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6.5l2.5 2.5 5.5-6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {confirmationCount} parent{confirmationCount !== 1 ? 's' : ''} confirmed
              </p>
            )}
          </div>
        </div>

        {displayBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {displayBadges.map(({ key, label }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium"
              >
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6.5l2.5 2.5 5.5-6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {label}
              </span>
            ))}
          </div>
        )}

        {restaurant.summary && (
          <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 flex-1 italic">
            &ldquo;{restaurant.summary}&rdquo;
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <span className="text-[11px] text-stone-400">
            {restaurant.googleReviewCount.toLocaleString()} Google reviews
          </span>
          <span className="text-xs font-semibold text-emerald-600 group-hover:underline">
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}
