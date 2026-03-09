import { NextRequest, NextResponse } from 'next/server';
import { analyseRestaurantReviews, AnalysisError } from '@/lib/analyse';
import { AnalyseRequest } from '@/lib/types';
import { EXAMPLE_REVIEWS } from '@/lib/prompts';

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
    if (err instanceof AnalysisError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 },
      );
    }
    console.error('[analyse-restaurant] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
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
    if (err instanceof AnalysisError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 },
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
