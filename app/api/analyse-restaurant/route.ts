import { NextRequest, NextResponse } from 'next/server';
import { analyseRestaurantReviews } from '@/lib/analyse';
import { AnalyseRequest } from '@/lib/types';
import { EXAMPLE_REVIEWS } from '@/lib/prompts';

const FALLBACK_RESPONSE = {
  positive_signals: [],
  negative_signals: [],
  toddler_score: 2.5,
  confidence: 0.1,
  summary: 'Not enough information yet.',
  _filtered_sentences: [],
};

type ReviewSource = 'filtered' | 'fallback';

export async function POST(req: NextRequest) {
  let body: AnalyseRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { restaurantName, reviews, place_id, review_source: bodySource } = body;

  if (!restaurantName || typeof restaurantName !== 'string') {
    return NextResponse.json(
      { error: 'restaurantName is required and must be a string' },
      { status: 400 },
    );
  }

  if (!Array.isArray(reviews)) {
    return NextResponse.json(
      { error: 'reviews must be an array of strings' },
      { status: 400 },
    );
  }

  const review_source: ReviewSource = bodySource === 'fallback' ? 'fallback' : 'filtered';

  try {
    const result = await analyseRestaurantReviews(reviews, review_source, place_id, restaurantName);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[analyse-restaurant] Unexpected error${place_id ? ` (place_id: ${place_id})` : ''}:`, err);
    return NextResponse.json(FALLBACK_RESPONSE);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const useExample = searchParams.get('example') === 'true';

  if (!useExample) {
    return NextResponse.json(
      {
        usage: {
          method: 'POST',
          endpoint: '/api/analyse-restaurant',
          body: {
            restaurantName: 'string — name of the venue',
            reviews: 'string[] — array of review texts to analyse',
          },
          example_get: 'GET /api/analyse-restaurant?example=true — runs analysis on built-in example reviews',
        },
      },
      { status: 200 },
    );
  }

  try {
    const result = await analyseRestaurantReviews(EXAMPLE_REVIEWS, 'filtered');
    return NextResponse.json({
      _meta: {
        note: 'This is an example run using built-in mock reviews.',
        reviews_used: EXAMPLE_REVIEWS,
      },
      ...result,
    });
  } catch (err) {
    console.error('[analyse-restaurant] GET example failed:', err);
    return NextResponse.json({
      _meta: { note: 'Analysis failed — returning fallback.' },
      ...FALLBACK_RESPONSE,
    });
  }
}
