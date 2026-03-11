import { z } from 'zod';
import { AnalysisResult, StructuredExtractionResult } from './types';

import {
  TODDLER_STRUCTURED_EXTRACTION_SYSTEM_PROMPT,
  TODDLER_SUMMARY_SYSTEM_PROMPT,
  buildStructuredExtractionPrompt,
  buildSummaryPrompt,
  TODDLER_CARD_SUMMARY_SYSTEM_PROMPT,
  buildToddlerCardSummaryPrompt,
  ToddlerSummaryInput,
} from './prompts';
import { getCachedAnalysis, setCachedAnalysis } from './cache';
import { scoreStructuredExtraction } from './scoring';
import { fetchExternalRestaurantMentions } from './search';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
const CLAUDE_TIMEOUT_MS = 30_000;

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

const FeaturePresenceSchema = z.union([z.boolean(), z.literal('unknown')]);

const FeatureEvidenceSchema = z.object({
  high_chairs: z.array(z.string()),
  pram_space: z.array(z.string()),
  changing_table: z.array(z.string()),
  kids_menu: z.array(z.string()),
  staff_child_friendly: z.array(z.string()),
  noise_tolerant: z.array(z.string()),
});

export const ExtractionResultSchema = z.object({
  high_chairs: FeaturePresenceSchema,
  pram_space: FeaturePresenceSchema,
  changing_table: FeaturePresenceSchema,
  kids_menu: FeaturePresenceSchema,
  staff_child_friendly: FeaturePresenceSchema,
  noise_tolerant: FeaturePresenceSchema,
  negative_signals: z.array(z.string()),
  evidence_quotes: z.array(z.string()),
  feature_evidence: FeatureEvidenceSchema,
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

const FEATURE_EVIDENCE_SCHEMA = {
  type: 'object',
  properties: {
    high_chairs: { type: 'array', items: { type: 'string' } },
    pram_space: { type: 'array', items: { type: 'string' } },
    changing_table: { type: 'array', items: { type: 'string' } },
    kids_menu: { type: 'array', items: { type: 'string' } },
    staff_child_friendly: { type: 'array', items: { type: 'string' } },
    noise_tolerant: { type: 'array', items: { type: 'string' } },
  },
  required: ['high_chairs', 'pram_space', 'changing_table', 'kids_menu', 'staff_child_friendly', 'noise_tolerant'],
  additionalProperties: false,
};

const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    high_chairs: { oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['unknown'] }] },
    pram_space: { oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['unknown'] }] },
    changing_table: { oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['unknown'] }] },
    kids_menu: { oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['unknown'] }] },
    staff_child_friendly: { oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['unknown'] }] },
    noise_tolerant: { oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['unknown'] }] },
    negative_signals: { type: 'array', items: { type: 'string' } },
    evidence_quotes: { type: 'array', items: { type: 'string' } },
    feature_evidence: FEATURE_EVIDENCE_SCHEMA,
  },
  required: [
    'high_chairs',
    'pram_space',
    'changing_table',
    'kids_menu',
    'staff_child_friendly',
    'noise_tolerant',
    'negative_signals',
    'evidence_quotes',
    'feature_evidence',
  ],
  additionalProperties: false,
};

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens = 1024,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AnalysisError('Claude API request timed out', 504);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AnalysisError(
      `Claude API error: ${response.status} — ${errorBody}`,
      response.status,
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

async function callClaudeWithJsonSchema(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens = 1024,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'json-output-1',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'extraction_result',
            schema: EXTRACTION_JSON_SCHEMA,
            strict: true,
          },
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AnalysisError('Claude API request timed out', 504);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 400 || response.status === 404) {
      return '';
    }
    throw new AnalysisError(
      `Claude API error: ${response.status} — ${body}`,
      response.status,
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

function parseAndValidateExtraction(raw: string, context: string): ExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`[analyse] JSON parse failed (${context}):`, raw.slice(0, 500));
    throw new AnalysisError(`Failed to parse JSON from Claude response (${context})`);
  }

  const result = ExtractionResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error(`[analyse] Zod validation failed (${context}):`, result.error.format(), 'raw:', raw.slice(0, 500));
    throw new AnalysisError(`Invalid extraction schema from Claude (${context}): ${result.error.message}`);
  }

  return result.data;
}

async function extractWithRetry(
  userMessage: string,
  apiKey: string,
  context: string,
): Promise<ExtractionResult> {
  let rawText = await callClaudeWithJsonSchema(
    TODDLER_STRUCTURED_EXTRACTION_SYSTEM_PROMPT,
    userMessage,
    apiKey,
    1024,
  );

  if (!rawText) {
    rawText = await callClaude(
      TODDLER_STRUCTURED_EXTRACTION_SYSTEM_PROMPT,
      userMessage,
      apiKey,
      1024,
    );
  }

  let firstError: Error | null = null;
  try {
    return parseAndValidateExtraction(rawText, context);
  } catch (err) {
    firstError = err instanceof Error ? err : new Error(String(err));
    console.warn(`[analyse] First parse attempt failed (${context}), retrying...`);
  }

  const retryRaw = await callClaude(
    TODDLER_STRUCTURED_EXTRACTION_SYSTEM_PROMPT,
    userMessage,
    apiKey,
    1024,
  );

  try {
    return parseAndValidateExtraction(retryRaw, `${context}-retry`);
  } catch {
    console.error(`[analyse] Retry also failed (${context}). Original error:`, firstError?.message);
    throw firstError ?? new AnalysisError(`Extraction failed after retry (${context})`);
  }
}

export async function extractStructuredEvidence(
  reviews: string[],
  apiKey: string,
): Promise<StructuredExtractionResult> {
  const userMessage = buildStructuredExtractionPrompt(reviews);
  return extractWithRetry(userMessage, apiKey, 'structured-extraction');
}

const MAX_REVIEWS_CHARS = 3000;

function truncateReviews(reviews: string[]): string[] {
  const result: string[] = [];
  let total = 0;
  for (const review of reviews) {
    if (total >= MAX_REVIEWS_CHARS) break;
    const remaining = MAX_REVIEWS_CHARS - total;
    const text = review.length > remaining ? review.slice(0, remaining) : review;
    result.push(text);
    total += text.length;
  }
  return result;
}

const EMPTY_RESULT: AnalysisResult & { _filtered_sentences: string[] } = {
  positive_signals: [],
  negative_signals: [],
  toddler_score: 2.5,
  confidence: 0.1,
  summary: 'No review information available.',
  _filtered_sentences: [],
};

export async function analyseRestaurantReviews(
  reviews_to_analyse: string[],
  review_source: 'filtered' | 'fallback',
  place_id?: string,
  restaurantName?: string,
): Promise<AnalysisResult & { _filtered_sentences: string[] }> {
  if (place_id) {
    const cached = getCachedAnalysis(place_id);
    if (cached) return cached;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new AnalysisError('ANTHROPIC_API_KEY is not configured', 500);
  }

  let snippetTexts: string[] = [];
  if (restaurantName) {
    try {
      const { snippets } = await fetchExternalRestaurantMentions(restaurantName);
      snippetTexts = snippets.map((s) => s.snippet).filter(Boolean);
    } catch (err) {
      console.warn('[analyse] External search unavailable, proceeding without web mentions:', err instanceof Error ? err.message : err);
      snippetTexts = [];
    }
  }

  const allReviews = [...reviews_to_analyse, ...snippetTexts];
  if (allReviews.length === 0) {
    return EMPTY_RESULT;
  }

  const truncated = truncateReviews(allReviews);
  const extracted = await extractStructuredEvidence(truncated, apiKey);

  const hasAnySignal =
    extracted.high_chairs !== 'unknown' ||
    extracted.pram_space !== 'unknown' ||
    extracted.changing_table !== 'unknown' ||
    extracted.kids_menu !== 'unknown' ||
    extracted.staff_child_friendly !== 'unknown' ||
    extracted.noise_tolerant !== 'unknown' ||
    extracted.negative_signals.length > 0;

  if (!hasAnySignal) {
    return {
      positive_signals: [],
      negative_signals: [],
      toddler_score: 2.5,
      confidence: 0.1,
      summary: 'No toddler-relevant information was found in the provided reviews.',
      _filtered_sentences: [],
    };
  }

  const scored = scoreStructuredExtraction(extracted);

  const confidence =
    review_source === 'fallback'
      ? Math.min(1, Math.max(0, scored.confidence * 0.7))
      : scored.confidence;

  const evidenceSentences = [
    ...extracted.evidence_quotes,
    ...extracted.negative_signals,
  ];

  const summary = await callClaude(
    TODDLER_SUMMARY_SYSTEM_PROMPT,
    buildSummaryPrompt(evidenceSentences),
    apiKey,
    128,
  );

  const result = {
    positive_signals: scored.positive_signals,
    negative_signals: scored.negative_signals,
    toddler_score: scored.toddler_score,
    confidence,
    summary: summary.trim() || 'No summary available.',
    _filtered_sentences: evidenceSentences,
  };

  if (place_id) {
    setCachedAnalysis(place_id, result);
  }

  return result;
}

export async function generateToddlerCardSummary(
  input: ToddlerSummaryInput,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AnalysisError('ANTHROPIC_API_KEY is not configured', 500);
  }

  const prompt = buildToddlerCardSummaryPrompt(input);
  if (!prompt.trim()) {
    return '';
  }

  const raw = await callClaude(
    TODDLER_CARD_SUMMARY_SYSTEM_PROMPT,
    prompt,
    apiKey,
    128,
  );

  return raw.trim();
}
