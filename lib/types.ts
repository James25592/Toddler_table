export type VenueType = 'restaurant' | 'cafe' | 'pub' | 'bakery';

export type ToddlerCategory =
  | 'high chairs available'
  | 'kids menu'
  | 'spacious seating'
  | 'pram or buggy space'
  | 'family friendly atmosphere'
  | 'welcoming staff toward children'
  | 'changing table available'
  | 'noise tolerant'
  | 'cramped seating'
  | 'no space for prams'
  | 'very loud environment'
  | 'staff unfriendly toward children'
  | 'not suitable for children';

export interface AnalysisSignal {
  category: ToddlerCategory | EvidenceCategory;
  evidence: string;
  source?: 'review' | 'web_mention' | 'venue_profile';
}

export interface SignalBreakdown {
  venue_profile: Array<{ label: string; delta: number }>;
  ai_review_signals: AnalysisSignal[];
  parent_confirmations: AnalysisSignal[];
}

export interface AnalysisResult {
  positive_signals: AnalysisSignal[];
  negative_signals: AnalysisSignal[];
  toddler_score: number;
  confidence: number;
  summary: string;
}

export interface AnalyseRequest {
  restaurantName: string;
  reviews: string[];
  place_id?: string;
  review_source?: 'filtered' | 'fallback';
}

export interface RestaurantAnalysisInput {
  name: string;
  rating: number;
  total_reviews: number;
  review_source: 'filtered' | 'fallback';
  reviews_to_analyse: string[];
}

export interface FilterResult {
  relevant_sentences: string[];
}

export type EvidenceCategory =
  | 'high_chair'
  | 'kids_menu'
  | 'pram_space'
  | 'changing_table'
  | 'staff_child_friendly'
  | 'family_friendly'
  | 'noise_issue'
  | 'cramped'
  | 'not_child_friendly';

export interface EvidenceSignal {
  category: EvidenceCategory;
  sentiment: 'positive' | 'negative';
  evidence: string;
  source?: 'review' | 'web_mention';
}

export interface EvidenceExtractionResult {
  evidence: EvidenceSignal[];
}

export type FeaturePresence = true | false | 'unknown';

export interface FeatureEvidence {
  high_chairs: string[];
  pram_space: string[];
  changing_table: string[];
  kids_menu: string[];
  staff_child_friendly: string[];
  noise_tolerant: string[];
  family_friendly: string[];
  spacious: string[];
  accommodating: string[];
  good_for_groups: string[];
  relaxed_atmosphere: string[];
}

export interface StructuredExtractionResult {
  high_chairs: FeaturePresence;
  pram_space: FeaturePresence;
  changing_table: FeaturePresence;
  kids_menu: FeaturePresence;
  staff_child_friendly: FeaturePresence;
  noise_tolerant: FeaturePresence;
  family_friendly: FeaturePresence;
  spacious: FeaturePresence;
  accommodating: FeaturePresence;
  good_for_groups: FeaturePresence;
  relaxed_atmosphere: FeaturePresence;
  negative_signals: string[];
  evidence_quotes: string[];
  feature_evidence: FeatureEvidence;
}

export interface ReviewEvidence {
  text: string;
  author: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  date: string;
}

export type SnapshotStatus = 'available' | 'limited' | 'unknown' | 'not_suitable';

export type StressLevel = 'relaxed' | 'manageable' | 'difficult';

export interface StressResult {
  stress_level: StressLevel;
}

export interface ToddlerSnapshot {
  high_chair: SnapshotStatus;
  kids_menu: SnapshotStatus;
  pram_space: SnapshotStatus;
  changing_table: SnapshotStatus;
  noise_level: SnapshotStatus;
  staff_friendliness: SnapshotStatus;
}

export type SnapshotCategory = keyof ToddlerSnapshot;

export interface ParentSubmission {
  id?: string;
  restaurant_id: string;
  high_chair?: SnapshotStatus | null;
  kids_menu?: SnapshotStatus | null;
  pram_space?: SnapshotStatus | null;
  changing_table?: SnapshotStatus | null;
  noise_level?: SnapshotStatus | null;
  staff_friendliness?: SnapshotStatus | null;
  notes?: string | null;
  created_at?: string;
}

export const CONFIRMATION_FEATURES = [
  'high_chairs',
  'pram_space',
  'changing_table',
  'kids_menu',
  'friendly_staff',
  'easy_seating',
  'toddler_tolerant',
] as const;

export type ConfirmationFeature = typeof CONFIRMATION_FEATURES[number];

export interface ParentConfirmation {
  id?: string;
  restaurant_id: string;
  confirmed_features: ConfirmationFeature[];
  comment?: string | null;
  created_at?: string;
}

export type FeatureAggregation = Record<ConfirmationFeature, number>;

export const DETAILED_FACILITIES = [
  'high_chairs',
  'pram_space',
  'changing_table',
  'kids_menu',
  'outdoor_seating',
  'play_area',
  'baby_friendly_toilets',
] as const;

export const DETAILED_EXPERIENCE_TAGS = [
  'friendly_staff',
  'relaxed_atmosphere',
  'pram_near_table',
  'toddler_tolerant',
] as const;

export type DetailedFacility = typeof DETAILED_FACILITIES[number];
export type DetailedExperienceTag = typeof DETAILED_EXPERIENCE_TAGS[number];

export interface ParentDetailedSubmission {
  id?: string;
  restaurant_id: string;
  facilities: DetailedFacility[];
  experience_tags: DetailedExperienceTag[];
  toddler_friendliness_rating?: number | null;
  noise_tolerance_rating?: number | null;
  family_space_rating?: number | null;
  comment?: string | null;
  created_at?: string;
}

export interface DetailedAggregation {
  facilities: Record<DetailedFacility, number>;
  experience_tags: Record<DetailedExperienceTag, number>;
  avg_toddler_friendliness: number | null;
  avg_noise_tolerance: number | null;
  avg_family_space: number | null;
  total_responders: number;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  type: VenueType;
  googleRating: number;
  googleReviewCount: number;
  toddlerScore: number;
  confidence: number;
  summary: string;
  image: string;
  positiveSignals: AnalysisSignal[];
  negativeSignals: AnalysisSignal[];
  reviewEvidence: ReviewEvidence[];
  evidence_quotes?: string[];
  ai_negative_signals?: string[];
  website?: string;
  lat?: number | null;
  lng?: number | null;
}
