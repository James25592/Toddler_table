'use client';

export type SortMode = 'score' | 'distance';

interface SortToggleProps {
  mode: SortMode;
  onChange: (mode: SortMode) => void;
  locating: boolean;
}

export default function SortToggle({ mode, onChange, locating }: SortToggleProps) {
  return (
    <div className="inline-flex items-center bg-stone-100 rounded-xl p-1 gap-0.5">
      <button
        onClick={() => onChange('score')}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
          mode === 'score'
            ? 'bg-white text-stone-800 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1l1.5 3.5L12 5l-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5L7 1z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
        Best for toddlers
      </button>
      <button
        onClick={() => onChange('distance')}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
          mode === 'distance'
            ? 'bg-white text-stone-800 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        {locating ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" fill="currentColor" />
            <path
              d="M7 1v2M7 11v2M1 7h2M11 7h2"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        )}
        Closest to me
      </button>
    </div>
  );
}
