import { AnalysisSignal, ParentSubmission, SnapshotCategory, SnapshotStatus, ToddlerSnapshot } from './types';

const BLANK_SNAPSHOT: ToddlerSnapshot = {
  high_chair: 'unknown',
  kids_menu: 'unknown',
  pram_space: 'unknown',
  changing_table: 'unknown',
  noise_level: 'unknown',
  staff_friendliness: 'unknown',
};

const POSITIVE_CATEGORY_MAP: Partial<Record<string, SnapshotCategory>> = {
  high_chair: 'high_chair',
  kids_menu: 'kids_menu',
  pram_space: 'pram_space',
  'pram or buggy space': 'pram_space',
  changing_table: 'changing_table',
  staff_child_friendly: 'staff_friendliness',
  'welcoming staff toward children': 'staff_friendliness',
  family_friendly: 'staff_friendliness',
  'high chairs available': 'high_chair',
  'kids menu': 'kids_menu',
  'spacious seating': 'pram_space',
  'family friendly atmosphere': 'staff_friendliness',
};

const NEGATIVE_CATEGORY_MAP: Partial<Record<string, SnapshotCategory>> = {
  cramped: 'pram_space',
  'cramped seating': 'pram_space',
  noise_issue: 'noise_level',
  'very loud environment': 'noise_level',
  not_child_friendly: 'staff_friendliness',
  'not suitable for children': 'staff_friendliness',
  'staff unfriendly toward children': 'staff_friendliness',
  'no space for prams': 'pram_space',
};

function statusFromSignals(
  category: SnapshotCategory,
  positiveSignals: AnalysisSignal[],
  negativeSignals: AnalysisSignal[],
): SnapshotStatus {
  const hasPositive = positiveSignals.some(
    (s) => POSITIVE_CATEGORY_MAP[s.category] === category,
  );
  const hasNegative = negativeSignals.some(
    (s) => NEGATIVE_CATEGORY_MAP[s.category] === category,
  );

  if (hasPositive && hasNegative) return 'limited';
  if (hasPositive) return 'available';
  if (hasNegative) return 'not_suitable';
  return 'unknown';
}

function deriveFromSignals(
  positiveSignals: AnalysisSignal[],
  negativeSignals: AnalysisSignal[],
): ToddlerSnapshot {
  const categories: SnapshotCategory[] = [
    'high_chair',
    'kids_menu',
    'pram_space',
    'changing_table',
    'noise_level',
    'staff_friendliness',
  ];

  const snapshot = { ...BLANK_SNAPSHOT };

  for (const cat of categories) {
    snapshot[cat] = statusFromSignals(cat, positiveSignals, negativeSignals);
  }

  return snapshot;
}

function aggregateSubmissions(
  submissions: ParentSubmission[],
): Partial<Record<SnapshotCategory, SnapshotStatus>> {
  if (submissions.length === 0) return {};

  const categories: SnapshotCategory[] = [
    'high_chair',
    'kids_menu',
    'pram_space',
    'changing_table',
    'noise_level',
    'staff_friendliness',
  ];

  const VALID_STATUSES = new Set<string>(['available', 'limited', 'unknown', 'not_suitable']);

  const result: Partial<Record<SnapshotCategory, SnapshotStatus>> = {};

  for (const cat of categories) {
    const votes = submissions
      .map((s) => s[cat])
      .filter((v): v is SnapshotStatus => !!v && VALID_STATUSES.has(v as string));

    if (votes.length === 0) continue;

    const counts: Record<string, number> = {};
    for (const v of votes) {
      counts[v] = (counts[v] ?? 0) + 1;
    }

    const sorted = (Object.entries(counts) as [SnapshotStatus, number][]).sort(
      (a, b) => b[1] - a[1],
    );
    result[cat] = sorted[0][0];
  }

  return result;
}

export function buildToddlerSnapshot(
  positiveSignals: AnalysisSignal[],
  negativeSignals: AnalysisSignal[],
  submissions: ParentSubmission[],
): ToddlerSnapshot {
  const aiSnapshot = deriveFromSignals(positiveSignals, negativeSignals);
  const parentOverrides = aggregateSubmissions(submissions);

  return {
    high_chair: parentOverrides.high_chair ?? aiSnapshot.high_chair,
    kids_menu: parentOverrides.kids_menu ?? aiSnapshot.kids_menu,
    pram_space: parentOverrides.pram_space ?? aiSnapshot.pram_space,
    changing_table: parentOverrides.changing_table ?? aiSnapshot.changing_table,
    noise_level: parentOverrides.noise_level ?? aiSnapshot.noise_level,
    staff_friendliness: parentOverrides.staff_friendliness ?? aiSnapshot.staff_friendliness,
  };
}
