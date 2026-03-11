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
  WEBSITE_METADATA_EXTRACTION_SYSTEM_PROMPT,
  buildWebsiteMetadataPrompt,
  websiteMetadataToInferenceLines,
  WebsiteMetadata,
  SOCIAL_REVIEW_METADATA_SYSTEM_PROMPT,
  buildSocialReviewMetadataPrompt,
  socialReviewMetadataToInferenceLines,
  SocialReviewMetadata,
} from './prompts';
import { getCachedAnalysis, setCachedAnalysis } from './cache';
import { scoreStructuredExtraction } from './scoring';
import { fetchExternalRestaurantMentions } from './search';
import { prepareReviewContext } from './reviewPreparation';
import { fetchSubmissionsForRestaurant } from './submissions';
import { fetchDetailedSubmissions } from './detailedSubmissions';
import { inferVenueProfile, scoreVenueProfile, VenueProfileInput } from './venueProfile';
import { scrapeWebsiteForFamilyInfo, scrapeMenuPageForFamilyInfo, scrapeWebsiteRaw } from './websiteScrape';

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
  family_friendly: z.array(z.string()),
  spacious: z.array(z.string()),
  accommodating: z.array(z.string()),
  good_for_groups: z.array(z.string()),
  relaxed_atmosphere: z.array(z.string()),
});

export const ExtractionResultSchema = z.object({
  high_chairs: FeaturePresenceSchema,
  pram_space: FeaturePresenceSchema,
  changing_table: FeaturePresenceSchema,
  kids_menu: FeaturePresenceSchema,
  staff_child_friendly: FeaturePresenceSchema,
  noise_tolerant: FeaturePresenceSchema,
  family_friendly: FeaturePresenceSchema,
  spacious: FeaturePresenceSchema,
  accommodating: FeaturePresenceSchema,
  good_for_groups: FeaturePresenceSchema,
  relaxed_atmosphere: FeaturePresenceSchema,
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
    family_friendly: { type: 'array', items: { type: 'string' } },
    spacious: { type: 'array', items: { type: 'string' } },
    accommodating: { type: 'array', items: { type: 'string' } },
    good_for_groups: { type: 'array', items: { type: 'string' } },
    relaxed_atmosphere: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'high_chairs', 'pram_space', 'changing_table', 'kids_menu',
    'staff_child_friendly', 'noise_tolerant',
    'family_friendly', 'spacious', 'accommodating', 'good_for_groups', 'relaxed_atmosphere',
  ],
  additionalProperties: false,
};

const FEATURE_PRESENCE = { oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['unknown'] }] };

const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    high_chairs: FEATURE_PRESENCE,
    pram_space: FEATURE_PRESENCE,
    changing_table: FEATURE_PRESENCE,
    kids_menu: FEATURE_PRESENCE,
    staff_child_friendly: FEATURE_PRESENCE,
    noise_tolerant: FEATURE_PRESENCE,
    family_friendly: FEATURE_PRESENCE,
    spacious: FEATURE_PRESENCE,
    accommodating: FEATURE_PRESENCE,
    good_for_groups: FEATURE_PRESENCE,
    relaxed_atmosphere: FEATURE_PRESENCE,
    negative_signals: { type: 'array', items: { type: 'string' } },
    evidence_quotes: { type: 'array', items: { type: 'string' } },
    feature_evidence: FEATURE_EVIDENCE_SCHEMA,
  },
  required: [
    'high_chairs', 'pram_space', 'changing_table', 'kids_menu',
    'staff_child_friendly', 'noise_tolerant',
    'family_friendly', 'spacious', 'accommodating', 'good_for_groups', 'relaxed_atmosphere',
    'negative_signals', 'evidence_quotes', 'feature_evidence',
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
    throw new AnalysisError(
      `Claude API network error: ${err instanceof Error ? err.message : String(err)}`,
      503,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorBody = '';
    try { errorBody = await response.text(); } catch {}
    throw new AnalysisError(
      `Claude API error: ${response.status} — ${errorBody}`,
      response.status,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new AnalysisError(`Claude API returned non-JSON response: ${err instanceof Error ? err.message : String(err)}`, 502);
  }
  return (data as { content?: { text?: string }[] }).content?.[0]?.text ?? '';
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
    throw new AnalysisError(
      `Claude API network error: ${err instanceof Error ? err.message : String(err)}`,
      503,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let body = '';
    try { body = await response.text(); } catch {}
    if (response.status === 400 || response.status === 404) {
      return '';
    }
    throw new AnalysisError(
      `Claude API error: ${response.status} — ${body}`,
      response.status,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new AnalysisError(`Claude API returned non-JSON response: ${err instanceof Error ? err.message : String(err)}`, 502);
  }
  return (data as { content?: { text?: string }[] }).content?.[0]?.text ?? '';
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

async function analyseWebsiteMetadata(
  pages: Array<{ text: string; source: 'website' | 'menu' }>,
  apiKey: string,
  context: string,
): Promise<string[]> {
  if (pages.length === 0) return [];
  try {
    const userMessage = buildWebsiteMetadataPrompt(pages);
    const raw = await callClaude(
      WEBSITE_METADATA_EXTRACTION_SYSTEM_PROMPT,
      userMessage,
      apiKey,
      512,
    );
    if (!raw.trim()) return [];
    let parsed: unknown;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      console.warn(`[analyse] Website metadata JSON parse failed (${context})`);
      return [];
    }
    const meta = parsed as WebsiteMetadata;
    const label = pages.some((p) => p.source === 'menu') ? 'Menu' : 'Website';
    const lines = websiteMetadataToInferenceLines(meta, label);
    if (lines.length > 0) {
      console.log(`[analyse] AI website metadata found ${lines.length} inference(s) for ${context}`);
    }
    return lines;
  } catch (err) {
    console.warn(`[analyse] Website metadata extraction failed (${context}): ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

export async function extractSocialReviewMetadata(
  snippets: string[],
  apiKey: string,
): Promise<{ metadata: SocialReviewMetadata; inferenceLines: string[] }> {
  const userMessage = buildSocialReviewMetadataPrompt(snippets);
  const raw = await callClaude(
    SOCIAL_REVIEW_METADATA_SYSTEM_PROMPT,
    userMessage,
    apiKey,
    512,
  );

  let parsed: unknown;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch {
    throw new AnalysisError('Failed to parse social review metadata JSON');
  }

  const meta = parsed as SocialReviewMetadata;
  const inferenceLines = socialReviewMetadataToInferenceLines(meta);
  return { metadata: meta, inferenceLines };
}

async function analyseSocialSnippets(
  snippets: string[],
  apiKey: string,
  context: string,
): Promise<string[]> {
  if (snippets.length === 0) return [];
  try {
    const { inferenceLines } = await extractSocialReviewMetadata(snippets, apiKey);
    if (inferenceLines.length > 0) {
      console.log(`[analyse] Social review metadata found ${inferenceLines.length} inference(s) for ${context}`);
    }
    return inferenceLines;
  } catch (err) {
    console.warn(`[analyse] Social snippet analysis failed (${context}): ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

export async function extractStructuredEvidence(
  sentences: string[],
  apiKey: string,
): Promise<StructuredExtractionResult> {
  const userMessage = buildStructuredExtractionPrompt(sentences);
  return extractWithRetry(userMessage, apiKey, 'structured-extraction');
}

const FALLBACK_RESULT: AnalysisResult & { _filtered_sentences: string[] } = {
  positive_signals: [],
  negative_signals: [],
  toddler_score: 2.5,
  confidence: 0.1,
  summary: 'Not enough information yet.',
  _filtered_sentences: [],
};

export async function analyseRestaurantReviews(
  reviews_to_analyse: string[],
  review_source: 'filtered' | 'fallback',
  place_id?: string,
  restaurantName?: string,
  venueMeta?: VenueProfileInput,
  websiteUrl?: string,
): Promise<AnalysisResult & { _filtered_sentences: string[] }> {
  try {
    if (place_id) {
      const cached = getCachedAnalysis(place_id);
      if (cached) return cached;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(`[analyse] ANTHROPIC_API_KEY not configured${place_id ? ` (place_id: ${place_id})` : ''}`);
      return FALLBACK_RESULT;
    }

    let snippetTexts: string[] = [];
    if (restaurantName) {
      try {
        const { snippets } = await fetchExternalRestaurantMentions(restaurantName);
        snippetTexts = snippets.map((s) => s.snippet).filter(Boolean);
      } catch (err) {
        console.warn(
          `[analyse] External search unavailable${place_id ? ` (place_id: ${place_id})` : ''}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    let websiteTexts: string[] = [];
    if (websiteUrl) {
      try {
        const rawPages = await scrapeWebsiteRaw(websiteUrl);
        if (rawPages.length > 0) {
          websiteTexts = await analyseWebsiteMetadata(
            rawPages,
            apiKey,
            restaurantName ?? place_id ?? 'unknown',
          );
        }
        if (websiteTexts.length === 0) {
          const [siteTexts, menuTexts] = await Promise.all([
            scrapeWebsiteForFamilyInfo(websiteUrl),
            scrapeMenuPageForFamilyInfo(websiteUrl),
          ]);
          websiteTexts = [...siteTexts, ...menuTexts];
          if (websiteTexts.length > 0) {
            console.log(`[analyse] Regex website scrape found ${websiteTexts.length} inference(s) for "${restaurantName}"`);
          }
        }
      } catch (err) {
        console.warn(
          `[analyse] Website scrape failed${place_id ? ` (place_id: ${place_id})` : ''}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const [parentSubmissions, detailedSubmissions] = place_id
      ? await Promise.all([
          fetchSubmissionsForRestaurant(place_id).catch(() => []),
          fetchDetailedSubmissions(place_id).catch(() => []),
        ])
      : [[], []];

    const allReviewSnippets = [
      ...reviews_to_analyse,
      ...snippetTexts,
    ].filter(Boolean);

    const socialInferenceLines = await analyseSocialSnippets(
      allReviewSnippets,
      apiKey,
      restaurantName ?? place_id ?? 'unknown',
    );

    const preparedSentences = prepareReviewContext({
      googleReviews: reviews_to_analyse,
      searchSnippets: [...snippetTexts, ...websiteTexts, ...socialInferenceLines],
      parentSubmissions,
      detailedSubmissions,
    });

    if (preparedSentences.length === 0) {
      return FALLBACK_RESULT;
    }

    let extracted: StructuredExtractionResult;
    try {
      extracted = await extractStructuredEvidence(preparedSentences, apiKey);
    } catch (err) {
      console.error(
        `[analyse] Extraction failed${place_id ? ` (place_id: ${place_id})` : ''}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return FALLBACK_RESULT;
    }

    const hasAnySignal =
      extracted.high_chairs !== 'unknown' ||
      extracted.pram_space !== 'unknown' ||
      extracted.changing_table !== 'unknown' ||
      extracted.kids_menu !== 'unknown' ||
      extracted.staff_child_friendly !== 'unknown' ||
      extracted.noise_tolerant !== 'unknown' ||
      extracted.family_friendly !== 'unknown' ||
      extracted.spacious !== 'unknown' ||
      extracted.accommodating !== 'unknown' ||
      extracted.good_for_groups !== 'unknown' ||
      extracted.relaxed_atmosphere !== 'unknown' ||
      extracted.negative_signals.length > 0;

    if (!hasAnySignal) {
      return {
        ...FALLBACK_RESULT,
        summary: 'No toddler-relevant information was found in the provided reviews.',
      };
    }

    const profileInput: VenueProfileInput = venueMeta ?? { name: restaurantName ?? '' };
    const profile = inferVenueProfile(profileInput);
    const { adjustment: venueAdjustment, signals: venueSignals } = scoreVenueProfile(
      profile,
      profileInput.name.toLowerCase(),
    );

    console.log(`[analyse] Venue profile for "${profileInput.name}": adjustment=${venueAdjustment.toFixed(2)}, signals=${venueSignals.length}`);

    const scored = scoreStructuredExtraction(extracted, venueSignals, venueAdjustment);

    const confidence =
      review_source === 'fallback'
        ? Math.min(1, Math.max(0, scored.confidence * 0.7))
        : scored.confidence;

    const evidenceSentences = [
      ...extracted.evidence_quotes,
      ...extracted.negative_signals,
    ];

    let summary = 'No summary available.';
    try {
      const raw = await callClaude(
        TODDLER_SUMMARY_SYSTEM_PROMPT,
        buildSummaryPrompt(evidenceSentences),
        apiKey,
        128,
      );
      if (raw.trim()) summary = raw.trim();
    } catch (err) {
      console.warn(
        `[analyse] Summary generation failed${place_id ? ` (place_id: ${place_id})` : ''}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const result = {
      positive_signals: scored.positive_signals,
      negative_signals: scored.negative_signals,
      toddler_score: scored.toddler_score,
      confidence,
      summary,
      _filtered_sentences: evidenceSentences,
      signal_breakdown: scored.signal_breakdown,
    };

    if (place_id) {
      setCachedAnalysis(place_id, result);
    }

    return result;
  } catch (err) {
    console.error(
      `[analyse] Unexpected error in analyseRestaurantReviews${place_id ? ` (place_id: ${place_id})` : ''}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return FALLBACK_RESULT;
  }
}

export async function generateToddlerCardSummary(
  input: ToddlerSummaryInput,
): Promise<string> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[analyse] generateToddlerCardSummary: ANTHROPIC_API_KEY not configured');
      return 'Not enough information yet.';
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
  } catch (err) {
    console.error(`[analyse] generateToddlerCardSummary failed: ${err instanceof Error ? err.message : String(err)}`);
    return 'Not enough information yet.';
  }
}
