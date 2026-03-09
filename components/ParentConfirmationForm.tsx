'use client';

import { useState } from 'react';
import { CONFIRMATION_FEATURES, ConfirmationFeature } from '@/lib/types';

const FEATURE_LABELS: Record<ConfirmationFeature, string> = {
  high_chairs: 'High chairs available',
  pram_space: 'Space for prams',
  changing_table: 'Changing table',
  kids_menu: 'Kids menu',
  friendly_staff: 'Friendly staff for children',
  easy_seating: 'Easy to sit with toddlers',
  toddler_tolerant: 'Noisy / toddler tolerant',
};

const SPAM_KEY = (restaurantId: string) => `pc_submitted_${restaurantId}`;
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
  } catch {
    // silently ignore
  }
}

interface ParentConfirmationFormProps {
  restaurantId: string;
  restaurantName: string;
  onSubmitted?: () => void;
}

type FormState = 'question' | 'form' | 'submitting' | 'submitted' | 'already_submitted';

export default function ParentConfirmationForm({
  restaurantId,
  restaurantName,
  onSubmitted,
}: ParentConfirmationFormProps) {
  const [state, setState] = useState<FormState>(() =>
    hasRecentSubmission(restaurantId) ? 'already_submitted' : 'question',
  );
  const [selected, setSelected] = useState<Set<ConfirmationFeature>>(new Set());
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggle(feature: ConfirmationFeature) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(feature)) {
        next.delete(feature);
      } else {
        next.add(feature);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) return;

    setError(null);
    setState('submitting');

    try {
      const res = await fetch('/api/confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          confirmed_features: Array.from(selected),
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
        <p className="text-sm text-stone-500">You already shared info about this place today. Thank you!</p>
      </div>
    );
  }

  if (state === 'submitted') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-emerald-800 mb-1">Thank you!</p>
        <p className="text-xs text-emerald-600">Your confirmation helps other Guildford parents plan their visit.</p>
      </div>
    );
  }

  if (state === 'question') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <p className="text-sm font-semibold text-stone-800 mb-1">Have you visited {restaurantName} with a toddler?</p>
        <p className="text-xs text-stone-400 mb-5">Tap yes to share what you found — takes under 30 seconds.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setState('form')}
            className="flex-1 py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
          >
            Yes, I have
          </button>
          <button
            onClick={() => setState('already_submitted')}
            className="flex-1 py-3.5 rounded-xl bg-stone-100 text-stone-500 text-sm font-medium hover:bg-stone-200 active:scale-95 transition-all"
          >
            Not yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-stone-800 mb-1">What did you find?</h3>
      <p className="text-xs text-stone-400 mb-5">Tap everything that applies at {restaurantName}.</p>

      <div className="flex flex-col gap-2.5 mb-5">
        {CONFIRMATION_FEATURES.map((feature) => {
          const isSelected = selected.has(feature);
          return (
            <button
              key={feature}
              type="button"
              onClick={() => toggle(feature)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-stone-200 bg-stone-50 hover:border-stone-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-stone-300 bg-white'
                }`}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`text-sm font-medium ${isSelected ? 'text-emerald-800' : 'text-stone-600'}`}>
                {FEATURE_LABELS[feature]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">
          Anything parents should know? <span className="font-normal normal-case text-stone-400">(optional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          placeholder="e.g. High chairs by the window. Ask staff — they're very happy to help."
          rows={3}
          className="w-full text-sm border border-stone-200 rounded-xl px-4 py-3 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent resize-none leading-relaxed"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setState('question')}
          className="px-4 py-3 rounded-xl text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selected.size === 0 || state === 'submitting'}
          className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {state === 'submitting' ? 'Saving…' : `Confirm ${selected.size > 0 ? `${selected.size} thing${selected.size > 1 ? 's' : ''}` : 'selection'}`}
        </button>
      </div>
    </div>
  );
}
