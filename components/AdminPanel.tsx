'use client';

import { useState } from 'react';
import { Settings, X, RefreshCw, Database, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react';

interface FetchResult {
  inserted: number;
  skipped: number;
  errors: number;
  message: string;
  error_details?: { name: string; error: string }[];
  inserted_names?: string[];
}

export default function AdminPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState(80);
  const [skipExisting, setSkipExisting] = useState(true);
  const [dbCount, setDbCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  async function fetchDbCount() {
    setLoadingCount(true);
    try {
      const res = await fetch('/api/fetch-places');
      const data = await res.json();
      setDbCount(data.current_count ?? null);
    } catch {
      setDbCount(null);
    } finally {
      setLoadingCount(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setResult(null);
    setError(null);
    fetchDbCount();
  }

  async function handleFetch() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/fetch-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, skip_existing: skipExisting }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Unknown error');
      } else {
        setResult(data);
        fetchDbCount();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        title="Admin"
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-stone-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-stone-600" />
                </div>
                <span className="font-semibold text-stone-900 text-sm">Admin Panel</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3 border border-stone-100">
                <Database className="w-4 h-4 text-stone-500 shrink-0" />
                <div className="text-sm text-stone-600">
                  Restaurants in database:&nbsp;
                  {loadingCount ? (
                    <span className="text-stone-400">loading...</span>
                  ) : dbCount !== null ? (
                    <span className="font-semibold text-stone-900">{dbCount}</span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Venues to fetch (max 300)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={target}
                    onChange={(e) => setTarget(Math.min(300, Math.max(1, Number(e.target.value))))}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setSkipExisting((v) => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${skipExisting ? 'bg-emerald-500' : 'bg-stone-200'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${skipExisting ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </div>
                  <span className="text-sm text-stone-700">Skip already-ingested venues</span>
                </label>
              </div>

              <button
                onClick={handleFetch}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium text-sm rounded-xl px-4 py-2.5 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching venues...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Fetch from Google Places
                  </>
                )}
              </button>

              {result && (
                <div className={`border rounded-xl px-4 py-3 space-y-2 ${result.errors > 0 && result.inserted === 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className={`flex items-center gap-2 font-medium text-sm ${result.errors > 0 && result.inserted === 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    <CheckCircle className="w-4 h-4" />
                    Done
                  </div>
                  <p className={`text-xs ${result.errors > 0 && result.inserted === 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{result.message}</p>
                  {result.errors > 0 && result.error_details && (
                    <div className="space-y-1 pt-1 border-t border-amber-200">
                      <p className="text-xs font-medium text-amber-700">{result.errors} error(s):</p>
                      {result.error_details.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-xs text-amber-600 truncate"><span className="font-medium">{e.name}:</span> {e.error}</p>
                      ))}
                      {result.error_details.length > 5 && (
                        <p className="text-xs text-amber-500">...and {result.error_details.length - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
