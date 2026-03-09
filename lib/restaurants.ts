import { getSupabaseClient } from './supabase';
import { Restaurant, AnalysisSignal, ReviewEvidence } from './types';

interface DbRestaurant {
  id: string;
  place_id: string | null;
  name: string;
  address: string;
  venue_type: string;
  google_rating: number;
  google_review_count: number;
  toddler_score: number;
  confidence: number;
  summary: string;
  image_url: string;
  positive_signals: AnalysisSignal[];
  negative_signals: AnalysisSignal[];
  evidence_quotes: string[] | null;
  ai_negative_signals: string[] | null;
  toddler_features: Record<string, unknown>;
  review_evidence: ReviewEvidence[] | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  last_review_fetch: string | null;
  last_analysed_at: string | null;
  created_at: string;
  updated_at: string;
}

function dbRowToRestaurant(row: DbRestaurant): Restaurant {
  const restaurant: Restaurant = {
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.venue_type as Restaurant['type'],
    googleRating: Number(row.google_rating),
    googleReviewCount: row.google_review_count,
    toddlerScore: Number(row.toddler_score),
    confidence: Number(row.confidence),
    summary: row.summary,
    image: row.image_url,
    positiveSignals: (row.positive_signals as AnalysisSignal[]) ?? [],
    negativeSignals: (row.negative_signals as AnalysisSignal[]) ?? [],
    reviewEvidence: (row.review_evidence as ReviewEvidence[]) ?? [],
    evidence_quotes: row.evidence_quotes ?? [],
    ai_negative_signals: row.ai_negative_signals ?? [],
    website: row.website ?? undefined,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  };
  (restaurant as unknown as { toddler_features: Record<string, unknown> }).toddler_features =
    row.toddler_features ?? {};
  return restaurant;
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('toddler_score', { ascending: false });

  if (error) {
    console.error('[restaurants] Failed to fetch restaurants:', error.message);
    return [];
  }

  return (data ?? []).map(dbRowToRestaurant);
}

export async function getRestaurantByIdFromDb(id: string): Promise<Restaurant | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[restaurants] Failed to fetch restaurant:', error.message);
    return null;
  }

  if (!data) return null;
  return dbRowToRestaurant(data as DbRestaurant);
}

export async function getAllRestaurantIds(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('id');

  if (error) {
    console.error('[restaurants] Failed to fetch restaurant ids:', error.message);
    return [];
  }

  return (data ?? []).map((r) => r.id);
}
