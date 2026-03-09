import { AnalysisResult } from './types';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  place_id: string;
  analysis_result: AnalysisResult & { _filtered_sentences: string[] };
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedAnalysis(
  place_id: string,
): (AnalysisResult & { _filtered_sentences: string[] }) | null {
  const entry = cache.get(place_id);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age >= CACHE_TTL_MS) {
    cache.delete(place_id);
    return null;
  }

  return entry.analysis_result;
}

export function setCachedAnalysis(
  place_id: string,
  analysis_result: AnalysisResult & { _filtered_sentences: string[] },
): void {
  cache.set(place_id, {
    place_id,
    analysis_result,
    timestamp: Date.now(),
  });
}
