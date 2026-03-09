import { NextRequest, NextResponse } from 'next/server';
import { searchAllGuildfordVenues } from '@/lib/places';
import { getSupabaseClient } from '@/lib/supabase';

const PEXELS_FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1581554/pexels-photo-1581554.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1590183/pexels-photo-1590183.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/696218/pexels-photo-696218.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1813466/pexels-photo-1813466.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const CAFE_IMAGES = [
  'https://images.pexels.com/photos/1581554/pexels-photo-1581554.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1813466/pexels-photo-1813466.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const PUB_IMAGES = [
  'https://images.pexels.com/photos/1590183/pexels-photo-1590183.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/696218/pexels-photo-696218.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const RESTAURANT_IMAGES = [
  'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2290070/pexels-photo-2290070.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function pickImage(venueType: string, index: number): string {
  const pool =
    venueType === 'cafe' ? CAFE_IMAGES :
    venueType === 'pub' ? PUB_IMAGES :
    RESTAURANT_IMAGES;
  const fallback = PEXELS_FALLBACK_IMAGES;
  return pool[index % pool.length] ?? fallback[index % fallback.length];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

const DETAILS_CONCURRENCY = 5;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY is not configured' }, { status: 500 });
  }

  let body: { target?: number; skip_existing?: boolean } = {};
  try {
    body = await req.json();
  } catch {
  }

  const targetCount = Math.min(body.target ?? 80, 300);
  const skipExisting = body.skip_existing !== false;

  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from('restaurants')
    .select('place_id')
    .not('place_id', 'is', null);

  const existingPlaceIds = new Set((existing ?? []).map((r) => r.place_id as string));

  let places;
  try {
    places = await searchAllGuildfordVenues(apiKey, targetCount);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch from Google Places' },
      { status: 500 },
    );
  }

  const toProcess = skipExisting
    ? places.filter((p) => !existingPlaceIds.has(p.place_id))
    : places;

  if (toProcess.length === 0) {
    return NextResponse.json({
      inserted: 0,
      skipped: places.length,
      message: 'All fetched venues already exist in the database.',
    });
  }

  const inserted: string[] = [];
  const skipped: string[] = [];
  const errors: { name: string; error: string }[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const ingestUrl = `${supabaseUrl}/functions/v1/ingest-restaurant`;

  for (let i = 0; i < toProcess.length; i += DETAILS_CONCURRENCY) {
    const batch = toProcess.slice(i, i + DETAILS_CONCURRENCY);

    await Promise.all(
      batch.map(async (place, batchIdx) => {
        const globalIdx = i + batchIdx;
        try {
          const image_url = pickImage(place.venue_type, globalIdx);

          const res = await fetch(ingestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              place_id: place.place_id,
              name: place.name,
              address: place.address,
              venue_type: place.venue_type,
              google_rating: place.rating,
              google_review_count: place.user_ratings_total,
              image_url,
              force_refresh: true,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            errors.push({ name: place.name, error: `Ingest function error ${res.status}: ${errText}` });
            return;
          }

          const result = await res.json();
          if (result.error) {
            errors.push({ name: place.name, error: result.error });
          } else {
            inserted.push(place.name);
          }
        } catch (err) {
          errors.push({
            name: place.name,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }),
    );
  }

  return NextResponse.json({
    inserted: inserted.length,
    skipped: places.length - toProcess.length,
    errors: errors.length,
    error_details: errors.length > 0 ? errors : undefined,
    inserted_names: inserted,
    message: `Inserted ${inserted.length} new venues. ${places.length - toProcess.length} already existed and were skipped.`,
  });
}

export async function GET() {
  const supabase = getSupabaseClient();
  const { count } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true });

  return NextResponse.json({
    current_count: count ?? 0,
    usage: {
      method: 'POST',
      endpoint: '/api/fetch-places',
      body: {
        target: 'number — how many venues to fetch (default 80, max 300)',
        skip_existing: 'boolean — skip venues already in DB by place_id (default true)',
      },
    },
  });
}
