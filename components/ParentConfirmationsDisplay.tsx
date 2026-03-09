import { CONFIRMATION_FEATURES, ConfirmationFeature, FeatureAggregation } from '@/lib/types';

const FEATURE_LABELS: Record<ConfirmationFeature, string> = {
  high_chairs: 'High chairs',
  pram_space: 'Pram space',
  changing_table: 'Changing table',
  kids_menu: 'Kids menu',
  friendly_staff: 'Friendly staff',
  easy_seating: 'Easy seating',
  toddler_tolerant: 'Toddler tolerant',
};

interface ParentConfirmationsDisplayProps {
  aggregation: FeatureAggregation;
  totalResponders: number;
}

function getConfidenceConfig(count: number): {
  icon: React.ReactNode;
  label: string;
  bar: string;
  text: string;
  bg: string;
  border: string;
} {
  if (count >= 3) {
    return {
      icon: (
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      label: `confirmed by ${count} parent${count > 1 ? 's' : ''}`,
      bar: 'bg-emerald-400',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    };
  }

  if (count >= 1) {
    return {
      icon: (
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
      label: `confirmed by ${count} parent${count > 1 ? 's' : ''}`,
      bar: 'bg-amber-400',
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    };
  }

  return {
    icon: (
      <span className="w-4 h-4 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
      </span>
    ),
    label: 'not yet confirmed',
    bar: 'bg-stone-200',
    text: 'text-stone-400',
    bg: 'bg-stone-50',
    border: 'border-stone-100',
  };
}

export default function ParentConfirmationsDisplay({
  aggregation,
  totalResponders,
}: ParentConfirmationsDisplayProps) {
  const confirmedFeatures = CONFIRMATION_FEATURES.filter((f) => aggregation[f] > 0);
  const maxCount = Math.max(...CONFIRMATION_FEATURES.map((f) => aggregation[f]), 1);

  if (totalResponders === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-stone-800 mb-1">Parent confirmations</h2>
        <p className="text-xs text-stone-400">No parent confirmations yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-stone-800">Parent confirmations</h2>
        <span className="ml-auto text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
          {totalResponders} {totalResponders === 1 ? 'parent' : 'parents'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {CONFIRMATION_FEATURES.map((feature) => {
          const count = aggregation[feature];
          const config = getConfidenceConfig(count);

          return (
            <div
              key={feature}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${config.bg} ${config.border}`}
            >
              <span className="flex-shrink-0">{config.icon}</span>
              <span className="text-xs font-medium text-stone-700 flex-1">
                {FEATURE_LABELS[feature]}
              </span>
              {count > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${config.bar}`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium tabular-nums ${config.text}`}>
                    {count}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-stone-400">—</span>
              )}
            </div>
          );
        })}
      </div>

      {confirmedFeatures.length > 0 && (
        <p className="text-xs text-stone-400 mt-3 pt-3 border-t border-stone-100">
          Based on {totalResponders} parent visit{totalResponders > 1 ? 's' : ''} with a toddler
        </p>
      )}
    </div>
  );
}
