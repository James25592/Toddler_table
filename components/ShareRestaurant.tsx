'use client';

import { useState } from 'react';
import { Restaurant, DetailedAggregation } from '@/lib/types';

interface ShareRestaurantProps {
  restaurant: Restaurant;
  aggregation: DetailedAggregation;
  confirmationCount: number;
  pageUrl: string;
}

function buildShareMessage(
  restaurant: Restaurant,
  aggregation: DetailedAggregation,
  confirmationCount: number,
  pageUrl: string,
): string {
  const lines: string[] = [];

  lines.push('Great toddler-friendly spot in Guildford:');
  lines.push('');
  lines.push(restaurant.name);
  lines.push(`\u2B50 ${restaurant.toddlerScore.toFixed(1)} toddler score`);
  lines.push('');

  const features: string[] = [];
  if (aggregation.facilities.high_chairs >= 1) features.push('\u2714 High chairs confirmed');
  if (aggregation.facilities.pram_space >= 1) features.push('\u2714 Space for prams');
  if (aggregation.facilities.kids_menu >= 1) features.push('\u2714 Kids menu available');
  if (aggregation.facilities.play_area >= 1) features.push('\u2714 Play area');
  if (aggregation.facilities.outdoor_seating >= 1) features.push('\u2714 Outdoor seating');
  if (aggregation.experience_tags.relaxed_atmosphere >= 1) features.push('\u2714 Relaxed for toddlers');
  if (aggregation.experience_tags.friendly_staff >= 1) features.push('\u2714 Child-friendly staff');

  if (features.length > 0) {
    lines.push(...features.slice(0, 4));
    lines.push('');
  }

  if (confirmationCount > 0) {
    lines.push(`\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 Confirmed by ${confirmationCount} parent${confirmationCount !== 1 ? 's' : ''}`);
    lines.push('');
  }

  lines.push('See details or add your experience:');
  lines.push(pageUrl);

  return lines.join('\n');
}

type CopyState = 'idle' | 'copying' | 'done';

export default function ShareRestaurant({
  restaurant,
  aggregation,
  confirmationCount,
  pageUrl,
}: ShareRestaurantProps) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const message = buildShareMessage(restaurant, aggregation, confirmationCount, pageUrl);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const el = document.createElement('textarea');
      el.value = message;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopyState('done');
    setTimeout(() => setCopyState('idle'), 3000);
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${restaurant.name} — Toddler-friendly in Guildford`,
          text: message,
          url: pageUrl,
        });
        return;
      } catch {
        // user cancelled or API unavailable — fall through to copy
      }
    }
    await copyToClipboard();
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">Share with other parents</p>
          <p className="text-xs text-stone-400 mt-0.5">WhatsApp, parent groups, or copy to clipboard</p>
        </div>
        <svg
          className={`w-4 h-4 text-stone-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4 space-y-4">
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Message preview</p>
            <pre className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap font-sans">{message}</pre>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleShare}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>

            <button
              onClick={copyToClipboard}
              disabled={copyState === 'copying'}
              className={`flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all ${
                copyState === 'done'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              {copyState === 'done' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy message
                </>
              )}
            </button>
          </div>

          {copyState === 'done' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-700 font-medium">Copied! Share it in your parent groups.</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 px-3 py-1.5 rounded-full transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <span className="text-xs text-stone-400">or use the copy button above for other apps</span>
          </div>
        </div>
      )}
    </div>
  );
}
