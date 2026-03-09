import { ParentSubmission, SnapshotStatus } from './types';
import { getSupabaseClient } from './supabase';

export async function fetchSubmissionsForRestaurant(
  restaurantId: string,
): Promise<ParentSubmission[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('parent_submissions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[submissions] Failed to fetch:', error.message);
    return [];
  }

  return (data ?? []) as ParentSubmission[];
}

export async function saveParentSubmission(
  submission: Omit<ParentSubmission, 'id' | 'created_at'>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const VALID_STATUSES = new Set<string>(['available', 'limited', 'unknown', 'not_suitable']);
  const categories = [
    'high_chair',
    'kids_menu',
    'pram_space',
    'changing_table',
    'noise_level',
    'staff_friendliness',
  ] as const;

  const sanitised: Record<string, unknown> = {
    restaurant_id: submission.restaurant_id,
    notes: submission.notes ?? null,
  };

  for (const cat of categories) {
    const val = submission[cat];
    sanitised[cat] = val && VALID_STATUSES.has(val as string) ? val : null;
  }

  const { error } = await supabase.from('parent_submissions').insert(sanitised);

  if (error) {
    console.error('[submissions] Failed to save:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
