import { getTopEvidenceQuotes, getTopNegativeSignals } from '@/lib/evidenceQuotes';

interface EvidenceQuotesSectionProps {
  evidenceQuotes?: string[];
  negativeSignals?: string[];
}

export default function EvidenceQuotesSection({
  evidenceQuotes,
  negativeSignals,
}: EvidenceQuotesSectionProps) {
  const quotes = getTopEvidenceQuotes(evidenceQuotes);
  const warnings = getTopNegativeSignals(negativeSignals);

  if (quotes.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-4">
      {quotes.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-3.5 h-3.5 text-stone-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-stone-800">
              What reviewers said
            </h2>
          </div>

          <div className="space-y-3">
            {quotes.map((quote, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl bg-stone-50 border border-stone-200 px-4 py-3"
              >
                <svg
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-sm leading-relaxed text-stone-700">{quote}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-3.5 h-3.5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-stone-800">
              Things parents mentioned to be aware of
            </h2>
          </div>

          <div className="space-y-2">
            {warnings.map((signal, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                <p className="text-sm leading-relaxed text-amber-900">{signal}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
