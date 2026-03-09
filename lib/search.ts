const CUSTOM_SEARCH_API_BASE = 'https://www.googleapis.com/customsearch/v1';

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

  const res = await fetch(`${CUSTOM_SEARCH_API_BASE}?${params}`);

  if (!res.ok) {
    throw new Error(`Custom Search API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const items: { title?: string; snippet?: string; link?: string }[] = data.items ?? [];

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
    throw new Error('GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_CX must be set');
  }

  const queries = [
    `"${restaurantName}" Guildford toddler`,
    `"${restaurantName}" Guildford high chair`,
  ];

  const resultsPerQuery = 5;

  const [toddlerResults, highChairResults] = await Promise.all(
    queries.map((q) => runQuery(q, apiKey, cx, resultsPerQuery)),
  );

  const combined = [...toddlerResults, ...highChairResults];
  const seen = new Set<string>();
  const deduped: SearchSnippet[] = [];

  for (const item of combined) {
    if (!seen.has(item.link)) {
      seen.add(item.link);
      deduped.push(item);
    }
    if (deduped.length >= 10) break;
  }

  return { snippets: deduped };
}
