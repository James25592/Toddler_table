import { AnalysisSignal, EvidenceExtractionResult, EvidenceSignal, FeatureEvidence, SignalBreakdown, StressLevel, StressResult, StructuredExtractionResult, ToddlerCategory } from './types';
import { VenueProfileSignal } from './venueProfile';

interface ScoringResult {
  positive_signals: AnalysisSignal[];
  negative_signals: AnalysisSignal[];
  toddler_score: number;
  confidence: number;
  signal_breakdown: SignalBreakdown;
}

const SCORE_MAP: Partial<Record<string, { sentiment: 'positive' | 'negative'; delta: number }>> = {
  high_chair:           { sentiment: 'positive', delta: 2 },
  kids_menu:            { sentiment: 'positive', delta: 2 },
  family_friendly:      { sentiment: 'positive', delta: 1 },
  pram_space:           { sentiment: 'positive', delta: 1 },
  staff_child_friendly: { sentiment: 'positive', delta: 1 },
  changing_table:       { sentiment: 'positive', delta: 1 },
  cramped:              { sentiment: 'negative', delta: -2 },
  not_child_friendly:   { sentiment: 'negative', delta: -2 },
  noise_issue:          { sentiment: 'negative', delta: -1 },
};

function confidenceFromCount(count: number): number {
  if (count >= 4) return 0.85;
  if (count >= 2) return 0.6;
  if (count >= 1) return 0.3;
  return 0;
}

function toAnalysisSignal(signal: EvidenceSignal): AnalysisSignal {
  return { category: signal.category, evidence: signal.evidence, source: signal.source };
}

export function scoreEvidenceSignals(input: EvidenceExtractionResult): ScoringResult {
  const positive_signals: AnalysisSignal[] = [];
  const negative_signals: AnalysisSignal[] = [];
  let score = 2.5;

  for (const signal of input.evidence) {
    const rule = SCORE_MAP[signal.category];

    if (rule) {
      const delta = signal.sentiment === 'negative' ? -Math.abs(rule.delta) : Math.abs(rule.delta);
      score += delta;

      if (delta > 0) {
        positive_signals.push(toAnalysisSignal(signal));
      } else {
        negative_signals.push(toAnalysisSignal(signal));
      }
    } else {
      if (signal.sentiment === 'positive') {
        positive_signals.push(toAnalysisSignal(signal));
      } else {
        negative_signals.push(toAnalysisSignal(signal));
      }
    }
  }

  const toddler_score = Math.min(5, Math.max(0, score));
  const confidence = confidenceFromCount(input.evidence.length);

  return {
    positive_signals,
    negative_signals,
    toddler_score,
    confidence,
    signal_breakdown: {
      venue_profile: [],
      ai_review_signals: [...positive_signals, ...negative_signals],
      parent_confirmations: [],
    },
  };
}

const DIFFICULT_CATEGORIES = new Set([
  'cramped',
  'not_child_friendly',
  'cramped seating',
  'not suitable for children',
  'staff unfriendly toward children',
]);

const RELAXED_POSITIVE_CATEGORIES = new Set([
  'pram_space',
  'spacious seating',
  'staff_child_friendly',
  'welcoming staff toward children',
  'family_friendly',
  'family friendly atmosphere',
]);


interface FeatureWeight {
  category: ToddlerCategory;
  delta: number;
  minEvidence: number;
}

const STRUCTURED_POSITIVE_WEIGHTS: Record<string, FeatureWeight> = {
  high_chairs:          { category: 'high chairs available',           delta: 2,   minEvidence: 1 },
  kids_menu:            { category: 'kids menu',                       delta: 2,   minEvidence: 1 },
  pram_space:           { category: 'pram or buggy space',             delta: 1,   minEvidence: 1 },
  changing_table:       { category: 'changing table available',        delta: 1,   minEvidence: 1 },
  staff_child_friendly: { category: 'welcoming staff toward children', delta: 1,   minEvidence: 1 },
  noise_tolerant:       { category: 'noise tolerant',                  delta: 1,   minEvidence: 1 },
  family_friendly:      { category: 'family friendly atmosphere',      delta: 0.5, minEvidence: 1 },
  spacious:             { category: 'spacious seating',                delta: 0.5, minEvidence: 1 },
  accommodating:        { category: 'welcoming staff toward children', delta: 0.5, minEvidence: 1 },
  good_for_groups:      { category: 'family friendly atmosphere',      delta: 0.5, minEvidence: 1 },
  relaxed_atmosphere:   { category: 'family friendly atmosphere',      delta: 0.5, minEvidence: 1 },
  play_area:            { category: 'family friendly atmosphere',      delta: 0.5, minEvidence: 1 },
  outdoor_seating:      { category: 'spacious seating',                delta: 0.5, minEvidence: 1 },
};

const KIDS_MENU_NEGATIVE_WEIGHT = 0.5;

function evidenceCount(featureEvidence: FeatureEvidence, key: keyof FeatureEvidence): number {
  return featureEvidence[key]?.length ?? 0;
}

export function scoreStructuredExtraction(
  input: StructuredExtractionResult,
  venueProfileSignals: VenueProfileSignal[] = [],
  venueProfileAdjustment = 0,
  familySentiment: 'positive' | 'negative' | 'mixed' | 'neutral' | null = null,
): ScoringResult {
  const positive_signals: AnalysisSignal[] = [];
  const negative_signals: AnalysisSignal[] = [];
  let score = 2.5 + venueProfileAdjustment;
  let signalCount = 0;

  const fe = input.feature_evidence;

  for (const [key, weight] of Object.entries(STRUCTURED_POSITIVE_WEIGHTS)) {
    const feKey = key as keyof FeatureEvidence;
    const value = input[key as keyof StructuredExtractionResult];
    const quotes = evidenceCount(fe, feKey);

    const negativeDelta = key === 'kids_menu' ? KIDS_MENU_NEGATIVE_WEIGHT : weight.delta;

    if (value === true) {
      if (quotes >= weight.minEvidence) {
        positive_signals.push({ category: weight.category, evidence: (fe[feKey][0] ?? '') });
        score += weight.delta;
        signalCount++;
        console.log(`[scoring] ACCEPTED ${key}: true — ${quotes} quote(s) (required ${weight.minEvidence}) → +${weight.delta}`);
      } else {
        console.log(`[scoring] REJECTED ${key}: true — only ${quotes} quote(s), required ${weight.minEvidence} → treated as unknown`);
      }
    } else if (value === false) {
      if (quotes >= weight.minEvidence) {
        negative_signals.push({ category: weight.category, evidence: (fe[feKey][0] ?? '') });
        score -= negativeDelta;
        signalCount++;
        console.log(`[scoring] ACCEPTED ${key}: false — ${quotes} quote(s) (required ${weight.minEvidence}) → -${negativeDelta}`);
      } else {
        console.log(`[scoring] REJECTED ${key}: false — only ${quotes} quote(s), required ${weight.minEvidence} → treated as unknown`);
      }
    } else {
      console.log(`[scoring] SKIPPED ${key}: unknown`);
    }
  }

  for (const neg of input.negative_signals) {
    negative_signals.push({ category: 'not suitable for children', evidence: neg });
    score -= 1;
    signalCount++;
    console.log(`[scoring] ACCEPTED negative_signal: "${neg}" → -1`);
  }

  if (familySentiment === 'negative' && negative_signals.length === 0) {
    negative_signals.push({ category: 'not suitable for children', evidence: 'Reviewers describe this venue as unwelcoming or unsuitable for families with toddlers.' });
    score -= 0.5;
    signalCount++;
    console.log(`[scoring] ACCEPTED family_sentiment: negative (no specific evidence) → -0.5`);
  }

  const toddler_score = Math.min(5, Math.max(0, score));
  const confidence = confidenceFromCount(signalCount);

  console.log(`[scoring] Venue profile adjustment: ${venueProfileAdjustment.toFixed(2)} (${venueProfileSignals.length} signal(s))`);
  console.log(`[scoring] Final score: ${toddler_score.toFixed(2)}, confidence: ${confidence.toFixed(2)}, signals: ${signalCount}`);

  const aiSignals: AnalysisSignal[] = [...positive_signals, ...negative_signals];

  return {
    positive_signals,
    negative_signals,
    toddler_score,
    confidence,
    signal_breakdown: {
      venue_profile: venueProfileSignals.map((s) => ({ label: s.label, delta: s.delta })),
      ai_review_signals: aiSignals,
      parent_confirmations: [],
    },
  };
}

export interface ManualAmenityInput {
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

const MANUAL_AMENITY_DELTAS: Record<keyof Omit<ManualAmenityInput, 'notes'>, { positive: number; negative: number; label: ToddlerCategory }> = {
  high_chairs:          { positive: 2,   negative: -1.5, label: 'high chairs available' },
  kids_menu:            { positive: 2,   negative: -0.5, label: 'kids menu' },
  pram_space:           { positive: 1,   negative: -1,   label: 'pram or buggy space' },
  changing_table:       { positive: 1,   negative: -0.5, label: 'changing table available' },
  outdoor_seating:      { positive: 0.5, negative: -0.5, label: 'spacious seating' },
  play_area:            { positive: 1,   negative: -0.5, label: 'family friendly atmosphere' },
  noise_tolerant:       { positive: 1,   negative: -1,   label: 'noise tolerant' },
  staff_child_friendly: { positive: 1,   negative: -1,   label: 'welcoming staff toward children' },
};

export function applyManualAmenities(
  baseScore: number,
  baseSignalBreakdown: SignalBreakdown,
  manual: ManualAmenityInput,
): { toddler_score: number; signal_breakdown: SignalBreakdown } {
  let score = baseScore;
  const manualPositive: AnalysisSignal[] = [];
  const manualNegative: AnalysisSignal[] = [];

  for (const [key, cfg] of Object.entries(MANUAL_AMENITY_DELTAS)) {
    const value = manual[key as keyof Omit<ManualAmenityInput, 'notes'>];
    if (value === null || value === undefined) continue;

    if (value === true) {
      score += cfg.positive;
      manualPositive.push({ category: cfg.label, evidence: 'Confirmed by venue admin', source: 'venue_profile' });
    } else {
      score += cfg.negative;
      manualNegative.push({ category: cfg.label, evidence: 'Confirmed absent by venue admin', source: 'venue_profile' });
    }
  }

  if (manual.notes) {
    manualPositive.push({ category: 'family friendly atmosphere', evidence: manual.notes, source: 'venue_profile' });
  }

  const toddler_score = Math.min(5, Math.max(0, score));

  const signal_breakdown: SignalBreakdown = {
    venue_profile: baseSignalBreakdown.venue_profile,
    ai_review_signals: baseSignalBreakdown.ai_review_signals,
    parent_confirmations: [
      ...baseSignalBreakdown.parent_confirmations,
      ...manualPositive,
      ...manualNegative,
    ],
  };

  return { toddler_score, signal_breakdown };
}

export function computeStressLevel(
  positiveSignals: AnalysisSignal[],
  negativeSignals: AnalysisSignal[],
  snapshot?: {
    pram_space?: string;
    noise_level?: string;
    staff_friendliness?: string;
  },
): StressResult {
  const hasDifficult =
    negativeSignals.some((s) => DIFFICULT_CATEGORIES.has(s.category as string)) ||
    snapshot?.pram_space === 'not_suitable' ||
    snapshot?.noise_level === 'not_suitable' ||
    snapshot?.staff_friendliness === 'not_suitable';

  if (hasDifficult) {
    return { stress_level: 'difficult' };
  }

  const hasRelaxedPositive =
    positiveSignals.some((s) => RELAXED_POSITIVE_CATEGORIES.has(s.category as string)) ||
    (snapshot?.pram_space === 'available' && snapshot?.staff_friendliness === 'available');

  const hasAnyNegative = negativeSignals.length > 0 ||
    snapshot?.noise_level === 'limited' ||
    snapshot?.pram_space === 'limited' ||
    snapshot?.staff_friendliness === 'limited';

  if (hasRelaxedPositive && !hasAnyNegative) {
    return { stress_level: 'relaxed' };
  }

  return { stress_level: 'manageable' };
}
