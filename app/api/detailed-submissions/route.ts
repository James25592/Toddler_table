import { NextRequest, NextResponse } from 'next/server';
import { saveDetailedSubmission } from '@/lib/detailedSubmissions';
import {
  DETAILED_FACILITIES,
  DETAILED_EXPERIENCE_TAGS,
  DetailedFacility,
  DetailedExperienceTag,
} from '@/lib/types';
import { VALID_RESTAURANT_IDS } from '@/lib/data';

const VALID_FACILITIES = new Set<string>(DETAILED_FACILITIES);
const VALID_EXPERIENCE_TAGS = new Set<string>(DETAILED_EXPERIENCE_TAGS);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const restaurantId =
      typeof body.restaurant_id === 'string' ? body.restaurant_id.trim() : '';
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }
    if (!VALID_RESTAURANT_IDS.has(restaurantId)) {
      return NextResponse.json({ error: 'Unknown restaurant_id' }, { status: 400 });
    }

    const facilities = (Array.isArray(body.facilities) ? body.facilities : []).filter(
      (f: unknown): f is DetailedFacility => typeof f === 'string' && VALID_FACILITIES.has(f),
    );

    const experience_tags = (
      Array.isArray(body.experience_tags) ? body.experience_tags : []
    ).filter(
      (t: unknown): t is DetailedExperienceTag =>
        typeof t === 'string' && VALID_EXPERIENCE_TAGS.has(t),
    );

    if (facilities.length === 0 && experience_tags.length === 0) {
      return NextResponse.json(
        { error: 'At least one facility or experience tag is required.' },
        { status: 400 },
      );
    }

    const parseRating = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
    };

    const comment =
      typeof body.comment === 'string' ? body.comment.slice(0, 500) : undefined;

    const result = await saveDetailedSubmission({
      restaurant_id: restaurantId,
      facilities,
      experience_tags,
      toddler_friendliness_rating: parseRating(body.toddler_friendliness_rating),
      noise_tolerance_rating: parseRating(body.noise_tolerance_rating),
      family_space_rating: parseRating(body.family_space_rating),
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
