import { AnalysisSignal, EvidenceExtractionResult, EvidenceSignal, FeatureEvidence, StressLevel, StressResult, StructuredExtractionResult, ToddlerCategory } from './types';

interface ScoringResult {
  positive_signals: AnalysisSignal[];
  negative_signals: AnalysisSignal[];
  toddler_score: number;
  confidence: number;
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

  return { positive_signals, negative_signals, toddler_score, confidence };
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
  high_chairs:          { category: 'high chairs available',          delta: 2, minEvidence: 2 },
  kids_menu:            { category: 'kids menu',                      delta: 2, minEvidence: 2 },
  pram_space:           { category: 'pram or buggy space',            delta: 1, minEvidence: 1 },
  changing_table:       { category: 'family friendly atmosphere',     delta: 1, minEvidence: 1 },
  staff_child_friendly: { category: 'welcoming staff toward children', delta: 1, minEvidence: 1 },
  noise_tolerant:       { category: 'family friendly atmosphere',     delta: 1, minEvidence: 1 },
};

function evidenceCount(featureEvidence: FeatureEvidence, key: keyof FeatureEvidence): number {
  return featureEvidence[key]?.length ?? 0;
}

export function scoreStructuredExtraction(input: StructuredExtractionResult): ScoringResult {
  const positive_signals: AnalysisSignal[] = [];
  const negative_signals: AnalysisSignal[] = [];
  let score = 2.5;
  let signalCount = 0;

  const fe = input.feature_evidence;

  for (const [key, weight] of Object.entries(STRUCTURED_POSITIVE_WEIGHTS)) {
    const feKey = key as keyof FeatureEvidence;
    const value = input[key as keyof StructuredExtractionResult];
    const quotes = evidenceCount(fe, feKey);

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
        score -= weight.delta;
        signalCount++;
        console.log(`[scoring] ACCEPTED ${key}: false — ${quotes} quote(s) (required ${weight.minEvidence}) → -${weight.delta}`);
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

  const toddler_score = Math.min(5, Math.max(0, score));
  const confidence = confidenceFromCount(signalCount);

  console.log(`[scoring] Final score: ${toddler_score.toFixed(2)}, confidence: ${confidence.toFixed(2)}, signals: ${signalCount}`);

  return { positive_signals, negative_signals, toddler_score, confidence };
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
