import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface IngestResult {
  id: string;
  name: string;
  website: string | null;
  before: { toddler_score: number; confidence: number; positive_signals: number; negative_signals: number };
  after: { toddler_score: number; confidence: number; positive_signals: number; negative_signals: number } | null;
  website_scraped: boolean;
  error?: string;
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, place_id, website, toddler_score, confidence, positive_signals, negative_signals, google_rating, google_review_count, venue_type, address, image_url')
    .not('website', 'is', null)
    .neq('website', '')
    .limit(100);

  if (error || !restaurants?.length) {
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }

  const shuffled = [...restaurants].sort(() => Math.random() - 0.5).slice(0, 10);

  const results: IngestResult[] = [];

  for (const r of shuffled) {
    const before = {
      toddler_score: Number(r.toddler_score),
      confidence: Number(r.confidence),
      positive_signals: (r.positive_signals as unknown[])?.length ?? 0,
      negative_signals: (r.negative_signals as unknown[])?.length ?? 0,
    };

    try {
      const ingestUrl = `${SUPABASE_URL}/functions/v1/ingest-restaurant`;
      const res = await fetch(ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          restaurant_id: r.id,
          place_id: r.place_id,
          name: r.name,
          address: r.address,
          venue_type: r.venue_type,
          google_rating: r.google_rating,
          google_review_count: r.google_review_count,
          image_url: r.image_url,
          website: r.website,
          force_refresh: false,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        results.push({ id: r.id, name: r.name, website: r.website, before, after: null, website_scraped: false, error: text });
        continue;
      }

      const { data: updated } = await supabase
        .from('restaurants')
        .select('toddler_score, confidence, positive_signals, negative_signals')
        .eq('id', r.id)
        .maybeSingle();

      const after = updated ? {
        toddler_score: Number(updated.toddler_score),
        confidence: Number(updated.confidence),
        positive_signals: (updated.positive_signals as unknown[])?.length ?? 0,
        negative_signals: (updated.negative_signals as unknown[])?.length ?? 0,
      } : null;

      results.push({
        id: r.id,
        name: r.name,
        website: r.website,
        before,
        after,
        website_scraped: !!r.website,
      });
    } catch (err) {
      results.push({
        id: r.id,
        name: r.name,
        website: r.website,
        before,
        after: null,
        website_scraped: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ results });
}
