'use client';

import { useState, useEffect, useCallback } from 'react';
import BestRestaurantCard from './BestRestaurantCard';
import SortToggle, { SortMode } from './SortToggle';
import { RankedRestaurant } from '@/lib/ranking';
import { haversineKm, formatDistance } from '@/lib/distance';

interface Props {
  ranked: RankedRestaurant[];
}

interface WithDistance {
  ranked: RankedRestaurant;
  distanceKm: number | null;
  distanceLabel: string | undefined;
}

export default function RestaurantListClient({ ranked }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('score');
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
        setLocationDenied(false);
      },
      () => {
        setLocating(false);
        setLocationDenied(true);
        setSortMode('score');
      },
      { timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  function handleSortChange(mode: SortMode) {
    if (mode === 'distance' && userLat === null && !locating) {
      requestLocation();
    }
    setSortMode(mode);
  }

  useEffect(() => {
    if (sortMode === 'distance' && userLat === null && !locating && !locationDenied) {
      requestLocation();
    }
  }, [sortMode, userLat, locating, locationDenied, requestLocation]);

  const withDistances: WithDistance[] = ranked.map((r) => {
    const { lat, lng } = r.restaurant;
    if (lat != null && lng != null && userLat !== null && userLng !== null) {
      const km = haversineKm(userLat, userLng, lat, lng);
      return { ranked: r, distanceKm: km, distanceLabel: formatDistance(km) };
    }
    return { ranked: r, distanceKm: null, distanceLabel: undefined };
  });

  const sorted =
    sortMode === 'distance' && userLat !== null
      ? [...withDistances].sort((a, b) => {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        })
      : withDistances;

  const showLocationDeniedBanner = locationDenied && sortMode === 'distance';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-500">
          <span className="font-semibold text-stone-800">{sorted.length}</span>{' '}
          venue{sorted.length !== 1 ? 's' : ''}
        </p>
        <SortToggle mode={sortMode} onChange={handleSortChange} locating={locating} />
      </div>

      {showLocationDeniedBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 4v3m0 2.5v.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-xs text-amber-800 leading-relaxed">
            Location access was denied. Showing results sorted by toddler score instead.
            To use &ldquo;Closest to me&rdquo;, allow location access in your browser settings.
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-stone-400" viewBox="0 0 24 24" fill="none">
              <path
                d="M9.172 14.828L12 12m0 0l2.828-2.828M12 12L9.172 9.172M12 12l2.828 2.828M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-700 mb-1">No venues match these filters</p>
          <p className="text-xs text-stone-400">
            Try removing some filters or check back as more parents confirm features.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map(({ ranked: r, distanceLabel }, i) => (
            <BestRestaurantCard
              key={r.restaurant.id}
              ranked={r}
              rank={i + 1}
              distanceLabel={distanceLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
