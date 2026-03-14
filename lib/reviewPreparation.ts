import { ParentSubmission, ParentDetailedSubmission } from './types';

const TODDLER_KEYWORDS = [
  'kids',
  'child',
  'children',
  'baby',
  'family',
  'pram',
  'stroller',
  'buggy',
  'high chair',
  'highchair',
  'changing table',
  'kids menu',
];

const MIN_FRAGMENT_LENGTH = 15;

export interface TextSource {
  text: string;
  label: string;
}

export interface PreparedReviewContext {
  sections: string[];
  totalChars: number;
}

const INFERENCE_LINE_FEATURE_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /high chair/i,                              key: 'high_chairs' },
  { pattern: /kids menu|children'?s menu/i,              key: 'kids_menu' },
  { pattern: /pram|stroller|buggy|pushchair/i,           key: 'pram_space' },
  { pattern: /changing (table|facilit)/i,                key: 'changing_table' },
  { pattern: /staff.{0,30}(child|famil|toddler|welcom)/i, key: 'staff_child_friendly' },
  { pattern: /(noise|loud|tolerant)/i,                   key: 'noise_tolerant' },
  { pattern: /play area/i,                               key: 'play_area' },
  { pattern: /outdoor seating/i,                         key: 'outdoor_seating' },
  { pattern: /(famil|welcom|toddler).{0,40}(venue|atmosphere|place)/i, key: 'family_friendly' },
  { pattern: /spacious|space|roomy/i,                    key: 'spacious' },
];

function inferenceLineFeatureKey(line: string): string | null {
  for (const { pattern, key } of INFERENCE_LINE_FEATURE_PATTERNS) {
    if (pattern.test(line)) return key;
  }
  return null;
}

function isInferenceLine(line: string): boolean {
  return line.startsWith('[Website]') || line.startsWith('[Review]') || line.startsWith('[Menu]');
}

function deduplicateInferenceLines(lines: string[]): string[] {
  const seenFeatureKeys = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    if (!isInferenceLine(line)) {
      result.push(line);
      continue;
    }
    const key = inferenceLineFeatureKey(line);
    if (key === null) {
      result.push(line);
      continue;
    }
    if (!seenFeatureKeys.has(key)) {
      seenFeatureKeys.add(key);
      result.push(line);
    }
  }
  return result;
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_FRAGMENT_LENGTH);
}

function containsToddlerKeyword(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return TODDLER_KEYWORDS.some((kw) => lower.includes(kw));
}

function deduplicateSentences(sentences: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of sentences) {
    const normalised = s.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(normalised)) {
      seen.add(normalised);
      result.push(s);
    }
  }
  return result;
}

function prioritiseSentences(sentences: string[]): string[] {
  const highlighted: string[] = [];
  const rest: string[] = [];
  for (const s of sentences) {
    if (containsToddlerKeyword(s)) {
      highlighted.push(s);
    } else {
      rest.push(s);
    }
  }
  return [...highlighted, ...rest];
}

function submissionsToText(submissions: ParentSubmission[]): string[] {
  const lines: string[] = [];
  for (const s of submissions) {
    const parts: string[] = [];
    if (s.high_chair && s.high_chair !== 'unknown')
      parts.push(`High chairs: ${s.high_chair.replace(/_/g, ' ')}`);
    if (s.kids_menu && s.kids_menu !== 'unknown')
      parts.push(`Kids menu: ${s.kids_menu.replace(/_/g, ' ')}`);
    if (s.pram_space && s.pram_space !== 'unknown')
      parts.push(`Pram space: ${s.pram_space.replace(/_/g, ' ')}`);
    if (s.changing_table && s.changing_table !== 'unknown')
      parts.push(`Changing table: ${s.changing_table.replace(/_/g, ' ')}`);
    if (s.noise_level && s.noise_level !== 'unknown')
      parts.push(`Noise level: ${s.noise_level.replace(/_/g, ' ')}`);
    if (s.staff_friendliness && s.staff_friendliness !== 'unknown')
      parts.push(`Staff friendliness: ${s.staff_friendliness.replace(/_/g, ' ')}`);
    if (s.notes) parts.push(`Parent note: ${s.notes}`);
    if (parts.length > 0) lines.push(parts.join('. ') + '.');
  }
  return lines;
}

function detailedSubmissionsToText(submissions: ParentDetailedSubmission[]): string[] {
  const lines: string[] = [];
  for (const s of submissions) {
    const parts: string[] = [];
    if (s.facilities.length > 0)
      parts.push(`Confirmed facilities: ${s.facilities.map((f) => f.replace(/_/g, ' ')).join(', ')}`);
    if (s.experience_tags.length > 0)
      parts.push(`Experience: ${s.experience_tags.map((t) => t.replace(/_/g, ' ')).join(', ')}`);
    if (s.toddler_friendliness_rating != null)
      parts.push(`Toddler friendliness rating: ${s.toddler_friendliness_rating}/5`);
    if (s.noise_tolerance_rating != null)
      parts.push(`Noise tolerance rating: ${s.noise_tolerance_rating}/5`);
    if (s.family_space_rating != null)
      parts.push(`Family space rating: ${s.family_space_rating}/5`);
    if (s.comment) parts.push(`Parent comment: ${s.comment}`);
    if (parts.length > 0) lines.push(parts.join('. ') + '.');
  }
  return lines;
}

export interface ReviewInputSources {
  googleReviews: string[];
  searchSnippets: string[];
  descriptionText?: string;
  parentSubmissions?: ParentSubmission[];
  detailedSubmissions?: ParentDetailedSubmission[];
}

export function prepareReviewContext(sources: ReviewInputSources): string[] {
  const rawTexts: string[] = [
    ...sources.googleReviews,
    ...sources.searchSnippets,
    ...(sources.descriptionText ? [sources.descriptionText] : []),
    ...submissionsToText(sources.parentSubmissions ?? []),
    ...detailedSubmissionsToText(sources.detailedSubmissions ?? []),
  ];

  const allSentences = rawTexts.flatMap((text) => splitIntoSentences(text));

  const deduped = deduplicateSentences(allSentences);

  const deduplicatedInferences = deduplicateInferenceLines(deduped);

  const prioritised = prioritiseSentences(deduplicatedInferences);

  return prioritised;
}
