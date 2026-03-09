import { NextRequest, NextResponse } from 'next/server';
import { generateToddlerCardSummary, AnalysisError } from '@/lib/analyse';
import { getSupabaseClient } from '@/lib/supabase';
import { aggregateConfirmations } from '@/lib/confirmations';
import { aggregateDetailedSubmissions } from '@/lib/detailedSubmissions';
import { ToddlerSummaryInput } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  let body: { restaurantId?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { restaurantId, force = false } = body;

  if (!restaurantId || typeof restaurantId !== 'string') {
    return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  const { data: row, error: fetchError } = await supabase
    .from('restaurants')
    .select('id, name, toddler_features, evidence_quotes, ai_negative_signals, toddler_summary')
    .eq('id', restaurantId)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  if (row.toddler_summary && !force) {
    return NextResponse.json({ summary: row.toddler_summary, cached: true });
  }

  const [confirmationsRes, detailedRes] = await Promise.all([
    supabase.from('parent_confirmations').select('*').eq('restaurant_id', restaurantId),
    supabase.from('parent_detailed_submissions').select('*').eq('restaurant_id', restaurantId),
  ]);

  const confirmationAgg = aggregateConfirmations(confirmationsRes.data ?? []);
  const detailedAgg = aggregateDetailedSubmissions(detailedRes.data ?? []);

  const confirmationFeatures = (Object.entries(confirmationAgg) as [string, number][])
    .filter(([, count]) => count >= 1)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key.replace(/_/g, ' '));

  const confirmedFacilities = (Object.entries(detailedAgg.facilities) as [string, number][])
    .filter(([, count]) => count >= 1)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key.replace(/_/g, ' '));

  const input: ToddlerSummaryInput = {
    features: (row.toddler_features ?? {}) as Record<string, boolean | 'unknown'>,
    evidenceQuotes: (row.evidence_quotes ?? []) as string[],
    negativeSignals: (row.ai_negative_signals ?? []) as string[],
    confirmationFeatures,
    confirmedFacilities,
  };

  try {
    const summary = await generateToddlerCardSummary(input);

    if (summary) {
      await supabase
        .from('restaurants')
        .update({ toddler_summary: summary })
        .eq('id', restaurantId);
    }

    return NextResponse.json({ summary, cached: false });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 500 });
    }
    console.error('[generate-toddler-summary] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET() {
  const supabase = getSupabaseClient();
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, toddler_summary');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    restaurants: (restaurants ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      has_summary: !!r.toddler_summary,
      summary: r.toddler_summary,
    })),
  });
}
