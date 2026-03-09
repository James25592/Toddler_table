'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ActiveFilter, FILTER_OPTIONS_BY_GROUP, VENUE_TYPE_OPTIONS, VenueType } from '@/lib/ranking';

interface Props {
  activeFilters: ActiveFilter[];
  activeVenueTypes: VenueType[];
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full border font-medium transition-all duration-150 cursor-pointer ${
        active
          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
          : 'bg-white border-stone-200 text-stone-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
      }`}
    >
      {active && (
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 7.5l3 3 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {label}
    </button>
  );
}

export default function BestPageFilters({ activeFilters, activeVenueTypes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle(key: ActiveFilter) {
    const current = new Set(activeFilters);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (current.size > 0) {
      params.set('filter', Array.from(current).join(','));
    } else {
      params.delete('filter');
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggleVenueType(key: VenueType) {
    const current = new Set(activeVenueTypes);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (current.size > 0) {
      params.set('type', Array.from(current).join(','));
    } else {
      params.delete('type');
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function removeFilter(key: ActiveFilter) {
    const current = new Set(activeFilters);
    current.delete(key);
    const params = new URLSearchParams(searchParams.toString());
    if (current.size > 0) {
      params.set('filter', Array.from(current).join(','));
    } else {
      params.delete('filter');
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('filter');
    params.delete('type');
    router.replace(`${pathname}?${params.toString()}`);
  }

  const allOptions = [...FILTER_OPTIONS_BY_GROUP.facilities, ...FILTER_OPTIONS_BY_GROUP.experience];
  const activeFilterLabels = allOptions
    .filter((o) => activeFilters.includes(o.key))
    .map((o) => ({ key: o.key, label: o.label }));

  const activeVenueTypeLabels = VENUE_TYPE_OPTIONS
    .filter((o) => activeVenueTypes.includes(o.key))
    .map((o) => ({ key: o.key, label: o.label }));

  const hasActiveFilters = activeFilterLabels.length > 0 || activeVenueTypeLabels.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2.5">
          Venue type
        </p>
        <div className="flex flex-wrap gap-2">
          {VENUE_TYPE_OPTIONS.map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              active={activeVenueTypes.includes(key)}
              onClick={() => toggleVenueType(key)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2.5">
          Facilities
        </p>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS_BY_GROUP.facilities.map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              active={activeFilters.includes(key)}
              onClick={() => toggle(key)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2.5">
          Experience
        </p>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS_BY_GROUP.experience.map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              active={activeFilters.includes(key)}
              onClick={() => toggle(key)}
            />
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="pt-3 border-t border-stone-100">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-xs font-medium text-stone-500 mt-1.5 flex-shrink-0">
              Active filters:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeVenueTypeLabels.map(({ key, label }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-700 border border-sky-200 pl-2.5 pr-1.5 py-1 rounded-full font-medium"
                >
                  {label}
                  <button
                    onClick={() => toggleVenueType(key)}
                    className="w-4 h-4 rounded-full bg-sky-100 hover:bg-sky-200 flex items-center justify-center transition-colors flex-shrink-0"
                    aria-label={`Remove ${label} filter`}
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2.5 2.5l5 5M7.5 2.5l-5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              {activeFilterLabels.map(({ key, label }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 pl-2.5 pr-1.5 py-1 rounded-full font-medium"
                >
                  {label}
                  <button
                    onClick={() => removeFilter(key)}
                    className="w-4 h-4 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors flex-shrink-0"
                    aria-label={`Remove ${label} filter`}
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2.5 2.5l5 5M7.5 2.5l-5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                onClick={clearAll}
                className="text-xs text-stone-400 hover:text-red-500 px-2 py-1 transition-colors font-medium"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
