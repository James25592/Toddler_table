import { NextRequest, NextResponse } from 'next/server';
import { saveParentSubmission } from '@/lib/submissions';
import { SnapshotStatus } from '@/lib/types';
import { VALID_RESTAURANT_IDS } from '@/lib/data';

const VALID_STATUSES = new Set<string>(['available', 'limited', 'unknown', 'not_suitable']);
const SNAPSHOT_CATEGORIES = [
  'high_chair',
  'kids_menu',
  'pram_space',
  'changing_table',
  'noise_level',
  'staff_friendliness',
] as const;

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

    const categoryValues: Partial<Record<(typeof SNAPSHOT_CATEGORIES)[number], SnapshotStatus>> = {};
    for (const cat of SNAPSHOT_CATEGORIES) {
      const val = body[cat];
      if (typeof val === 'string' && VALID_STATUSES.has(val)) {
        categoryValues[cat] = val as SnapshotStatus;
      }
    }

    const hasAnyValue = Object.keys(categoryValues).length > 0;
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null;

    if (!hasAnyValue && !notes) {
      return NextResponse.json(
        { error: 'At least one category or note is required.' },
        { status: 400 },
      );
    }

    const result = await saveParentSubmission({
      restaurant_id: restaurantId,
      ...categoryValues,
      notes: notes || null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Save failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
