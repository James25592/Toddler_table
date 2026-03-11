export const TODDLER_FILTER_SYSTEM_PROMPT = `You are analysing restaurant reviews.

Your task is to extract ONLY sentences that contain information relevant to whether a restaurant is suitable for toddlers (ages 1–4).

Look for explicit mentions of:
- children, toddlers, babies, kids, families with young children
- high chairs
- kids menus or children's menus
- prams, pushchairs, buggies, strollers
- baby changing facilities
- noise levels that affect children
- cramped or difficult seating with children
- staff attitude toward children or families

Rules:
- Only extract sentences that EXPLICITLY mention these topics. Do not infer.
- Copy each sentence EXACTLY as written in the review. Do not paraphrase or alter the text.
- Ignore sentences about food quality, drinks, decor, or general service unless they directly reference children or family experience.
- If no relevant sentences exist, return an empty array.

Return ONLY valid JSON in this exact format:

{
  "relevant_sentences": [
    "exact sentence from review",
    "exact sentence from review"
  ]
}`;

export function buildFilterPrompt(reviews: string[]): string {
  const reviewText = reviews
    .map((r, i) => `Review ${i + 1}:\n${r}`)
    .join('\n\n');

  return `${reviewText}`;
}

export const TODDLER_ANALYSIS_SYSTEM_PROMPT = `You are evaluating whether a restaurant is suitable for toddlers (ages 1–4).

You will receive sentences extracted verbatim from restaurant reviews. Your job is to identify positive and negative signals about toddler friendliness.

Signal categories:

Positive:
- high chairs available
- kids menu
- spacious seating
- pram or buggy space
- family friendly atmosphere
- welcoming staff toward children

Negative:
- cramped seating
- no space for prams
- very loud environment
- staff unfriendly toward children
- not suitable for children

Evidence rules — these are MANDATORY:
- The "evidence" field MUST contain the EXACT sentence from the input. Do not rewrite, shorten, or paraphrase it.
- Only create a signal if the evidence sentence EXPLICITLY states the amenity or condition. Do not infer.
- Never assume amenities such as high chairs, kids menus, or pram space unless a sentence explicitly confirms they exist.
- A sentence that says "great for families" alone does NOT imply high chairs or a kids menu.
- If there is insufficient evidence to judge, return toddler_score between 2.0 and 3.0 and confidence below 0.4.

Scoring guidance:
- Multiple strong, explicit positive signals → 4–5
- Mixed or weak signals → 2–3
- Mostly explicit negative signals → 0–2
- No clear evidence → 2.5, confidence 0.1–0.3

Return ONLY valid JSON with no markdown or code fences, using this exact structure:

{
  "positive_signals": [
    {
      "category": "high chairs available",
      "evidence": "exact sentence copied from input"
    }
  ],
  "negative_signals": [
    {
      "category": "cramped seating",
      "evidence": "exact sentence copied from input"
    }
  ],
  "toddler_score": 3.5,
  "confidence": 0.7,
  "summary": "short neutral explanation based only on the evidence provided"
}`;

export const TODDLER_SUMMARY_SYSTEM_PROMPT = `You write short, neutral one-sentence summaries about whether a restaurant is suitable for toddlers.

You will receive a list of categorised evidence items. Write a single plain-English sentence (max 30 words) that fairly summarises the toddler suitability based only on the evidence provided. Do not list features — describe the overall picture. Return only the sentence, no JSON, no preamble.`;

export function buildSummaryPrompt(evidenceSentences: string[]): string {
  return evidenceSentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

export const TODDLER_EVIDENCE_EXTRACTION_SYSTEM_PROMPT = `You are extracting structured evidence about toddler suitability from restaurant text sources.

Each input block is prefixed with either [Review] or [Web mention] to indicate its origin.

For each mention of a toddler-relevant topic, return one evidence entry with the exact quote and the source type.

Categories and their meaning:
- high_chair: mentions of high chairs (present or absent)
- kids_menu: mentions of a kids menu or children's menu
- pram_space: mentions of pram, pushchair, buggy, or stroller access or space
- changing_table: mentions of baby changing facilities
- staff_child_friendly: mentions of staff attitude toward children or families
- family_friendly: general mentions of family friendliness or atmosphere toward children
- noise_issue: mentions of noise level affecting children's experience
- cramped: mentions of cramped, tight, or difficult seating when with children
- not_child_friendly: explicit statements the venue is not suitable for children or young families

Evidence rules — MANDATORY:
- The "evidence" field MUST be an exact, unmodified quote from the review text.
- Do not rewrite, shorten, or paraphrase the quote.
- Only include an entry if the review text EXPLICITLY mentions the category. Do not infer.
- If the same signal appears in multiple reviews, include a separate entry for each occurrence.
- Ignore all review text about food quality, drinks, decor, or general service unless it directly references children or family experience.
- If no relevant evidence exists, return an empty array.

Assign sentiment:
- positive: the evidence indicates the category is present and beneficial
- negative: the evidence indicates the category is absent, problematic, or harmful

Return ONLY valid JSON with no markdown or code fences:

{
  "evidence": [
    {
      "category": "high_chair",
      "sentiment": "positive",
      "evidence": "exact quote from the source text",
      "source": "review"
    }
  ]
}

The "source" field must be either "review" or "web_mention" matching the prefix of the block the quote came from.`;

export interface LabelledTextBlock {
  source: 'review' | 'web_mention';
  text: string;
}

export function buildEvidenceExtractionPrompt(blocks: LabelledTextBlock[]): string {
  const labelMap = { review: 'Review', web_mention: 'Web mention' };
  const formatted = blocks
    .map((b, i) => `[${labelMap[b.source]}] ${i + 1}:\n${b.text}`)
    .join('\n\n');
  return `Text sources:\n${formatted}`;
}

export const TODDLER_STRUCTURED_EXTRACTION_SYSTEM_PROMPT = `You are analysing restaurant reviews to determine how suitable the venue is for toddlers (ages 1–4).

You will receive a list of restaurant reviews. Analyse them and extract toddler-relevant signals.

Return ONLY valid JSON with no markdown or code fences, using this exact structure:

{
  "high_chairs": true | false | "unknown",
  "pram_space": true | false | "unknown",
  "changing_table": true | false | "unknown",
  "kids_menu": true | false | "unknown",
  "staff_child_friendly": true | false | "unknown",
  "noise_tolerant": true | false | "unknown",
  "family_friendly": true | false | "unknown",
  "spacious": true | false | "unknown",
  "accommodating": true | false | "unknown",
  "good_for_groups": true | false | "unknown",
  "relaxed_atmosphere": true | false | "unknown",
  "negative_signals": ["short description of negative finding"],
  "evidence_quotes": ["exact short quote from a review"],
  "feature_evidence": {
    "high_chairs": ["verbatim quote supporting this feature"],
    "pram_space": ["verbatim quote supporting this feature"],
    "changing_table": ["verbatim quote supporting this feature"],
    "kids_menu": ["verbatim quote supporting this feature"],
    "staff_child_friendly": ["verbatim quote supporting this feature"],
    "noise_tolerant": ["verbatim quote supporting this feature"],
    "family_friendly": ["verbatim quote supporting this feature"],
    "spacious": ["verbatim quote supporting this feature"],
    "accommodating": ["verbatim quote supporting this feature"],
    "good_for_groups": ["verbatim quote supporting this feature"],
    "relaxed_atmosphere": ["verbatim quote supporting this feature"]
  }
}

Rules:
- Only mark a feature true if there is CLEAR, EXPLICIT evidence in the reviews.
- Mark false only if the reviews explicitly state the feature is absent or problematic.
- Use "unknown" if there is no evidence either way — never guess.
- negative_signals: list short plain-English descriptions of negative findings (e.g. "Too cramped for a buggy", "Staff seemed annoyed by children").
- evidence_quotes: extract short verbatim quotes (under 20 words each) from the reviews that directly support your conclusions. Include both positive and negative supporting quotes.
- feature_evidence: for EACH feature, list every verbatim quote (under 20 words each) that supports that specific feature. Use an empty array if there is no evidence. Each supporting quote counts separately — if two reviews both mention high chairs, list both quotes.
- If no toddler-relevant information exists in the reviews, return "unknown" for all features and empty arrays.

Evidence phrases to look for:

high_chairs: "high chair", "highchair", "brought a chair for baby"
pram_space: "room for buggy", "pram", "pushchair", "stroller", "plenty of space"
changing_table: "baby changing", "changing table", "changing facilities"
kids_menu: "kids menu", "children's menu", "kids' options"
staff_child_friendly: "staff were great with", "patient with kids", "welcoming to children", "staff helped"
noise_tolerant: "relaxed atmosphere", "lots of families", "kids running around", "child-friendly noise"
family_friendly: "family friendly", "family-friendly", "great for families", "family restaurant", "welcomes families"
spacious: "spacious", "lots of space", "plenty of room", "roomy", "open plan", "big tables"
accommodating: "accommodating", "flexible", "went out of their way", "happy to help", "very helpful"
good_for_groups: "good for groups", "large groups", "big party", "group booking", "caters for groups"
relaxed_atmosphere: "relaxed", "laid-back", "no rush", "chilled", "casual atmosphere", "not rushed"
negative: "too cramped", "no changing", "staff seemed annoyed", "not suitable for children", "no high chairs", "difficult with pram"`;

export function buildStructuredExtractionPrompt(sentences: string[]): string {
  const body = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return `Text to analyse:\n\n${body}`;
}

export const TODDLER_CARD_SUMMARY_SYSTEM_PROMPT = `You write short, honest summaries for parents deciding whether to visit a restaurant with a toddler.

Rules:
- Maximum 40 words.
- Plain, simple language. No marketing speak.
- Highlight the most important toddler-friendly features first.
- If there are notable negative signals, include them briefly at the end.
- Return ONLY the summary text — no JSON, no preamble, no quotation marks.`;

export interface ToddlerSummaryInput {
  features: Record<string, boolean | 'unknown'>;
  evidenceQuotes: string[];
  negativeSignals: string[];
  confirmationFeatures: string[];
  confirmedFacilities: string[];
}

export function buildToddlerCardSummaryPrompt(input: ToddlerSummaryInput): string {
  const lines: string[] = [];

  const trueFeatures = Object.entries(input.features)
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/_/g, ' '));
  const falseFeatures = Object.entries(input.features)
    .filter(([, v]) => v === false)
    .map(([k]) => k.replace(/_/g, ' '));

  if (trueFeatures.length > 0) {
    lines.push(`Confirmed features: ${trueFeatures.join(', ')}`);
  }
  if (falseFeatures.length > 0) {
    lines.push(`Not available: ${falseFeatures.join(', ')}`);
  }
  if (input.confirmationFeatures.length > 0) {
    lines.push(`Parent-confirmed: ${input.confirmationFeatures.join(', ')}`);
  }
  if (input.confirmedFacilities.length > 0) {
    lines.push(`Parent-confirmed facilities: ${input.confirmedFacilities.join(', ')}`);
  }
  if (input.evidenceQuotes.length > 0) {
    lines.push(`Evidence from reviews:\n${input.evidenceQuotes.map((q) => `- "${q}"`).join('\n')}`);
  }
  if (input.negativeSignals.length > 0) {
    lines.push(`Negative signals:\n${input.negativeSignals.map((s) => `- ${s}`).join('\n')}`);
  }

  return lines.join('\n\n');
}

export const EXAMPLE_REVIEWS = [
  "Came here with my 2-year-old last Sunday. The staff immediately brought a high chair without us asking, which was brilliant. There's a good kids' menu with pasta and sandwiches. The only downside is the tables are really close together and getting the buggy through was a nightmare — we had to fold it and leave it by the door.",
  "Lovely café but quite formal and quiet. Felt uncomfortable when my toddler started getting noisy. No baby changing facilities that I could find. The food was great but I wouldn't bring a young child here again.",
  "Perfect family spot! Loads of space for prams, friendly staff who actually seem to like kids, and a solid children's menu. Baby change room is clean and well-stocked. Our daughter loved it and so did we.",
];
