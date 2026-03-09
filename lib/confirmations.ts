import {
  CONFIRMATION_FEATURES,
  ConfirmationFeature,
  FeatureAggregation,
  ParentConfirmation,
} from './types';
import { getSupabaseClient } from './supabase';

const VALID_FEATURES = new Set<string>(CONFIRMATION_FEATURES);

export async function fetchConfirmationsForRestaurant(
  restaurantId: string,
): Promise<ParentConfirmation[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('parent_confirmations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[confirmations] Failed to fetch:', error.message);
    return [];
  }

  return (data ?? []) as ParentConfirmation[];
}

export async function saveParentConfirmation(
  confirmation: Omit<ParentConfirmation, 'id' | 'created_at'>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const sanitisedFeatures = confirmation.confirmed_features.filter((f) =>
    VALID_FEATURES.has(f),
  );

  if (sanitisedFeatures.length === 0) {
    return { success: false, error: 'At least one feature must be selected.' };
  }

  const { error } = await supabase.from('parent_confirmations').insert({
    restaurant_id: confirmation.restaurant_id,
    confirmed_features: sanitisedFeatures,
    comment: confirmation.comment?.trim() || null,
  });

  if (error) {
    console.error('[confirmations] Failed to save:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export function aggregateConfirmations(
  confirmations: ParentConfirmation[],
): FeatureAggregation {
  const counts = Object.fromEntries(
    CONFIRMATION_FEATURES.map((f) => [f, 0]),
  ) as FeatureAggregation;

  for (const c of confirmations) {
    for (const feature of c.confirmed_features) {
      if (feature in counts) {
        counts[feature as ConfirmationFeature]++;
      }
    }
  }

  return counts;
}
