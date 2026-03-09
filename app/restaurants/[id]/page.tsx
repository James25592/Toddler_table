import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AnalysisSignal } from '@/lib/types';
import { getRestaurantByIdFromDb, getAllRestaurantIds } from '@/lib/restaurants';
import { fetchSubmissionsForRestaurant } from '@/lib/submissions';
import { fetchConfirmationsForRestaurant, aggregateConfirmations } from '@/lib/confirmations';
import { fetchDetailedSubmissions, aggregateDetailedSubmissions } from '@/lib/detailedSubmissions';
import { buildToddlerSnapshot } from '@/lib/snapshot';
import { computeStressLevel } from '@/lib/scoring';
import Header from '@/components/Header';
import ToddlerScoreBadge, { getScoreLabel } from '@/components/ToddlerScoreBadge';
import StarRating from '@/components/StarRating';
import ToddlerSnapshotCard from '@/components/ToddlerSnapshotCard';
import ParentConfirmationsDisplay from '@/components/ParentConfirmationsDisplay';
import ParentConfirmationForm from '@/components/ParentConfirmationForm';
import DetailedSubmissionsDisplay from '@/components/DetailedSubmissionsDisplay';
import DetailedSubmissionForm from '@/components/DetailedSubmissionForm';
import ShareRestaurant from '@/components/ShareRestaurant';
import EvidenceQuotesSection from '@/components/EvidenceQuotesSection';
import { TYPE_LABELS, CATEGORY_LABELS } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const ids = await getAllRestaurantIds();
  return ids.map((id) => ({ id }));
}

const sentimentConfig = {
  positive: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-800',
    quote: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Positive',
  },
  negative: {
    bg: 'bg-red-50',
    border: 'border-red-100',
    text: 'text-red-800',
    quote: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
    label: 'Concern',
  },
  neutral: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    text: 'text-stone-700',
    quote: 'text-stone-400',
    badge: 'bg-stone-100 text-stone-600',
    label: 'Neutral',
  },
};

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High confidence';
  if (confidence >= 0.5) return 'Moderate confidence';
  return 'Low confidence';
}

function getConfidenceStyle(confidence: number) {
  if (confidence >= 0.8) return { bar: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  if (confidence >= 0.5) return { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' };
  return { bar: 'bg-stone-300', text: 'text-stone-500', bg: 'bg-stone-50', border: 'border-stone-200' };
}

const sourceLabels: Record<string, string> = {
  review: 'Review',
  web_mention: 'Web mention',
};

function SignalCard({ signal, variant }: { signal: AnalysisSignal; variant: 'positive' | 'negative' }) {
  const label = CATEGORY_LABELS[signal.category] ?? signal.category;
  const isPositive = variant === 'positive';
  const sourceLabel = signal.source ? (sourceLabels[signal.source] ?? signal.source) : null;

  return (
    <div className={`rounded-xl border p-4 ${isPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPositive ? 'bg-emerald-500' : 'bg-red-400'}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
          {label}
        </span>
        {sourceLabel && (
          <span className="ml-auto text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
            {sourceLabel}
          </span>
        )}
      </div>
      <p className={`text-sm leading-relaxed pl-3.5 ${isPositive ? 'text-emerald-800' : 'text-red-800'}`}>
        &ldquo;{signal.evidence}&rdquo;
      </p>
    </div>
  );
}

interface PageProps {
  params: { id: string };
}

export default async function RestaurantPage({ params }: PageProps) {
  const restaurant = await getRestaurantByIdFromDb(params.id);

  if (!restaurant) notFound();

  const [submissions, confirmations, detailedSubmissions] = await Promise.all([
    fetchSubmissionsForRestaurant(restaurant.id),
    fetchConfirmationsForRestaurant(restaurant.id),
    fetchDetailedSubmissions(restaurant.id),
  ]);
  const aggregation = aggregateConfirmations(confirmations);
  const detailedAggregation = aggregateDetailedSubmissions(detailedSubmissions);
  const snapshot = buildToddlerSnapshot(
    restaurant.positiveSignals,
    restaurant.negativeSignals,
    submissions,
  );
  const { stress_level } = computeStressLevel(
    restaurant.positiveSignals,
    restaurant.negativeSignals,
    snapshot,
  );

  const scoreLabel = getScoreLabel(restaurant.toddlerScore);
  const confidenceStyle = getConfidenceStyle(restaurant.confidence);
  const confidenceLabel = getConfidenceLabel(restaurant.confidence);
  const isLowConfidence = restaurant.confidence < 0.5;
  const totalSignals = restaurant.positiveSignals.length + restaurant.negativeSignals.length;

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all venues
        </Link>

        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden mb-6">
          <div className="relative h-56 sm:h-72 bg-stone-100">
            <Image
              src={restaurant.image}
              alt={restaurant.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="bg-white/90 backdrop-blur-sm text-stone-600 text-xs font-medium px-2 py-1 rounded-full">
                {TYPE_LABELS[restaurant.type] ?? restaurant.type}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-stone-900 leading-tight">{restaurant.name}</h1>
                <p className="text-sm text-stone-400 mt-1">{restaurant.address}</p>
              </div>
              <div className="flex-shrink-0">
                <ToddlerScoreBadge score={restaurant.toddlerScore} size="lg" />
              </div>
            </div>

            <StarRating rating={restaurant.googleRating} reviewCount={restaurant.googleReviewCount} />

            <div className="mt-5 pt-5 border-t border-stone-100 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Toddler summary</span>
                  <span className="text-xs text-stone-400">· {scoreLabel}</span>
                </div>
                <p className="text-stone-600 text-sm leading-relaxed">{restaurant.summary}</p>
              </div>

              <div className={`rounded-xl border p-4 ${confidenceStyle.bg} ${confidenceStyle.border}`}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${confidenceStyle.text}`}>
                      {confidenceLabel}
                    </span>
                    <span className="text-xs text-stone-400">
                      · based on {totalSignals} signal{totalSignals !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`text-xs font-medium tabular-nums ${confidenceStyle.text}`}>
                    {Math.round(restaurant.confidence * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${confidenceStyle.bar}`}
                    style={{ width: `${restaurant.confidence * 100}%` }}
                  />
                </div>
                {isLowConfidence && (
                  <p className="mt-3 text-xs text-stone-500 leading-relaxed">
                    Limited toddler-related information available in reviews.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <EvidenceQuotesSection
            evidenceQuotes={restaurant.evidence_quotes}
            negativeSignals={restaurant.ai_negative_signals}
          />
        </div>

        {detailedAggregation.total_responders > 0 && (
          <div className="mb-6">
            <DetailedSubmissionsDisplay aggregation={detailedAggregation} />
          </div>
        )}

        {confirmations.length > 0 && (
          <div className="mb-6">
            <ParentConfirmationsDisplay aggregation={aggregation} totalResponders={confirmations.length} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-stone-800">Positive signals</h2>
              <span className="ml-auto text-xs text-stone-400">{restaurant.positiveSignals.length}</span>
            </div>
            {restaurant.positiveSignals.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No positive signals found in reviews.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {restaurant.positiveSignals.map((signal, i) => (
                  <SignalCard key={i} signal={signal} variant="positive" />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-stone-800">Things to know</h2>
              <span className="ml-auto text-xs text-stone-400">{restaurant.negativeSignals.length}</span>
            </div>
            {restaurant.negativeSignals.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No concerns found in reviews.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {restaurant.negativeSignals.map((signal, i) => (
                  <SignalCard key={i} signal={signal} variant="negative" />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-semibold text-stone-800">Evidence from reviews</h2>
            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              {restaurant.reviewEvidence.length} extracts
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {restaurant.reviewEvidence.map((review, i) => {
              const config = sentimentConfig[review.sentiment];
              return (
                <div key={i} className={`rounded-xl border p-4 ${config.bg} ${config.border}`}>
                  <div className="flex items-start gap-3">
                    <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.quote}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${config.text}`}>{review.text}</p>
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-xs font-medium text-stone-500">{review.author}</span>
                        <span className="text-stone-300">·</span>
                        <span className="text-xs text-stone-400">{review.date}</span>
                        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ToddlerSnapshotCard snapshot={snapshot} submissionCount={submissions.length} stressLevel={stress_level} />

        <div className="mt-6">
          <ShareRestaurant
            restaurant={restaurant}
            aggregation={detailedAggregation}
            confirmationCount={confirmations.length}
            pageUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/restaurants/${restaurant.id}`}
          />
        </div>

        <div className="mt-4 bg-sky-50 border border-sky-100 rounded-2xl px-5 py-4">
          <p className="text-sm font-semibold text-stone-800 mb-0.5">Help other parents 👶</p>
          <p className="text-xs text-stone-500 leading-relaxed">
            It takes 20 seconds to share your experience and makes the guide better for everyone.
          </p>
        </div>

        <div className="mt-3">
          <DetailedSubmissionForm restaurantId={restaurant.id} restaurantName={restaurant.name} />
        </div>

        <div className="mt-4">
          <ParentConfirmationForm restaurantId={restaurant.id} restaurantName={restaurant.name} />
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Data extracted from mock reviews for MVP purposes.
        </p>
      </main>
    </div>
  );
}
