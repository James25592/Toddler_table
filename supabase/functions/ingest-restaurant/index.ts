import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-5-haiku-20241022";
const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";
const REVIEW_CACHE_TTL_DAYS = 7;

const TODDLER_KEYWORDS = [
  "kid", "kids", "child", "children", "toddler", "baby", "family",
  "pram", "pushchair", "buggy", "high chair", "highchair",
  "kids menu", "family friendly", "space for pram",
];

interface IngestionRequest {
  place_id?: string;
  name?: string;
  address?: string;
  venue_type?: string;
  google_rating?: number;
  google_review_count?: number;
  image_url?: string;
  restaurant_id?: string;
  force_refresh?: boolean;
}

interface DbRestaurant {
  id: string;
  place_id: string | null;
  name: string;
  address: string;
  venue_type: string;
  google_rating: number;
  google_review_count: number;
  image_url: string;
  cached_reviews: string[];
  last_review_fetch: string | null;
  last_analysed_at: string | null;
}

const FeaturePresenceSchema = z.union([z.boolean(), z.literal("unknown")]);

const FeatureEvidenceSchema = z.object({
  high_chairs: z.array(z.string()),
  pram_space: z.array(z.string()),
  changing_table: z.array(z.string()),
  kids_menu: z.array(z.string()),
  staff_child_friendly: z.array(z.string()),
  noise_tolerant: z.array(z.string()),
});

const ExtractionResultSchema = z.object({
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

type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
type FeatureEvidence = z.infer<typeof FeatureEvidenceSchema>;

const FEATURE_EVIDENCE_SCHEMA = {
  type: "object",
  properties: {
    high_chairs: { type: "array", items: { type: "string" } },
    pram_space: { type: "array", items: { type: "string" } },
    changing_table: { type: "array", items: { type: "string" } },
    kids_menu: { type: "array", items: { type: "string" } },
    staff_child_friendly: { type: "array", items: { type: "string" } },
    noise_tolerant: { type: "array", items: { type: "string" } },
  },
  required: ["high_chairs", "pram_space", "changing_table", "kids_menu", "staff_child_friendly", "noise_tolerant"],
  additionalProperties: false,
};

const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    high_chairs: { oneOf: [{ type: "boolean" }, { type: "string", enum: ["unknown"] }] },
    pram_space: { oneOf: [{ type: "boolean" }, { type: "string", enum: ["unknown"] }] },
    changing_table: { oneOf: [{ type: "boolean" }, { type: "string", enum: ["unknown"] }] },
    kids_menu: { oneOf: [{ type: "boolean" }, { type: "string", enum: ["unknown"] }] },
    staff_child_friendly: { oneOf: [{ type: "boolean" }, { type: "string", enum: ["unknown"] }] },
    noise_tolerant: { oneOf: [{ type: "boolean" }, { type: "string", enum: ["unknown"] }] },
    negative_signals: { type: "array", items: { type: "string" } },
    evidence_quotes: { type: "array", items: { type: "string" } },
    feature_evidence: FEATURE_EVIDENCE_SCHEMA,
  },
  required: [
    "high_chairs",
    "pram_space",
    "changing_table",
    "kids_menu",
    "staff_child_friendly",
    "noise_tolerant",
    "negative_signals",
    "evidence_quotes",
    "feature_evidence",
  ],
  additionalProperties: false,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isReviewCacheStale(lastFetch: string | null): boolean {
  if (!lastFetch) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REVIEW_CACHE_TTL_DAYS);
  return new Date(lastFetch) < cutoff;
}

function filterToddlerReviews(reviews: string[]): string[] {
  return reviews.filter((r) => {
    const lower = r.toLowerCase();
    return TODDLER_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

function truncateReviews(reviews: string[], maxChars = 3000): string[] {
  const result: string[] = [];
  let total = 0;
  for (const review of reviews) {
    if (total >= maxChars) break;
    const remaining = maxChars - total;
    const text = review.length > remaining ? review.slice(0, remaining) : review;
    result.push(text);
    total += text.length;
  }
  return result;
}

async function fetchReviewsFromGoogle(placeId: string, apiKey: string): Promise<string[]> {
  const params = new URLSearchParams({ place_id: placeId, fields: "reviews", key: apiKey });
  const res = await fetch(`${PLACES_API_BASE}/details/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK") return [];
  const reviews: { text?: string }[] = data.result?.reviews ?? [];
  return reviews.map((r) => r.text ?? "").filter(Boolean);
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens = 1024,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Claude error: ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callClaudeWithJsonSchema(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens = 1024,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "json-output-1",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "extraction_result",
            schema: EXTRACTION_JSON_SCHEMA,
            strict: true,
          },
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 400 || res.status === 404) return "";
      throw new Error(`Claude error: ${res.status} — ${body}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseAndValidateExtraction(raw: string, context: string): ExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`[ingest] JSON parse failed (${context}):`, raw.slice(0, 500));
    throw new Error(`Failed to parse JSON from Claude response (${context})`);
  }

  const result = ExtractionResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error(`[ingest] Zod validation failed (${context}):`, result.error.format(), "raw:", raw.slice(0, 500));
    throw new Error(`Invalid extraction schema from Claude (${context}): ${result.error.message}`);
  }

  return result.data;
}

async function extractWithRetry(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  context: string,
): Promise<ExtractionResult> {
  let rawText = await callClaudeWithJsonSchema(systemPrompt, userMessage, apiKey, 1024);

  if (!rawText) {
    rawText = await callClaude(systemPrompt, userMessage, apiKey, 1024);
  }

  let firstError: Error | null = null;
  try {
    return parseAndValidateExtraction(rawText, context);
  } catch (err) {
    firstError = err instanceof Error ? err : new Error(String(err));
    console.warn(`[ingest] First parse attempt failed (${context}), retrying...`);
  }

  const retryRaw = await callClaude(systemPrompt, userMessage, apiKey, 1024);

  try {
    return parseAndValidateExtraction(retryRaw, `${context}-retry`);
  } catch {
    console.error(`[ingest] Retry also failed (${context}). Original error:`, firstError?.message);
    throw firstError ?? new Error(`Extraction failed after retry (${context})`);
  }
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting toddler-friendliness signals from restaurant reviews.

Given a set of reviews, extract the following information and return it as JSON:
{
  "high_chairs": true | false | "unknown",
  "pram_space": true | false | "unknown",
  "changing_table": true | false | "unknown",
  "kids_menu": true | false | "unknown",
  "staff_child_friendly": true | false | "unknown",
  "noise_tolerant": true | false | "unknown",
  "negative_signals": ["short plain-English description of each concern"],
  "evidence_quotes": ["verbatim short quote from reviews (max 120 chars each)"],
  "feature_evidence": {
    "high_chairs": ["verbatim quote supporting this feature (max 120 chars)"],
    "pram_space": ["verbatim quote supporting this feature (max 120 chars)"],
    "changing_table": ["verbatim quote supporting this feature (max 120 chars)"],
    "kids_menu": ["verbatim quote supporting this feature (max 120 chars)"],
    "staff_child_friendly": ["verbatim quote supporting this feature (max 120 chars)"],
    "noise_tolerant": ["verbatim quote supporting this feature (max 120 chars)"]
  }
}

Rules:
- Only set true/false if there is clear evidence. Use "unknown" if not mentioned.
- negative_signals: list specific concerns (cramped, loud, not welcoming, etc.)
- evidence_quotes: pick 3-5 concise verbatim phrases that best illustrate toddler-friendliness.
- feature_evidence: for EACH feature, list every verbatim quote that directly supports it. Use an empty array if there is no evidence. If multiple reviews mention the same feature, include a quote from each.
- Return only the JSON object, no prose.`;

const SUMMARY_SYSTEM_PROMPT = `You write concise, factual summaries for a toddler-friendly restaurant guide.
Given a list of evidence phrases, write one plain-English sentence (max 30 words) summarising whether the venue is good for toddlers and why.
Be specific. Do not start with "This restaurant". Return only the sentence.`;

interface FeatureWeightConfig {
  category: string;
  delta: number;
  minEvidence: number;
}

const FEATURE_WEIGHTS: Record<string, FeatureWeightConfig> = {
  high_chairs:          { category: "high_chair",            delta: 2, minEvidence: 2 },
  kids_menu:            { category: "kids_menu",             delta: 2, minEvidence: 2 },
  pram_space:           { category: "pram_space",            delta: 1, minEvidence: 1 },
  changing_table:       { category: "changing_table",        delta: 1, minEvidence: 1 },
  staff_child_friendly: { category: "staff_child_friendly",  delta: 1, minEvidence: 1 },
  noise_tolerant:       { category: "family_friendly",       delta: 1, minEvidence: 1 },
};

function scoreExtraction(e: ExtractionResult): {
  toddler_score: number;
  confidence: number;
  positive_signals: object[];
  negative_signals: object[];
} {
  const positiveSignals: { category: string; evidence: string }[] = [];
  const negativeSignals: { category: string; evidence: string }[] = [];
  let score = 2.5;
  let signalCount = 0;

  const fe: FeatureEvidence = e.feature_evidence;

  for (const [key, weight] of Object.entries(FEATURE_WEIGHTS)) {
    const feKey = key as keyof FeatureEvidence;
    const val = e[feKey];
    const quotes = fe[feKey]?.length ?? 0;

    if (val === true) {
      if (quotes >= weight.minEvidence) {
        score += weight.delta;
        signalCount++;
        positiveSignals.push({ category: weight.category, evidence: fe[feKey][0] ?? "" });
        console.log(`[scoring] ACCEPTED ${key}: true — ${quotes} quote(s) (required ${weight.minEvidence}) → +${weight.delta}`);
      } else {
        console.log(`[scoring] REJECTED ${key}: true — only ${quotes} quote(s), required ${weight.minEvidence} → treated as unknown`);
      }
    } else if (val === false) {
      if (quotes >= weight.minEvidence) {
        score -= weight.delta;
        signalCount++;
        negativeSignals.push({ category: weight.category, evidence: fe[feKey][0] ?? "" });
        console.log(`[scoring] ACCEPTED ${key}: false — ${quotes} quote(s) (required ${weight.minEvidence}) → -${weight.delta}`);
      } else {
        console.log(`[scoring] REJECTED ${key}: false — only ${quotes} quote(s), required ${weight.minEvidence} → treated as unknown`);
      }
    } else {
      console.log(`[scoring] SKIPPED ${key}: unknown`);
    }
  }

  for (const sig of e.negative_signals) {
    negativeSignals.push({ category: "not_child_friendly", evidence: sig });
    score -= 1;
    signalCount++;
    console.log(`[scoring] ACCEPTED negative_signal: "${sig}" → -1`);
  }

  const toddler_score = Math.min(5, Math.max(0, score));
  const confidence =
    signalCount >= 4 ? 0.85 : signalCount >= 2 ? 0.6 : signalCount >= 1 ? 0.3 : 0.1;

  console.log(`[scoring] Final score: ${toddler_score.toFixed(2)}, confidence: ${confidence.toFixed(2)}, signals: ${signalCount}`);

  return {
    toddler_score,
    confidence,
    positive_signals: positiveSignals,
    negative_signals: negativeSignals,
  };
}

async function runAnalysis(
  reviews: string[],
  reviewSource: "filtered" | "fallback",
  anthropicKey: string,
): Promise<{
  toddler_score: number;
  confidence: number;
  summary: string;
  positive_signals: object[];
  negative_signals: object[];
  evidence_quotes: string[];
  ai_negative_signals: string[];
  toddler_features: Record<string, unknown>;
}> {
  const truncated = truncateReviews(reviews);
  const reviewBlock = truncated.map((r, i) => `Review ${i + 1}:\n${r}`).join("\n\n");

  let extracted: ExtractionResult;
  try {
    extracted = await extractWithRetry(EXTRACTION_SYSTEM_PROMPT, reviewBlock, anthropicKey, "ingest-extraction");
  } catch (err) {
    console.error("[ingest] Extraction failed after retry:", err instanceof Error ? err.message : err);
    return {
      toddler_score: 2.5,
      confidence: 0.1,
      summary: "Unable to analyse reviews.",
      positive_signals: [],
      negative_signals: [],
      evidence_quotes: [],
      ai_negative_signals: [],
      toddler_features: {},
    };
  }

  const scored = scoreExtraction(extracted);
  const confidencePenalty = reviewSource === "fallback" ? 0.7 : 1;
  const scorePenalty = reviewSource === "fallback" ? 0.9 : 1;

  const evidenceQuotes = extracted.evidence_quotes.slice(0, 5);
  const aiNegativeSignals = extracted.negative_signals;

  const evidenceSentences = [...evidenceQuotes, ...aiNegativeSignals];
  let summary = "No summary available.";
  if (evidenceSentences.length > 0) {
    const summaryPrompt = evidenceSentences.map((s, i) => `${i + 1}. ${s}`).join("\n");
    summary =
      (await callClaude(SUMMARY_SYSTEM_PROMPT, summaryPrompt, anthropicKey, 128)).trim() ||
      "No summary available.";
  }

  return {
    toddler_score: Math.min(5, Math.max(0, scored.toddler_score * scorePenalty)),
    confidence: Math.min(1, scored.confidence * confidencePenalty),
    summary,
    positive_signals: scored.positive_signals,
    negative_signals: scored.negative_signals,
    evidence_quotes: evidenceQuotes,
    ai_negative_signals: aiNegativeSignals,
    toddler_features: {
      high_chairs: extracted.high_chairs,
      pram_space: extracted.pram_space,
      changing_table: extracted.changing_table,
      kids_menu: extracted.kids_menu,
      staff_child_friendly: extracted.staff_child_friendly,
      noise_tolerant: extracted.noise_tolerant,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: IngestionRequest = await req.json();
    const {
      place_id,
      name,
      address,
      venue_type,
      google_rating,
      google_review_count,
      image_url,
      restaurant_id,
      force_refresh = false,
    } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const id = restaurant_id ?? slugify(name);

    const { data: existing } = await supabase
      .from("restaurants")
      .select(
        "id, place_id, cached_reviews, last_review_fetch, last_analysed_at, google_rating, google_review_count, image_url, venue_type, address",
      )
      .eq("id", id)
      .maybeSingle();

    const row = existing as DbRestaurant | null;

    let allReviews: string[] = row?.cached_reviews ?? [];
    let newReviewFetch = row?.last_review_fetch ?? null;
    let googleApiCalled = false;

    const effectivePlaceId = place_id ?? row?.place_id ?? null;
    const reviewsNeedRefresh = force_refresh || isReviewCacheStale(row?.last_review_fetch ?? null);

    if (effectivePlaceId && googleKey && reviewsNeedRefresh) {
      allReviews = await fetchReviewsFromGoogle(effectivePlaceId, googleKey);
      newReviewFetch = new Date().toISOString();
      googleApiCalled = true;
    }

    const filtered = filterToddlerReviews(allReviews);
    const reviewsToAnalyse = filtered.length > 0 ? filtered : allReviews;
    const reviewSource: "filtered" | "fallback" = filtered.length > 0 ? "filtered" : "fallback";

    let analysisResult: Awaited<ReturnType<typeof runAnalysis>> | null = null;

    if (reviewsToAnalyse.length > 0) {
      analysisResult = await runAnalysis(reviewsToAnalyse, reviewSource, anthropicKey);
    }

    const upsertPayload: Record<string, unknown> = {
      id,
      place_id: effectivePlaceId ?? null,
      name,
      address: address ?? row?.address ?? "",
      venue_type: venue_type ?? row?.venue_type ?? "restaurant",
      google_rating: google_rating ?? row?.google_rating ?? 0,
      google_review_count: google_review_count ?? row?.google_review_count ?? 0,
      image_url: image_url ?? row?.image_url ?? "",
      cached_reviews: allReviews,
      last_review_fetch: newReviewFetch,
      last_analysed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (analysisResult) {
      upsertPayload.toddler_score = analysisResult.toddler_score;
      upsertPayload.confidence = analysisResult.confidence;
      upsertPayload.summary = analysisResult.summary;
      upsertPayload.positive_signals = analysisResult.positive_signals;
      upsertPayload.negative_signals = analysisResult.negative_signals;
      upsertPayload.evidence_quotes = analysisResult.evidence_quotes;
      upsertPayload.ai_negative_signals = analysisResult.ai_negative_signals;
      upsertPayload.toddler_features = analysisResult.toddler_features;
    }

    const { error: upsertError } = await supabase
      .from("restaurants")
      .upsert(upsertPayload, { onConflict: "id" });

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        id,
        google_api_called: googleApiCalled,
        review_cache_used: !googleApiCalled && allReviews.length > 0,
        toddler_score: analysisResult?.toddler_score ?? null,
        confidence: analysisResult?.confidence ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
