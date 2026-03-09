import { NextRequest, NextResponse } from 'next/server';
import { saveParentConfirmation } from '@/lib/confirmations';
import { CONFIRMATION_FEATURES, ConfirmationFeature } from '@/lib/types';
import { VALID_RESTAURANT_IDS } from '@/lib/data';

const VALID_FEATURES = new Set<string>(CONFIRMATION_FEATURES);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const restaurantId = typeof body.restaurant_id === 'string' ? body.restaurant_id.trim() : '';
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }
    if (!VALID_RESTAURANT_IDS.has(restaurantId)) {
      return NextResponse.json({ error: 'Unknown restaurant_id' }, { status: 400 });
    }

    const rawFeatures: unknown[] = Array.isArray(body.confirmed_features)
      ? body.confirmed_features
      : [];

    const confirmedFeatures = rawFeatures.filter(
      (f): f is ConfirmationFeature => typeof f === 'string' && VALID_FEATURES.has(f),
    );

    if (confirmedFeatures.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid feature must be confirmed.' },
        { status: 400 },
      );
    }

    const comment =
      typeof body.comment === 'string' ? body.comment.slice(0, 500) : undefined;

    const result = await saveParentConfirmation({
      restaurant_id: restaurantId,
      confirmed_features: confirmedFeatures,
      comment,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Save failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
