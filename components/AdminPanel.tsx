'use client';

import { useState } from 'react';
import { Settings, X, RefreshCw, Database, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Loader as Loader2, FlaskConical, TrendingUp, TrendingDown, Minus, Zap, ClipboardList } from 'lucide-react';
import AmenityEditor from './AmenityEditor';

interface FetchResult {
  inserted: number;
  skipped: number;
  errors: number;
  message: string;
  error_details?: { name: string; error: string }[];
  inserted_names?: string[];
}

interface ReanalyseSignals {
  toddler_score: number;
  confidence: number;
  positive_signals: number;
  negative_signals: number;
}

interface ReanalyseResult {
  id: string;
  name: string;
  website: string | null;
  before: ReanalyseSignals;
  after: ReanalyseSignals | null;
  website_scraped: boolean;
  error?: string;
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
  const [reanalyseLoading, setReanalyseLoading] = useState(false);
  const [reanalyseResults, setReanalyseResults] = useState<ReanalyseResult[] | null>(null);
  const [reanalyseError, setReanalyseError] = useState<string | null>(null);
  const [reanalyseAllLoading, setReanalyseAllLoading] = useState(false);
  const [reanalyseAllProgress, setReanalyseAllProgress] = useState<{ processed: number; failed: number; total: number } | null>(null);
  const [reanalyseAllError, setReanalyseAllError] = useState<string | null>(null);
  const [reanalyseAllDone, setReanalyseAllDone] = useState(false);

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

  async function handleReanalyse() {
    setReanalyseLoading(true);
    setReanalyseResults(null);
    setReanalyseError(null);
    try {
      const res = await fetch('/api/reanalyse-sample', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setReanalyseError(data.error ?? 'Unknown error');
      } else {
        setReanalyseResults(data.results);
      }
    } catch (err) {
      setReanalyseError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setReanalyseLoading(false);
    }
  }

  async function handleReanalyseAll() {
    setReanalyseAllLoading(true);
    setReanalyseAllProgress(null);
    setReanalyseAllError(null);
    setReanalyseAllDone(false);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let offset = 0;
    let totalProcessed = 0;
    let totalFailed = 0;

    try {
      while (true) {
        const res = await fetch(`${supabaseUrl}/functions/v1/reanalyse-all-restaurants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ offset }),
        });

        if (!res.ok) {
          const body = await res.text();
          setReanalyseAllError(`Batch at offset ${offset} failed: ${body}`);
          break;
        }

        const data = await res.json();
        totalProcessed += data.processed ?? 0;
        totalFailed += data.failed ?? 0;

        setReanalyseAllProgress({ processed: totalProcessed, failed: totalFailed, total: totalProcessed + totalFailed });

        if (data.next_offset === null || data.next_offset === undefined) {
          setReanalyseAllDone(true);
          break;
        }

        offset = data.next_offset;
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      setReanalyseAllError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setReanalyseAllLoading(false);
    }
  }

  function scoreDelta(before: number, after: number) {
    const d = after - before;
    if (Math.abs(d) < 0.05) return null;
    return d;
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-stone-200 overflow-hidden max-h-[90vh] overflow-y-auto">
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

              <div className="border-t border-stone-100 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                    <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Re-analyse sample</p>
                    <p className="text-xs text-stone-500">Re-run analysis on 10 random restaurants with website scraping</p>
                  </div>
                </div>

                <button
                  onClick={handleReanalyse}
                  disabled={reanalyseLoading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium text-sm rounded-xl px-4 py-2.5 transition-colors"
                >
                  {reanalyseLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Re-analysing (this takes ~30s)...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="w-4 h-4" />
                      Run re-analysis on 10 restaurants
                    </>
                  )}
                </button>

                {reanalyseError && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{reanalyseError}</p>
                  </div>
                )}

                {reanalyseResults && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-stone-600">
                      Results — {reanalyseResults.filter(r => !r.error).length} succeeded, {reanalyseResults.filter(r => r.error).length} failed
                    </p>
                    <div className="border border-stone-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200">
                            <th className="text-left px-3 py-2 font-medium text-stone-600">Restaurant</th>
                            <th className="text-center px-3 py-2 font-medium text-stone-600">Score</th>
                            <th className="text-center px-3 py-2 font-medium text-stone-600">+Signals</th>
                            <th className="text-center px-3 py-2 font-medium text-stone-600">Web</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reanalyseResults.map((r) => {
                            const delta = r.after ? scoreDelta(r.before.toddler_score, r.after.toddler_score) : null;
                            const signalGain = r.after ? r.after.positive_signals - r.before.positive_signals : null;
                            return (
                              <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                                <td className="px-3 py-2.5">
                                  <p className="font-medium text-stone-800 truncate max-w-[160px]">{r.name}</p>
                                  {r.error && <p className="text-red-500 truncate max-w-[160px]">{r.error}</p>}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {r.after ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-stone-700">{r.before.toddler_score.toFixed(1)} → {r.after.toddler_score.toFixed(1)}</span>
                                      {delta !== null ? (
                                        <span className={`flex items-center gap-0.5 font-semibold ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                          {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                        </span>
                                      ) : (
                                        <span className="text-stone-400 flex items-center gap-0.5"><Minus className="w-3 h-3" />no change</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-stone-400">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {signalGain !== null ? (
                                    <span className={`font-semibold ${signalGain > 0 ? 'text-emerald-600' : signalGain < 0 ? 'text-red-500' : 'text-stone-400'}`}>
                                      {signalGain > 0 ? `+${signalGain}` : signalGain === 0 ? '—' : signalGain}
                                    </span>
                                  ) : <span className="text-stone-400">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {r.website_scraped ? (
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" title="Website scraped" />
                                  ) : (
                                    <span className="inline-block w-2 h-2 rounded-full bg-stone-200" title="No website" />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-100 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Manual amenity data</p>
                    <p className="text-xs text-stone-500">Override AI scoring with confirmed amenity facts (treated as 100% accurate)</p>
                  </div>
                </div>
                <AmenityEditor />
              </div>

              <div className="border-t border-stone-100 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Re-analyse all restaurants</p>
                    <p className="text-xs text-stone-500">Re-run full analysis on every restaurant with website scraping</p>
                  </div>
                </div>

                <button
                  onClick={handleReanalyseAll}
                  disabled={reanalyseAllLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium text-sm rounded-xl px-4 py-2.5 transition-colors"
                >
                  {reanalyseAllLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Re-analysing all ({reanalyseAllProgress ? `${reanalyseAllProgress.total} done` : 'starting...'})
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Re-analyse all restaurants
                    </>
                  )}
                </button>

                {reanalyseAllProgress && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-600">
                      <span>{reanalyseAllProgress.processed} succeeded</span>
                      {reanalyseAllProgress.failed > 0 && <span className="text-red-500">{reanalyseAllProgress.failed} failed</span>}
                      {reanalyseAllDone && <span className="text-emerald-600 font-medium">Complete</span>}
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${reanalyseAllDone ? 'bg-emerald-500' : 'bg-blue-400'}`}
                        style={{ width: `${Math.min(100, (reanalyseAllProgress.total / 184) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {reanalyseAllDone && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 font-medium">
                      Re-analysis complete — {reanalyseAllProgress?.processed ?? 0} restaurants updated
                    </p>
                  </div>
                )}

                {reanalyseAllError && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{reanalyseAllError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
