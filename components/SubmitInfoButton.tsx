'use client';

import { useState } from 'react';
import { SnapshotCategory, SnapshotStatus } from '@/lib/types';

interface SubmitInfoButtonProps {
  restaurantId: string;
  restaurantName: string;
  onSubmitted?: () => void;
}

const CATEGORIES: { key: SnapshotCategory; label: string }[] = [
  { key: 'high_chair', label: 'High chair' },
  { key: 'kids_menu', label: 'Kids menu' },
  { key: 'pram_space', label: 'Buggy & pram space' },
  { key: 'changing_table', label: 'Changing facilities' },
  { key: 'noise_level', label: 'Noise level for toddlers' },
  { key: 'staff_friendliness', label: 'Staff friendliness to kids' },
];

const STATUS_OPTIONS: { value: SnapshotStatus; label: string; activeClass: string }[] = [
  { value: 'available', label: 'Available', activeClass: 'bg-emerald-100 border-emerald-400 text-emerald-700' },
  { value: 'limited', label: 'Limited', activeClass: 'bg-amber-100 border-amber-400 text-amber-700' },
  { value: 'not_suitable', label: 'Not suitable', activeClass: 'bg-red-100 border-red-400 text-red-700' },
];

type CategoryValues = Partial<Record<SnapshotCategory, SnapshotStatus>>;

export default function SubmitInfoButton({ restaurantId, restaurantName, onSubmitted }: SubmitInfoButtonProps) {
  const [state, setState] = useState<'idle' | 'open' | 'submitting' | 'submitted'>('idle');
  const [values, setValues] = useState<CategoryValues>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleToggle(cat: SnapshotCategory, val: SnapshotStatus) {
    setValues((prev) => ({
      ...prev,
      [cat]: prev[cat] === val ? undefined : val,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState('submitting');

    const res = await fetch('/api/parent-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        ...values,
        notes: notes.trim().slice(0, 500) || null,
      }),
    });
    const result = await res.json();

    if (result.success) {
      setState('submitted');
      onSubmitted?.();
    } else {
      setError('Something went wrong. Please try again.');
      setState('open');
    }
  }

  const hasAnyValue = Object.keys(values).length > 0 || notes.trim().length > 0;

  if (state === 'submitted') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-emerald-800">Thanks for contributing!</p>
        <p className="text-xs text-emerald-600 mt-1">Your report helps other parents in Guildford.</p>
      </div>
    );
  }

  if (state === 'open' || state === 'submitting') {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
        <h3 className="font-semibold text-stone-800 text-sm mb-1">Share what you know</h3>
        <p className="text-xs text-stone-500 mb-5">
          Help other parents by sharing your experience at {restaurantName}. Tap what applies.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-stone-600 mb-2">{label}</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(({ value, label: optLabel, activeClass }) => {
                  const isActive = values[key] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleToggle(key, value)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 ${
                        isActive
                          ? activeClass
                          : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                      }`}
                    >
                      {optLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold text-stone-600 mb-2">Additional notes (optional)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High chairs available but you have to ask. Baby change is downstairs."
              rows={2}
              className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setState('idle')}
              className="text-xs text-stone-400 hover:text-stone-600 px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasAnyValue || state === 'submitting'}
              className="text-xs font-medium bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state === 'submitting' ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState('open')}
      className="w-full py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 text-sm font-medium hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
    >
      + Share toddler info about this place
    </button>
  );
}
