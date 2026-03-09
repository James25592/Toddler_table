import {
  DETAILED_FACILITIES,
  DETAILED_EXPERIENCE_TAGS,
  DetailedFacility,
  DetailedExperienceTag,
  DetailedAggregation,
} from '@/lib/types';

const FACILITY_SUMMARY: Record<DetailedFacility, (n: number) => string> = {
  high_chairs: (n) => `High chairs confirmed by ${n} parent${n > 1 ? 's' : ''}`,
  pram_space: (n) => `Buggy space reported as spacious by ${n} parent${n > 1 ? 's' : ''}`,
  changing_table: (n) => `Changing table confirmed by ${n} parent${n > 1 ? 's' : ''}`,
  kids_menu: (n) => `Kids menu confirmed by ${n} parent${n > 1 ? 's' : ''}`,
  outdoor_seating: (n) => `Outdoor seating confirmed by ${n} parent${n > 1 ? 's' : ''}`,
  play_area: (n) => `Play area confirmed by ${n} parent${n > 1 ? 's' : ''}`,
  baby_friendly_toilets: (n) => `Baby-friendly toilets confirmed by ${n} parent${n > 1 ? 's' : ''}`,
};

const EXPERIENCE_SUMMARY: Record<DetailedExperienceTag, (n: number) => string> = {
  friendly_staff: (n) => `Staff friendly to children — reported by ${n} parent${n > 1 ? 's' : ''}`,
  relaxed_atmosphere: (n) => `Relaxed atmosphere with toddlers — reported by ${n} parent${n > 1 ? 's' : ''}`,
  pram_near_table: (n) => `Easy to fit a pram near the table — reported by ${n} parent${n > 1 ? 's' : ''}`,
  toddler_tolerant: (n) => `Good for noisy toddlers — reported by ${n} parent${n > 1 ? 's' : ''}`,
};

const RATING_CONFIG: {
  key: 'avg_toddler_friendliness' | 'avg_noise_tolerance' | 'avg_family_space';
  label: string;
}[] = [
  { key: 'avg_toddler_friendliness', label: 'Toddler friendliness' },
  { key: 'avg_noise_tolerance', label: 'Noise tolerance' },
  { key: 'avg_family_space', label: 'Space for families' },
];

function countStyle(count: number) {
  if (count >= 5) return { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' };
  if (count >= 2) return { dot: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50 border-sky-100' };
  return { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' };
}

function StarDisplay({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.3;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= full ? 'text-amber-400' : half && i === full + 1 ? 'text-amber-300' : 'text-stone-200'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
      <span className="text-sm font-semibold text-stone-700 ml-1.5 tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

interface DetailedSubmissionsDisplayProps {
  aggregation: DetailedAggregation;
}

export default function DetailedSubmissionsDisplay({ aggregation }: DetailedSubmissionsDisplayProps) {
  const { total_responders } = aggregation;

  if (total_responders === 0) return null;

  const confirmedFacilities = DETAILED_FACILITIES.filter((f) => aggregation.facilities[f] > 0)
    .sort((a, b) => aggregation.facilities[b] - aggregation.facilities[a]);

  const confirmedExperience = DETAILED_EXPERIENCE_TAGS.filter((t) => aggregation.experience_tags[t] > 0)
    .sort((a, b) => aggregation.experience_tags[b] - aggregation.experience_tags[a]);

  const hasRatings = RATING_CONFIG.some(({ key }) => aggregation[key] != null);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100 bg-stone-50">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-stone-800">From parents who visited</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Based on {total_responders} report{total_responders > 1 ? 's' : ''} from parents with toddlers
          </p>
        </div>
        <span className="text-xs font-medium text-sky-700 bg-sky-50 border border-sky-100 px-2 py-1 rounded-full">
          {total_responders} {total_responders === 1 ? 'parent' : 'parents'}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {confirmedFacilities.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Facilities</h3>
            <div className="flex flex-col gap-2">
              {confirmedFacilities.map((f) => {
                const count = aggregation.facilities[f];
                const style = countStyle(count);
                return (
                  <div key={f} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${style.bg}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                    <span className={`text-sm flex-1 leading-snug ${style.text}`}>
                      {FACILITY_SUMMARY[f](count)}
                    </span>
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {confirmedExperience.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Experience</h3>
            <div className="flex flex-col gap-2">
              {confirmedExperience.map((t) => {
                const count = aggregation.experience_tags[t];
                const style = countStyle(count);
                return (
                  <div key={t} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${style.bg}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                    <span className={`text-sm flex-1 leading-snug ${style.text}`}>
                      {EXPERIENCE_SUMMARY[t](count)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {hasRatings && (
          <section>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Parent ratings</h3>
            <div className="flex flex-col divide-y divide-stone-100">
              {RATING_CONFIG.map(({ key, label }) => {
                const val = aggregation[key];
                if (val == null) return null;
                return (
                  <div key={key} className="flex items-center justify-between py-3">
                    <span className="text-sm text-stone-600">{label}</span>
                    <StarDisplay value={val} />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
