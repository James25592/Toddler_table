import {
  DETAILED_FACILITIES,
  DETAILED_EXPERIENCE_TAGS,
  DetailedFacility,
  DetailedExperienceTag,
  DetailedAggregation,
  ParentDetailedSubmission,
} from './types';
import { getSupabaseClient } from './supabase';

const VALID_FACILITIES = new Set<string>(DETAILED_FACILITIES);
const VALID_EXPERIENCE_TAGS = new Set<string>(DETAILED_EXPERIENCE_TAGS);

export async function fetchDetailedSubmissions(
  restaurantId: string,
): Promise<ParentDetailedSubmission[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('parent_detailed_submissions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[detailedSubmissions] fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as ParentDetailedSubmission[];
}

export async function saveDetailedSubmission(
  submission: Omit<ParentDetailedSubmission, 'id' | 'created_at'>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const facilities = submission.facilities.filter((f) => VALID_FACILITIES.has(f));
  const experienceTags = submission.experience_tags.filter((t) =>
    VALID_EXPERIENCE_TAGS.has(t),
  );

  if (facilities.length === 0 && experienceTags.length === 0) {
    return { success: false, error: 'Please select at least one option.' };
  }

  const clamp = (n: number | null | undefined) =>
    n != null && n >= 1 && n <= 5 ? n : null;

  const { error } = await supabase.from('parent_detailed_submissions').insert({
    restaurant_id: submission.restaurant_id,
    facilities,
    experience_tags: experienceTags,
    toddler_friendliness_rating: clamp(submission.toddler_friendliness_rating),
    noise_tolerance_rating: clamp(submission.noise_tolerance_rating),
    family_space_rating: clamp(submission.family_space_rating),
    comment: submission.comment?.trim().slice(0, 500) || null,
  });

  if (error) {
    console.error('[detailedSubmissions] save failed:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function aggregateDetailedSubmissions(
  submissions: ParentDetailedSubmission[],
): DetailedAggregation {
  const facilities = Object.fromEntries(
    DETAILED_FACILITIES.map((f) => [f, 0]),
  ) as Record<DetailedFacility, number>;

  const experience_tags = Object.fromEntries(
    DETAILED_EXPERIENCE_TAGS.map((t) => [t, 0]),
  ) as Record<DetailedExperienceTag, number>;

  for (const s of submissions) {
    for (const f of s.facilities) {
      if (f in facilities) facilities[f as DetailedFacility]++;
    }
    for (const t of s.experience_tags) {
      if (t in experience_tags) experience_tags[t as DetailedExperienceTag]++;
    }
  }

  return {
    facilities,
    experience_tags,
    avg_toddler_friendliness: avg(submissions.map((s) => s.toddler_friendliness_rating)),
    avg_noise_tolerance: avg(submissions.map((s) => s.noise_tolerance_rating)),
    avg_family_space: avg(submissions.map((s) => s.family_space_rating)),
    total_responders: submissions.length,
  };
}
