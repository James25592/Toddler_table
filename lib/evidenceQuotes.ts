const MAX_QUOTE_LENGTH = 120;
const MAX_QUOTES = 3;

export function getTopEvidenceQuotes(quotes: string[] | undefined): string[] {
  if (!quotes || quotes.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of quotes) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const normalised = trimmed.toLowerCase();
    if (seen.has(normalised)) continue;
    seen.add(normalised);

    const quote = trimmed.length > MAX_QUOTE_LENGTH
      ? trimmed.slice(0, MAX_QUOTE_LENGTH - 1).trimEnd() + '\u2026'
      : trimmed;

    result.push(quote);
    if (result.length >= MAX_QUOTES) break;
  }

  return result;
}

export function getTopNegativeSignals(signals: string[] | undefined): string[] {
  if (!signals || signals.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of signals) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const normalised = trimmed.toLowerCase();
    if (seen.has(normalised)) continue;
    seen.add(normalised);

    const signal = trimmed.length > MAX_QUOTE_LENGTH
      ? trimmed.slice(0, MAX_QUOTE_LENGTH - 1).trimEnd() + '\u2026'
      : trimmed;

    result.push(signal);
  }

  return result;
}
