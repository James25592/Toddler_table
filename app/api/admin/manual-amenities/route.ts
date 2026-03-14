import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export interface ManualAmenities {
  high_chairs: boolean | null;
  kids_menu: boolean | null;
  pram_space: boolean | null;
  changing_table: boolean | null;
  outdoor_seating: boolean | null;
  play_area: boolean | null;
  noise_tolerant: boolean | null;
  staff_child_friendly: boolean | null;
  notes: string | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  const supabase = getSupabaseClient();

  let query = supabase
    .from('restaurants')
    .select('id, name, address, toddler_score, manual_amenities')
    .order('name');

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restaurants: data ?? [] });
}

export async function POST(req: Request) {
  let body: { restaurant_id: string; amenities: ManualAmenities };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { restaurant_id, amenities } = body;

  if (!restaurant_id || typeof restaurant_id !== 'string') {
    return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('restaurants')
    .update({ manual_amenities: amenities, updated_at: new Date().toISOString() })
    .eq('id', restaurant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
