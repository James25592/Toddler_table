export interface VenueProfileInput {
  name: string;
  primaryType?: string;
  secondaryTypes?: string[];
  price_level?: number | null;
  rating?: number | null;
  user_ratings_total?: number | null;
}

export interface VenueProfile {
  is_casual_dining: boolean;
  is_brunch_spot: boolean;
  is_cafe_style: boolean;
  is_pub_style: boolean;
  is_takeaway_heavy: boolean;
  is_fine_dining: boolean;
  is_likely_family_friendly: boolean;
  likely_noise_tolerant: boolean;
  likely_spacious: boolean;
}

export interface VenueProfileSignal {
  source: 'venue_profile';
  label: string;
  delta: number;
}

const CASUAL_NAME_KEYWORDS = ['kitchen', 'trattoria', 'pizzeria', 'grill', 'bistro', 'brasserie', 'diner', 'eatery'];
const BRUNCH_NAME_KEYWORDS = ['brunch'];
const BAR_NAME_KEYWORDS = ['bar', 'cocktail', 'wine bar', 'lounge'];
const CAFE_TYPES = ['cafe', 'coffee_shop', 'bakery', 'tea_house', 'sandwich_shop'];
const PUB_TYPES = ['bar', 'pub'];
const TAKEAWAY_TYPES = ['fast_food_restaurant', 'meal_takeaway', 'takeaway'];
const FINE_DINING_TYPES = ['fine_dining_restaurant'];

export const VENUE_PROFILE_SCORE_CAP = 1.5;

export function inferVenueProfile(place: VenueProfileInput): VenueProfile {
  const nameLower = place.name.toLowerCase();
  const allTypes = [
    ...(place.primaryType ? [place.primaryType] : []),
    ...(place.secondaryTypes ?? []),
  ].map((t) => t.toLowerCase());

  const is_cafe_style = CAFE_TYPES.some((t) => allTypes.includes(t));
  const is_pub_style = PUB_TYPES.some((t) => allTypes.includes(t));
  const is_takeaway_heavy = TAKEAWAY_TYPES.some((t) => allTypes.includes(t));
  const is_fine_dining =
    FINE_DINING_TYPES.some((t) => allTypes.includes(t)) ||
    (place.price_level != null && place.price_level >= 3);

  const hasBarName = BAR_NAME_KEYWORDS.some((kw) => nameLower.includes(kw));
  const is_brunch_spot = BRUNCH_NAME_KEYWORDS.some((kw) => nameLower.includes(kw));
  const is_casual_dining =
    CASUAL_NAME_KEYWORDS.some((kw) => nameLower.includes(kw)) ||
    (!is_fine_dining && !is_takeaway_heavy && !is_cafe_style && !is_pub_style && !hasBarName);

  const highRatingHighVolume =
    (place.rating ?? 0) >= 4.4 && (place.user_ratings_total ?? 0) > 300;

  const is_likely_family_friendly =
    is_cafe_style ||
    is_pub_style ||
    is_brunch_spot ||
    highRatingHighVolume ||
    (!is_fine_dining && !hasBarName && is_casual_dining);

  const likely_noise_tolerant = is_cafe_style || is_pub_style || is_brunch_spot;

  const likely_spacious =
    (place.price_level == null || place.price_level <= 1) && highRatingHighVolume;

  return {
    is_casual_dining,
    is_brunch_spot,
    is_cafe_style,
    is_pub_style,
    is_takeaway_heavy,
    is_fine_dining,
    is_likely_family_friendly,
    likely_noise_tolerant,
    likely_spacious,
  };
}

export function scoreVenueProfile(
  profile: VenueProfile,
  nameLower: string,
): { adjustment: number; signals: VenueProfileSignal[] } {
  const signals: VenueProfileSignal[] = [];
  let raw = 0;

  if (profile.is_likely_family_friendly) {
    signals.push({ source: 'venue_profile', label: 'Likely family friendly venue type', delta: 0.5 });
    raw += 0.5;
  }
  if (profile.likely_noise_tolerant) {
    signals.push({ source: 'venue_profile', label: 'Venue type typically noise tolerant', delta: 0.4 });
    raw += 0.4;
  }
  if (profile.likely_spacious) {
    signals.push({ source: 'venue_profile', label: 'Venue likely has spacious layout', delta: 0.3 });
    raw += 0.3;
  }
  if (profile.is_fine_dining) {
    signals.push({ source: 'venue_profile', label: 'Fine dining — less toddler friendly', delta: -0.6 });
    raw -= 0.6;
  }

  const hasBarName = ['bar', 'cocktail', 'wine'].some((kw) => nameLower.includes(kw));
  if (hasBarName && !profile.is_pub_style) {
    signals.push({ source: 'venue_profile', label: 'Bar or cocktail venue name — less toddler friendly', delta: -1.0 });
    raw -= 1.0;
  }

  const adjustment = Math.max(-VENUE_PROFILE_SCORE_CAP, Math.min(VENUE_PROFILE_SCORE_CAP, raw));
  return { adjustment, signals };
}
