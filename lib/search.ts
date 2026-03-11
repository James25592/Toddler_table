const CUSTOM_SEARCH_API_BASE = 'https://www.googleapis.com/customsearch/v1';
const RESULTS_PER_QUERY = 3;
const MIN_SNIPPET_LENGTH = 20;

export interface SearchSnippet {
  title: string;
  snippet: string;
  link: string;
}

export interface ExternalMentionsResult {
  snippets: SearchSnippet[];
}

async function runQuery(query: string, apiKey: string, cx: string, limit: number): Promise<SearchSnippet[]> {
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: String(limit),
  });

  let res: Response;
  try {
    res = await fetch(`${CUSTOM_SEARCH_API_BASE}?${params}`);
  } catch (err) {
    throw new Error(`Custom Search API network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch {}
    throw new Error(`Custom Search API error: ${res.status} ${res.statusText} — ${body}`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error(`Custom Search API returned non-JSON response: ${err instanceof Error ? err.message : String(err)}`);
  }

  const items: { title?: string; snippet?: string; link?: string }[] =
    (data as { items?: { title?: string; snippet?: string; link?: string }[] }).items ?? [];

  return items.map((item) => ({
    title: item.title ?? '',
    snippet: item.snippet ?? '',
    link: item.link ?? '',
  }));
}

export async function fetchExternalRestaurantMentions(
  restaurantName: string,
): Promise<ExternalMentionsResult> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  if (!apiKey || !cx) {
    console.warn('[search] GOOGLE_CUSTOM_SEARCH_API_KEY or GOOGLE_CUSTOM_SEARCH_CX not set — skipping web search');
    return { snippets: [] };
  }

  const queries = [
    `"${restaurantName}" high chair`,
    `"${restaurantName}" kids menu`,
    `"${restaurantName}" family friendly`,
    `"${restaurantName}" child friendly`,
    `"${restaurantName}" pram stroller`,
  ];

  const queryResults = await Promise.all(
    queries.map(async (q) => {
      try {
        return await runQuery(q, apiKey, cx, RESULTS_PER_QUERY);
      } catch (err) {
        console.warn(`[search] Query failed for "${q}": ${err instanceof Error ? err.message : String(err)}`);
        return [] as SearchSnippet[];
      }
    }),
  );

  const combined = queryResults.flat();

  const seenLinks = new Set<string>();
  const seenSnippets = new Set<string>();
  const deduped: SearchSnippet[] = [];

  for (const item of combined) {
    const normalised = item.snippet.trim().toLowerCase();
    if (normalised.length < MIN_SNIPPET_LENGTH) continue;
    if (seenLinks.has(item.link) || seenSnippets.has(normalised)) continue;
    seenLinks.add(item.link);
    seenSnippets.add(normalised);
    deduped.push(item);
  }

  return { snippets: deduped };
}
