import { TODDLER_KEYWORDS } from './places';

const POSITIVE_KEYWORDS = [
  'high chair', 'highchair', 'kids menu', "children's menu", 'pram', 'pushchair',
  'buggy', 'stroller', 'baby change', 'baby changing', 'changing table',
  'family friendly', 'family-friendly', 'child friendly', 'toddler',
  'great for kids', 'good for families', 'kids eat free',
];

const NEGATIVE_KEYWORDS = [
  'too cramped', 'no space for pram', 'no high chair', 'no kids menu',
  'not suitable for children', 'formal atmosphere', 'staff unfriendly',
  'not family friendly', 'no baby change', 'no changing',
  'too loud', 'not welcoming', 'annoyed by children',
];

export interface MockToddlerScore {
  toddler_score: number;
  confidence: number;
  summary: string;
  toddler_features: Record<string, boolean | 'unknown'>;
  evidence_quotes: string[];
  ai_negative_signals: string[];
  positive_signals: { category: string; evidence: string }[];
  negative_signals: { category: string; evidence: string }[];
}

function countKeywordHits(reviews: string[], keywords: string[]): number {
  let count = 0;
  for (const review of reviews) {
    const lower = review.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) count++;
    }
  }
  return count;
}

function detectFeature(
  reviews: string[],
  positiveTerms: string[],
  negativeTerms: string[],
): boolean | 'unknown' {
  let pos = 0;
  let neg = 0;
  for (const review of reviews) {
    const lower = review.toLowerCase();
    if (positiveTerms.some((t) => lower.includes(t))) pos++;
    if (negativeTerms.some((t) => lower.includes(t))) neg++;
  }
  if (pos > 0 && neg === 0) return true;
  if (neg > 0 && pos === 0) return false;
  if (pos > 0 && neg > 0) return true;
  return 'unknown';
}

function extractShortQuotes(reviews: string[], maxQuotes = 3): string[] {
  const quotes: string[] = [];
  for (const review of reviews) {
    if (quotes.length >= maxQuotes) break;
    const lower = review.toLowerCase();
    const matched = TODDLER_KEYWORDS.some((kw) => lower.includes(kw));
    if (matched) {
      const sentences = review.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
      for (const sentence of sentences) {
        const sl = sentence.toLowerCase();
        if (TODDLER_KEYWORDS.some((kw) => sl.includes(kw)) && sentence.length < 120) {
          quotes.push(sentence);
          break;
        }
      }
    }
  }
  return quotes;
}

function extractNegativeSignals(reviews: string[]): string[] {
  const signals: string[] = [];
  for (const review of reviews) {
    const lower = review.toLowerCase();
    for (const kw of NEGATIVE_KEYWORDS) {
      if (lower.includes(kw) && !signals.some((s) => s.toLowerCase().includes(kw))) {
        signals.push(kw.charAt(0).toUpperCase() + kw.slice(1));
      }
    }
  }
  return signals.slice(0, 3);
}

function buildMockSummary(
  features: Record<string, boolean | 'unknown'>,
  negativeSignals: string[],
  venueType: string,
): string {
  const positives: string[] = [];
  if (features.high_chairs === true) positives.push('high chairs');
  if (features.kids_menu === true) positives.push('kids menu');
  if (features.pram_space === true) positives.push('pram-friendly');
  if (features.changing_table === true) positives.push('baby changing');
  if (features.staff_child_friendly === true) positives.push('child-friendly staff');

  const venueLabel = venueType === 'cafe' ? 'café' : venueType === 'pub' ? 'pub' : 'restaurant';

  if (positives.length === 0 && negativeSignals.length === 0) {
    return `A ${venueLabel} in Guildford. No specific toddler information available yet — check back after parent reviews come in.`;
  }

  let summary = '';
  if (positives.length > 0) {
    summary = `${venueLabel.charAt(0).toUpperCase() + venueLabel.slice(1)} with ${positives.join(', ')} available.`;
  } else {
    summary = `A ${venueLabel} in Guildford.`;
  }

  if (negativeSignals.length > 0) {
    summary += ` Note: ${negativeSignals[0].toLowerCase()}.`;
  }

  return summary;
}

export function mockScoreFromReviews(
  reviews: string[],
  venueType: string,
  googleRating: number,
): MockToddlerScore {
  const toddlerReviews = reviews.filter((r) =>
    TODDLER_KEYWORDS.some((kw) => r.toLowerCase().includes(kw)),
  );

  const positiveHits = countKeywordHits(toddlerReviews, POSITIVE_KEYWORDS);
  const negativeHits = countKeywordHits(toddlerReviews, NEGATIVE_KEYWORDS);

  const toddler_features = {
    high_chairs: detectFeature(
      reviews,
      ['high chair', 'highchair'],
      ['no high chair', 'no highchair'],
    ),
    pram_space: detectFeature(
      reviews,
      ['pram', 'pushchair', 'buggy', 'stroller', 'space for'],
      ['no space for pram', 'too cramped', 'can\'t fit pram'],
    ),
    changing_table: detectFeature(
      reviews,
      ['baby change', 'changing table', 'changing facilities'],
      ['no baby change', 'no changing', 'no facilities'],
    ),
    kids_menu: detectFeature(
      reviews,
      ['kids menu', "children's menu", 'kids eat', 'children\'s food'],
      ['no kids menu', 'no children\'s menu'],
    ),
    staff_child_friendly: detectFeature(
      reviews,
      ['friendly staff', 'staff were great', 'staff helpful', 'welcoming', 'lovely staff'],
      ['staff unfriendly', 'annoyed by children', 'not welcoming'],
    ),
    noise_tolerant: detectFeature(
      reviews,
      ['relaxed', 'laid back', 'family friendly', 'lively', 'buzzy'],
      ['too loud', 'very loud', 'overwhelming noise'],
    ),
  };

  const trueCount = Object.values(toddler_features).filter((v) => v === true).length;
  const falseCount = Object.values(toddler_features).filter((v) => v === false).length;

  let toddler_score = 2.5;
  toddler_score += trueCount * 0.4;
  toddler_score -= falseCount * 0.5;
  toddler_score += Math.min(positiveHits * 0.1, 0.5);
  toddler_score -= Math.min(negativeHits * 0.15, 0.5);

  if (googleRating >= 4.5) toddler_score += 0.2;
  if (venueType === 'cafe') toddler_score += 0.1;

  toddler_score = Math.min(5, Math.max(0, Math.round(toddler_score * 10) / 10));

  const signalCount = trueCount + falseCount + positiveHits + negativeHits;
  const confidence =
    toddlerReviews.length === 0
      ? 0.1
      : signalCount >= 5
        ? 0.5
        : signalCount >= 2
          ? 0.3
          : 0.2;

  const evidence_quotes = extractShortQuotes(toddlerReviews, 3);
  const ai_negative_signals = extractNegativeSignals(reviews);

  const positive_signals = (
    Object.entries(toddler_features) as [string, boolean | 'unknown'][]
  )
    .filter(([, v]) => v === true)
    .map(([k]) => ({
      category: k.replace(/_/g, '_'),
      evidence: `${k.replace(/_/g, ' ')} mentioned positively in reviews.`,
    }));

  const negative_signals = (
    Object.entries(toddler_features) as [string, boolean | 'unknown'][]
  )
    .filter(([, v]) => v === false)
    .map(([k]) => ({
      category: k.replace(/_/g, '_'),
      evidence: `${k.replace(/_/g, ' ')} not available or problematic.`,
    }));

  const summary = buildMockSummary(toddler_features, ai_negative_signals, venueType);

  return {
    toddler_score,
    confidence,
    summary,
    toddler_features,
    evidence_quotes,
    ai_negative_signals,
    positive_signals,
    negative_signals,
  };
}
