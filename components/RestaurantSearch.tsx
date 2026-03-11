'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Restaurant } from '@/lib/types';

interface Props {
  restaurants: Restaurant[];
}

function scoreColor(score: number): string {
  if (score >= 4.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (score >= 3.5) return 'text-lime-700 bg-lime-50 border-lime-200';
  if (score >= 2.5) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function scoreDot(score: number): string {
  if (score >= 4.5) return 'bg-emerald-500';
  if (score >= 3.5) return 'bg-lime-500';
  if (score >= 2.5) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreLabel(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Good';
  if (score >= 2.5) return 'Mixed';
  return 'Poor';
}

export default function RestaurantSearch({ restaurants }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim().length < 2
    ? []
    : restaurants
        .filter((r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.address.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpen();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleOpen, handleClose]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open, handleClose]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 text-xs text-stone-500 bg-stone-100 hover:bg-stone-200 border border-stone-200 hover:border-stone-300 px-3 py-1.5 rounded-full transition-colors group"
        aria-label="Search restaurants"
      >
        <svg className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 transition-colors" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline text-[10px] text-stone-400 bg-white border border-stone-200 rounded px-1 py-0.5 font-mono leading-none">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={handleClose} />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100">
              <svg className="w-4 h-4 text-stone-400 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search restaurants by name or area..."
                className="flex-1 text-sm text-stone-800 placeholder-stone-400 outline-none bg-transparent"
                autoComplete="off"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="w-5 h-5 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <svg className="w-3 h-3 text-stone-500" viewBox="0 0 10 10" fill="none">
                    <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <kbd className="text-[10px] text-stone-400 bg-stone-50 border border-stone-200 rounded px-1.5 py-0.5 font-mono leading-none flex-shrink-0">
                ESC
              </kbd>
            </div>

            {query.trim().length >= 2 && (
              <div className="max-h-[60vh] overflow-y-auto">
                {results.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-stone-400" viewBox="0 0 20 20" fill="none">
                        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M13.5 13.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M7 9h4M9 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-stone-600">No restaurants found</p>
                    <p className="text-xs text-stone-400 mt-1">Try a different name or area</p>
                  </div>
                ) : (
                  <ul className="py-2">
                    {results.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/restaurants/${r.id}`}
                          onClick={handleClose}
                          className="flex items-center gap-3.5 px-4 py-3 hover:bg-stone-50 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                            <img
                              src={r.image}
                              alt={r.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-800 truncate group-hover:text-emerald-700 transition-colors">
                              {r.name}
                            </p>
                            <p className="text-xs text-stone-400 truncate mt-0.5">{r.address}</p>
                          </div>

                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${scoreColor(r.toddlerScore)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${scoreDot(r.toddlerScore)}`} />
                              {r.toddlerScore.toFixed(1)}
                            </div>
                            <p className={`text-[10px] font-medium ${
                              r.toddlerScore >= 4.5 ? 'text-emerald-600' :
                              r.toddlerScore >= 3.5 ? 'text-lime-600' :
                              r.toddlerScore >= 2.5 ? 'text-amber-600' : 'text-red-500'
                            }`}>
                              {scoreLabel(r.toddlerScore)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {results.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/50">
                    <p className="text-xs text-stone-400">
                      {results.length} result{results.length !== 1 ? 's' : ''} &mdash; click to view full details
                    </p>
                  </div>
                )}
              </div>
            )}

            {query.trim().length < 2 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-stone-400">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
