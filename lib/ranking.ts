import { Restaurant, DetailedAggregation, ConfirmationFeature, DetailedFacility, DetailedExperienceTag, VenueType } from './types';
import { aggregateConfirmations } from './confirmations';
import { aggregateDetailedSubmissions } from './detailedSubmissions';
import { getSupabaseClient } from './supabase';

export type { VenueType };

export const VENUE_TYPE_OPTIONS: { key: VenueType; label: string }[] = [
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'pub', label: 'Pub' },
  { key: 'bakery', label: 'Bakery' },
];

export type ActiveFilter =
  | 'high_chairs'
  | 'pram_space'
  | 'changing_table'
  | 'kids_menu'
  | 'outdoor_seating'
  | 'play_area'
  | 'friendly_staff'
  | 'relaxed_atmosphere'
  | 'noise_tolerant';

export interface FilterOption {
  key: ActiveFilter;
  label: string;
  group: 'facilities' | 'experience';
}

export const FILTER_OPTIONS: FilterOption[] = [
  { key: 'high_chairs', label: 'High chairs', group: 'facilities' },
  { key: 'pram_space', label: 'Space for prams', group: 'facilities' },
  { key: 'changing_table', label: 'Changing table', group: 'facilities' },
  { key: 'kids_menu', label: 'Kids menu', group: 'facilities' },
  { key: 'outdoor_seating', label: 'Outdoor seating', group: 'facilities' },
  { key: 'play_area', label: 'Play area', group: 'facilities' },
  { key: 'friendly_staff', label: 'Staff friendly to children', group: 'experience' },
  { key: 'relaxed_atmosphere', label: 'Relaxed atmosphere', group: 'experience' },
  { key: 'noise_tolerant', label: 'Noise tolerant', group: 'experience' },
];

export const FILTER_OPTIONS_BY_GROUP = {
  facilities: FILTER_OPTIONS.filter((f) => f.group === 'facilities'),
  experience: FILTER_OPTIONS.filter((f) => f.group === 'experience'),
};

export interface RankedRestaurant {
  restaurant: Restaurant;
  finalScore: number;
  confirmationCount: number;
  topConfirmedFeatures: ConfirmationFeature[];
  detailedAggregation: DetailedAggregation;
  confirmedFacilities: DetailedFacility[];
  confirmedExperienceTags: DetailedExperienceTag[];
}

export function filterByVenueTypes(
  ranked: RankedRestaurant[],
  types: VenueType[],
): RankedRestaurant[] {
  if (types.length === 0) return ranked;
  return ranked.filter(({ restaurant }) => types.includes(restaurant.type));
}

function computeFinalScore(
  toddlerScore: number,
  confirmationCount: number,
  detailedAggregation: DetailedAggregation,
): number {
  const confirmationBonus = Math.min(confirmationCount * 0.05, 0.5);

  const avgRatings = [
    detailedAggregation.avg_toddler_friendliness,
    detailedAggregation.avg_noise_tolerance,
    detailedAggregation.avg_family_space,
  ].filter((v): v is number => v !== null);

  let parentRatingBonus = 0;
  if (avgRatings.length > 0 && detailedAggregation.total_responders >= 2) {
    const avgParent = avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length;
    parentRatingBonus = ((avgParent - 2.5) / 2.5) * 0.25;
  }

  return Math.min(5, Math.max(0, toddlerScore + confirmationBonus + parentRatingBonus));
}

function getTopConfirmedFeatures(
  aggregation: Record<ConfirmationFeature, number>,
  minCount = 1,
): ConfirmationFeature[] {
  return (Object.entries(aggregation) as [ConfirmationFeature, number][])
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([key]) => key);
}

function getConfirmedFacilities(
  agg: DetailedAggregation,
  minCount = 1,
): DetailedFacility[] {
  return (Object.entries(agg.facilities) as [DetailedFacility, number][])
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key);
}

function getConfirmedExperienceTags(
  agg: DetailedAggregation,
  minCount = 1,
): DetailedExperienceTag[] {
  return (Object.entries(agg.experience_tags) as [DetailedExperienceTag, number][])
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key);
}

function getToddlerFeatureValue(
  restaurant: Restaurant,
  key: string,
): boolean {
  const features = (restaurant as unknown as { toddler_features?: Record<string, unknown> })
    .toddler_features ?? {};
  return features[key] === true;
}

export async function buildRankedRestaurants(
  restaurants: Restaurant[],
): Promise<RankedRestaurant[]> {
  const supabase = getSupabaseClient();

  const ids = restaurants.map((r) => r.id);

  const [confirmationsRes, detailedRes] = await Promise.all([
    supabase
      .from('parent_confirmations')
      .select('*')
      .in('restaurant_id', ids),
    supabase
      .from('parent_detailed_submissions')
      .select('*')
      .in('restaurant_id', ids),
  ]);

  const allConfirmations = confirmationsRes.data ?? [];
  const allDetailed = detailedRes.data ?? [];

  const ranked = restaurants.map((restaurant) => {
    const restaurantConfirmations = allConfirmations.filter(
      (c) => c.restaurant_id === restaurant.id,
    );
    const restaurantDetailed = allDetailed.filter(
      (d) => d.restaurant_id === restaurant.id,
    );

    const confirmationAgg = aggregateConfirmations(restaurantConfirmations);
    const detailedAggregation = aggregateDetailedSubmissions(restaurantDetailed);
    const confirmationCount = restaurantConfirmations.length;

    const finalScore = computeFinalScore(
      restaurant.toddlerScore,
      confirmationCount,
      detailedAggregation,
    );

    const topConfirmedFeatures = getTopConfirmedFeatures(confirmationAgg);
    const confirmedFacilities = getConfirmedFacilities(detailedAggregation);
    const confirmedExperienceTags = getConfirmedExperienceTags(detailedAggregation);

    return {
      restaurant,
      finalScore,
      confirmationCount,
      topConfirmedFeatures,
      detailedAggregation,
      confirmedFacilities,
      confirmedExperienceTags,
    };
  });

  return ranked.sort((a, b) => b.finalScore - a.finalScore);
}

export function filterRanked(
  ranked: RankedRestaurant[],
  filters: ActiveFilter[],
): RankedRestaurant[] {
  if (filters.length === 0) return ranked;

  return ranked.filter(({ restaurant, topConfirmedFeatures, confirmedFacilities, confirmedExperienceTags }) => {
    return filters.every((f) => {
      switch (f) {
        case 'outdoor_seating':
        case 'play_area':
          return confirmedFacilities.includes(f as DetailedFacility);

        case 'high_chairs':
          return (
            topConfirmedFeatures.includes('high_chairs') ||
            confirmedFacilities.includes('high_chairs') ||
            getToddlerFeatureValue(restaurant, 'high_chairs')
          );

        case 'pram_space':
          return (
            topConfirmedFeatures.includes('pram_space') ||
            confirmedFacilities.includes('pram_space') ||
            getToddlerFeatureValue(restaurant, 'pram_space')
          );

        case 'changing_table':
          return (
            topConfirmedFeatures.includes('changing_table') ||
            confirmedFacilities.includes('changing_table') ||
            getToddlerFeatureValue(restaurant, 'changing_table')
          );

        case 'kids_menu':
          return (
            topConfirmedFeatures.includes('kids_menu') ||
            confirmedFacilities.includes('kids_menu') ||
            getToddlerFeatureValue(restaurant, 'kids_menu')
          );

        case 'friendly_staff':
          return (
            topConfirmedFeatures.includes('friendly_staff') ||
            confirmedExperienceTags.includes('friendly_staff') ||
            getToddlerFeatureValue(restaurant, 'staff_child_friendly')
          );

        case 'relaxed_atmosphere':
          return (
            confirmedExperienceTags.includes('relaxed_atmosphere') ||
            topConfirmedFeatures.includes('toddler_tolerant') ||
            getToddlerFeatureValue(restaurant, 'noise_tolerant')
          );

        case 'noise_tolerant':
          return (
            confirmedExperienceTags.includes('toddler_tolerant') ||
            getToddlerFeatureValue(restaurant, 'noise_tolerant')
          );

        default:
          return true;
      }
    });
  });
}
