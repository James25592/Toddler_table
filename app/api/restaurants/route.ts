import { NextResponse } from 'next/server';
import { fetchGuildfordRestaurants } from '@/lib/places';

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_PLACES_API_KEY is not configured' },
      { status: 500 },
    );
  }

  try {
    const restaurants = await fetchGuildfordRestaurants(apiKey);
    return NextResponse.json({ restaurants });
  } catch (err) {
    console.error('[api/restaurants]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
