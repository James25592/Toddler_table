'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Check, X, Save, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle, ChevronDown } from 'lucide-react';
import type { ManualAmenities } from '@/app/api/admin/manual-amenities/route';

interface RestaurantOption {
  id: string;
  name: string;
  address: string;
  toddler_score: number;
  manual_amenities: ManualAmenities | null;
}

type TriState = true | false | null;

const AMENITY_FIELDS: { key: keyof Omit<ManualAmenities, 'notes'>; label: string }[] = [
  { key: 'high_chairs',         label: 'High chairs' },
  { key: 'kids_menu',           label: 'Kids menu' },
  { key: 'pram_space',          label: 'Pram / buggy space' },
  { key: 'changing_table',      label: 'Changing table' },
  { key: 'outdoor_seating',     label: 'Outdoor seating' },
  { key: 'play_area',           label: 'Play area' },
  { key: 'noise_tolerant',      label: 'Noise tolerant' },
  { key: 'staff_child_friendly', label: 'Child-friendly staff' },
];

const EMPTY_AMENITIES: ManualAmenities = {
  high_chairs: null,
  kids_menu: null,
  pram_space: null,
  changing_table: null,
  outdoor_seating: null,
  play_area: null,
  noise_tolerant: null,
  staff_child_friendly: null,
  notes: null,
};

function TriToggle({
  value,
  onChange,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  const cycle = () => {
    if (value === null) onChange(true);
    else if (value === true) onChange(false);
    else onChange(null);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      className={`w-20 h-7 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1 border ${
        value === true
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
          : value === false
          ? 'bg-red-50 border-red-300 text-red-700'
          : 'bg-stone-50 border-stone-200 text-stone-400'
      }`}
    >
      {value === true ? (
        <><Check className="w-3 h-3" /> Yes</>
      ) : value === false ? (
        <><X className="w-3 h-3" /> No</>
      ) : (
        <>— Unknown</>
      )}
    </button>
  );
}

export default function AmenityEditor() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RestaurantOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<RestaurantOption | null>(null);
  const [amenities, setAmenities] = useState<ManualAmenities>(EMPTY_AMENITIES);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/manual-amenities?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.restaurants ?? []);
      setDropdownOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length === 0) {
      search('');
      return;
    }
    searchTimeout.current = setTimeout(() => search(query), 250);
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectRestaurant(r: RestaurantOption) {
    setSelected(r);
    setQuery(r.name);
    setDropdownOpen(false);
    setAmenities(r.manual_amenities ?? EMPTY_AMENITIES);
    setSaveSuccess(false);
    setSaveError(null);
  }

  function setField(key: keyof Omit<ManualAmenities, 'notes'>, value: TriState) {
    setAmenities((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/manual-amenities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: selected.id, amenities }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? 'Unknown error');
      } else {
        setSaveSuccess(true);
        setSelected((prev) => prev ? { ...prev, manual_amenities: amenities } : null);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  const hasAnySet = AMENITY_FIELDS.some((f) => amenities[f.key] !== null);

  return (
    <div className="space-y-4">
      <div className="relative" ref={dropdownRef}>
        <label className="block text-xs font-medium text-stone-600 mb-1.5">
          Search for a venue
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            onFocus={() => {
              search(query);
              setDropdownOpen(true);
            }}
            placeholder="Type venue name..."
            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 animate-spin" />
          )}
        </div>

        {dropdownOpen && results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRestaurant(r)}
                className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{r.name}</p>
                    <p className="text-xs text-stone-400 truncate">{r.address}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-stone-500">{Number(r.toddler_score).toFixed(1)}</span>
                    {r.manual_amenities && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-medium">edited</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-800">{selected.name}</p>
              <p className="text-xs text-stone-400">Current AI score: {Number(selected.toddler_score).toFixed(1)}</p>
            </div>
            {hasAnySet && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">
                Manual data active
              </span>
            )}
          </div>

          <div className="px-4 py-3 space-y-2.5">
            <p className="text-xs text-stone-500 mb-1">
              Set to <span className="font-semibold text-emerald-700">Yes</span> or <span className="font-semibold text-red-600">No</span> to override AI. Leave as <span className="font-medium text-stone-400">Unknown</span> to defer to AI scoring.
            </p>
            {AMENITY_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-stone-700">{label}</span>
                <TriToggle
                  value={amenities[key] as TriState}
                  onChange={(v) => setField(key, v)}
                />
              </div>
            ))}

            <div className="pt-1">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={amenities.notes ?? ''}
                onChange={(e) => setAmenities((prev) => ({ ...prev, notes: e.target.value || null }))}
                placeholder="e.g. High chairs available on request, ask staff"
                rows={2}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="px-4 pb-3 space-y-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium text-sm rounded-xl px-4 py-2.5 transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save amenity data</>
              )}
            </button>

            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-700 font-medium">Saved — this data will be used at 100% confidence in scoring</p>
              </div>
            )}

            {saveError && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{saveError}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
