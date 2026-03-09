import { RestaurantAnalysisInput } from '@/lib/types';

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';
const REVIEW_CONCURRENCY = 5;

export const TODDLER_KEYWORDS = [
  'kid',
  'kids',
  'child',
  'children',
  'toddler',
  'baby',
  'family',
  'pram',
  'pushchair',
  'buggy',
  'high chair',
  'highchair',
  'kids menu',
  'family friendly',
  'space for pram',
];

const SEARCH_QUERIES = [
  'restaurants in Guildford UK',
  'cafes in Guildford UK',
  'family restaurants Guildford',
  'pubs with food Guildford UK',
  'brunch Guildford UK',
  'pizza Guildford UK',
  'Indian restaurant Guildford UK',
  'Italian restaurant Guildford UK',
  'Chinese restaurant Guildford UK',
  'Japanese restaurant Guildford UK',
  'Thai restaurant Guildford UK',
  'Mexican restaurant Guildford UK',
  'burger restaurant Guildford UK',
  'sushi Guildford UK',
  'steak restaurant Guildford UK',
  'breakfast cafe Guildford UK',
  'lunch restaurant Guildford UK',
  'takeaway Guildford UK',
  'brasserie Guildford UK',
  'wine bar Guildford UK',
];

export interface PlaceSearchResult {
  name: string;
  place_id: string;
  rating: number;
  user_ratings_total: number;
  address: string;
  lat: number | null;
  lng: number | null;
  venue_type: string;
}

export interface PlaceRestaurant {
  name: string;
  place_id: string;
  rating: number;
  total_reviews: number;
  filtered_reviews: string[];
  all_reviews: string[];
  address: string;
  lat: number | null;
  lng: number | null;
  venue_type: string;
}

function filterToddlerReviews(reviews: string[]): string[] {
  return reviews.filter((review) => {
    const lower = review.toLowerCase();
    return TODDLER_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

function inferVenueType(types: string[] = []): string {
  if (types.includes('cafe') || types.includes('coffee_shop')) return 'cafe';
  if (types.includes('bar')) return 'pub';
  if (types.includes('bakery')) return 'cafe';
  return 'restaurant';
}

export function buildAnalysisInput(
  name: string,
  rating: number,
  total_reviews: number,
  allReviews: string[],
): RestaurantAnalysisInput {
  const filtered = filterToddlerReviews(allReviews);

  if (filtered.length > 0) {
    return { name, rating, total_reviews, review_source: 'filtered', reviews_to_analyse: filtered };
  }

  return { name, rating, total_reviews, review_source: 'fallback', reviews_to_analyse: allReviews };
}

async function searchByQuery(
  query: string,
  apiKey: string,
  maxPerQuery = 60,
): Promise<PlaceSearchResult[]> {
  const results: PlaceSearchResult[] = [];
  let nextPageToken: string | undefined;

  while (results.length < maxPerQuery) {
    const params = new URLSearchParams({ query, type: 'restaurant', key: apiKey });
    const url = nextPageToken
      ? `${PLACES_API_BASE}/textsearch/json?${params}&pagetoken=${nextPageToken}`
      : `${PLACES_API_BASE}/textsearch/json?${params}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      break;
    }

    for (const place of data.results ?? []) {
      results.push({
        name: place.name,
        place_id: place.place_id,
        rating: place.rating ?? 0,
        user_ratings_total: place.user_ratings_total ?? 0,
        address: place.formatted_address ?? place.vicinity ?? '',
        lat: place.geometry?.location?.lat ?? null,
        lng: place.geometry?.location?.lng ?? null,
        venue_type: inferVenueType(place.types ?? []),
      });
      if (results.length >= maxPerQuery) break;
    }

    nextPageToken = data.next_page_token;
    if (!nextPageToken) break;

    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

export async function searchAllGuildfordVenues(
  apiKey: string,
  targetCount = 100,
): Promise<PlaceSearchResult[]> {
  const seen = new Set<string>();
  const all: PlaceSearchResult[] = [];

  for (const query of SEARCH_QUERIES) {
    if (all.length >= targetCount) break;
    const remaining = targetCount - all.length;
    const maxPerQuery = Math.min(60, remaining + 20);
    const results = await searchByQuery(query, apiKey, maxPerQuery);
    for (const r of results) {
      if (!seen.has(r.place_id)) {
        seen.add(r.place_id);
        all.push(r);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return all.slice(0, targetCount);
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<{ reviews: string[]; website: string | null }> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'reviews,website',
    key: apiKey,
  });

  const res = await fetch(`${PLACES_API_BASE}/details/json?${params}`);
  const data = await res.json();

  if (data.status !== 'OK') {
    return { reviews: [], website: null };
  }

  const reviews: { text?: string }[] = data.result?.reviews ?? [];
  return {
    reviews: reviews.map((r) => r.text ?? '').filter(Boolean),
    website: data.result?.website ?? null,
  };
}

async function withConcurrencyLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<PlaceRestaurant>,
): Promise<PlaceRestaurant[]> {
  const results: PlaceRestaurant[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function fetchGuildfordRestaurants(apiKey: string): Promise<PlaceRestaurant[]> {
  const places = await searchByQuery('restaurants in Guildford UK', apiKey, 40);

  return withConcurrencyLimit(places, REVIEW_CONCURRENCY, async (place) => {
    const { reviews: all_reviews } = await getPlaceDetails(place.place_id, apiKey);
    const filtered_reviews = filterToddlerReviews(all_reviews);

    return {
      name: place.name,
      place_id: place.place_id,
      rating: place.rating,
      total_reviews: place.user_ratings_total,
      filtered_reviews,
      all_reviews,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      venue_type: place.venue_type,
    };
  });
}

export async function fetchVenuesBulk(
  apiKey: string,
  targetCount: number,
): Promise<Array<PlaceSearchResult & { reviews: string[]; website: string | null }>> {
  const places = await searchAllGuildfordVenues(apiKey, targetCount);

  const results: Array<PlaceSearchResult & { reviews: string[]; website: string | null }> = [];
  for (let i = 0; i < places.length; i += REVIEW_CONCURRENCY) {
    const batch = places.slice(i, i + REVIEW_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (place) => {
        const { reviews, website } = await getPlaceDetails(place.place_id, apiKey);
        return { ...place, reviews, website };
      }),
    );
    results.push(...batchResults);
  }

  return results;
}

export function toAnalysisInputs(restaurants: PlaceRestaurant[]): RestaurantAnalysisInput[] {
  return restaurants.map((r) =>
    buildAnalysisInput(r.name, r.rating, r.total_reviews, r.all_reviews),
  );
}
