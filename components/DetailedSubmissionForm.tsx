'use client';

import { useState } from 'react';
import {
  DETAILED_FACILITIES,
  DETAILED_EXPERIENCE_TAGS,
  DetailedFacility,
  DetailedExperienceTag,
} from '@/lib/types';

const FACILITY_LABELS: Record<DetailedFacility, string> = {
  high_chairs: 'High chairs available',
  pram_space: 'Space for prams',
  changing_table: 'Changing table',
  kids_menu: 'Kids menu',
  outdoor_seating: 'Outdoor seating',
  play_area: 'Play area',
  baby_friendly_toilets: 'Baby-friendly toilets',
};

const EXPERIENCE_LABELS: Record<DetailedExperienceTag, string> = {
  friendly_staff: 'Staff were friendly to children',
  relaxed_atmosphere: 'Restaurant felt relaxed with toddlers',
  pram_near_table: 'Easy to fit a pram near the table',
  toddler_tolerant: 'Good for noisy toddlers',
};

const RATING_LABELS: { key: 'toddler_friendliness' | 'noise_tolerance' | 'family_space'; label: string }[] = [
  { key: 'toddler_friendliness', label: 'Toddler friendliness' },
  { key: 'noise_tolerance', label: 'Noise tolerance' },
  { key: 'family_space', label: 'Space for families' },
];

const SPAM_KEY = (restaurantId: string) => `ds_submitted_${restaurantId}`;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function hasRecentSubmission(restaurantId: string): boolean {
  try {
    const raw = localStorage.getItem(SPAM_KEY(restaurantId));
    if (!raw) return false;
    return Date.now() - Number(raw) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markSubmission(restaurantId: string) {
  try {
    localStorage.setItem(SPAM_KEY(restaurantId), String(Date.now()));
  } catch {}
}

interface DetailedSubmissionFormProps {
  restaurantId: string;
  restaurantName: string;
  onSubmitted?: () => void;
}

type FormState = 'cta' | 'form' | 'submitting' | 'submitted' | 'already_submitted';

type Ratings = {
  toddler_friendliness: number;
  noise_tolerance: number;
  family_space: number;
};

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-stone-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star === value ? 0 : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-transform active:scale-90"
          >
            <svg
              className={`w-7 h-7 transition-colors ${
                star <= (hovered || value)
                  ? 'text-amber-400'
                  : 'text-stone-200'
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DetailedSubmissionForm({
  restaurantId,
  restaurantName,
  onSubmitted,
}: DetailedSubmissionFormProps) {
  const [state, setState] = useState<FormState>(() =>
    hasRecentSubmission(restaurantId) ? 'already_submitted' : 'cta',
  );
  const [facilities, setFacilities] = useState<Set<DetailedFacility>>(new Set());
  const [experienceTags, setExperienceTags] = useState<Set<DetailedExperienceTag>>(new Set());
  const [ratings, setRatings] = useState<Ratings>({
    toddler_friendliness: 0,
    noise_tolerance: 0,
    family_space: 0,
  });
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggleFacility(f: DetailedFacility) {
    setFacilities((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  function toggleExperience(t: DetailedExperienceTag) {
    setExperienceTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  const hasAnySelection =
    facilities.size > 0 ||
    experienceTags.size > 0 ||
    ratings.toddler_friendliness > 0 ||
    ratings.noise_tolerance > 0 ||
    ratings.family_space > 0;

  async function handleSubmit() {
    if (!hasAnySelection) return;
    setError(null);
    setState('submitting');

    try {
      const res = await fetch('/api/detailed-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          facilities: Array.from(facilities),
          experience_tags: Array.from(experienceTags),
          toddler_friendliness_rating: ratings.toddler_friendliness || null,
          noise_tolerance_rating: ratings.noise_tolerance || null,
          family_space_rating: ratings.family_space || null,
          comment: comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Submission failed');
      }

      markSubmission(restaurantId);
      setState('submitted');
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('form');
    }
  }

  if (state === 'already_submitted') {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center">
        <p className="text-sm text-stone-500">You already added details today. Thank you!</p>
      </div>
    );
  }

  if (state === 'submitted') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-7 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-emerald-800 mb-1">Thanks!</p>
        <p className="text-xs text-emerald-600">Your experience helps other parents.</p>
      </div>
    );
  }

  if (state === 'cta') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-stone-800 mb-0.5">Help other parents</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Visited {restaurantName} with a toddler? Add details to help other parents.
            </p>
          </div>
        </div>
        <button
          onClick={() => setState('form')}
          className="mt-4 w-full py-3.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 active:scale-[0.98] transition-all"
        >
          Add details
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="bg-sky-50 border-b border-sky-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-stone-800">Add details for parents</h3>
        <p className="text-xs text-stone-400 mt-0.5">{restaurantName} · Select everything that applies</p>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <section>
          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Facilities</h4>
          <div className="flex flex-col gap-2">
            {DETAILED_FACILITIES.map((f) => {
              const isOn = facilities.has(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFacility(f)}
                  className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                    isOn
                      ? 'border-sky-400 bg-sky-50'
                      : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      isOn ? 'border-sky-500 bg-sky-500' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {isOn && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm font-medium ${isOn ? 'text-sky-800' : 'text-stone-600'}`}>
                    {FACILITY_LABELS[f]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Experience</h4>
          <div className="flex flex-col gap-2">
            {DETAILED_EXPERIENCE_TAGS.map((t) => {
              const isOn = experienceTags.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleExperience(t)}
                  className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                    isOn
                      ? 'border-sky-400 bg-sky-50'
                      : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      isOn ? 'border-sky-500 bg-sky-500' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {isOn && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm font-medium ${isOn ? 'text-sky-800' : 'text-stone-600'}`}>
                    {EXPERIENCE_LABELS[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Ratings <span className="font-normal normal-case text-stone-400">(optional)</span></h4>
          <div className="divide-y divide-stone-100">
            {RATING_LABELS.map(({ key, label }) => (
              <StarPicker
                key={key}
                label={label}
                value={ratings[key]}
                onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))}
              />
            ))}
          </div>
        </section>

        <section>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
            Anything parents should know? <span className="font-normal normal-case text-stone-400">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="Great for brunch with toddlers. Lots of space for prams."
            rows={3}
            className="w-full text-sm border border-stone-200 rounded-xl px-4 py-3 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent resize-none leading-relaxed"
          />
        </section>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setState('cta')}
            className="px-4 py-3 rounded-xl text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasAnySelection || state === 'submitting'}
            className="flex-1 py-3 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {state === 'submitting' ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
