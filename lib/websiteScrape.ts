const SCRAPE_TIMEOUT_MS = 8_000;
const MAX_TEXT_CHARS = 3_000;

const KIDS_MENU_PATTERNS = [
  /kids?\s*(menu|meal|option|section|eat)/i,
  /children'?s?\s*(menu|meal|option)/i,
  /junior\s+menu/i,
  /little\s+ones?\s*(menu|meal|section)/i,
  /mini\s+menu/i,
  /for\s+the\s+little\s+ones?/i,
  /family\s+menu/i,
];

const HIGH_CHAIR_PATTERNS = [
  /high\s*chair/i,
  /highchair/i,
  /booster\s+seat/i,
  /child\s+seat/i,
  /baby\s+seat/i,
];

const CHANGING_TABLE_PATTERNS = [
  /baby\s+chang/i,
  /changing\s+(table|facilit|room)/i,
  /parent\s+(and|&)\s+baby/i,
  /baby.friendly\s+toilet/i,
  /nappy\s+chang/i,
];

export interface WebsiteScrapeResult {
  text: string;
  source: 'website' | 'menu';
  inferred: {
    kids_menu: boolean | null;
    high_chairs: boolean | null;
    changing_table: boolean | null;
  };
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function inferFromText(text: string): WebsiteScrapeResult['inferred'] {
  const kids_menu = KIDS_MENU_PATTERNS.some((p) => p.test(text)) ? true : null;
  const high_chairs = HIGH_CHAIR_PATTERNS.some((p) => p.test(text)) ? true : null;
  const changing_table = CHANGING_TABLE_PATTERNS.some((p) => p.test(text)) ? true : null;
  return { kids_menu, high_chairs, changing_table };
}

function buildInferenceText(inferred: WebsiteScrapeResult['inferred'], source: string): string {
  const lines: string[] = [];
  if (inferred.kids_menu === true)
    lines.push(`[${source}] This venue has a kids menu for children.`);
  if (inferred.high_chairs === true)
    lines.push(`[${source}] High chairs are available at this venue.`);
  if (inferred.changing_table === true)
    lines.push(`[${source}] Baby changing facilities are available at this venue.`);
  return lines.join('\n');
}

export async function scrapeWebsiteForFamilyInfo(websiteUrl: string): Promise<string[]> {
  if (!websiteUrl) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  try {
    const res = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ToddlerFriendlyBot/1.0)',
        Accept: 'text/html',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const text = extractTextFromHtml(html);
    const inferred = inferFromText(text);
    const inferenceText = buildInferenceText(inferred, 'Website');

    if (!inferenceText) return [];
    return [inferenceText];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function scrapeMenuPageForFamilyInfo(websiteUrl: string): Promise<string[]> {
  if (!websiteUrl) return [];

  const menuPaths = ['/menu', '/menus', '/food', '/kids-menu', '/children'];
  const baseUrl = new URL(websiteUrl).origin;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  try {
    for (const path of menuPaths) {
      try {
        const menuUrl = `${baseUrl}${path}`;
        const res = await fetch(menuUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ToddlerFriendlyBot/1.0)',
            Accept: 'text/html',
          },
        });

        if (!res.ok) continue;

        const html = await res.text();
        const text = extractTextFromHtml(html);
        const inferred = inferFromText(text);
        const inferenceText = buildInferenceText(inferred, 'Menu');

        if (inferenceText) {
          return [inferenceText];
        }
      } catch {
        continue;
      }
    }

    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
