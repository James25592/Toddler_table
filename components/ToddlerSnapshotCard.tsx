import { SnapshotCategory, SnapshotStatus, StressLevel, ToddlerSnapshot } from '@/lib/types';

interface CategoryMeta {
  label: string;
  icon: React.ReactNode;
}

function HighChairIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2" />
      <path d="M10 8h4l1 8H9l1-8z" />
      <path d="M8 16v4M16 16v4" />
    </svg>
  );
}

function ForkKnifeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  );
}

function StrollerIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3C9 3 6 5 6 9h12a6 6 0 0 0-6-6z" />
      <path d="M6 9l-2 9" />
      <path d="M18 9l-2 9" />
      <circle cx="8" cy="19" r="1.5" />
      <circle cx="16" cy="19" r="1.5" />
      <path d="M4 7h16" />
    </svg>
  );
}

function BabyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M9 9h6" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SmileIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

const CATEGORY_META: Record<SnapshotCategory, CategoryMeta> = {
  high_chair: { label: 'High chair', icon: <HighChairIcon /> },
  kids_menu: { label: 'Kids menu', icon: <ForkKnifeIcon /> },
  pram_space: { label: 'Buggy & pram space', icon: <StrollerIcon /> },
  changing_table: { label: 'Changing facilities', icon: <BabyIcon /> },
  noise_level: { label: 'Noise level', icon: <VolumeIcon /> },
  staff_friendliness: { label: 'Staff friendliness', icon: <SmileIcon /> },
};

const STATUS_CONFIG: Record<SnapshotStatus, {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
}> = {
  available: {
    label: 'Available',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  limited: {
    label: 'Limited',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  not_suitable: {
    label: 'Not suitable',
    dot: 'bg-red-400',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
  unknown: {
    label: 'Unknown',
    dot: 'bg-stone-300',
    text: 'text-stone-400',
    bg: 'bg-stone-50',
    border: 'border-stone-100',
  },
};

const STRESS_CONFIG: Record<StressLevel, {
  label: string;
  description: string;
  barFill: string;
  barBg: string;
  badge: string;
  badgeText: string;
  segments: number;
}> = {
  relaxed: {
    label: 'Relaxed',
    description: 'Spacious, welcoming staff — easy outing',
    barFill: 'bg-emerald-400',
    barBg: 'bg-emerald-100',
    badge: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
    segments: 1,
  },
  manageable: {
    label: 'Manageable',
    description: 'Mixed signals — should be fine with some prep',
    barFill: 'bg-amber-400',
    barBg: 'bg-amber-100',
    badge: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700',
    segments: 2,
  },
  difficult: {
    label: 'Difficult',
    description: 'Cramped or unwelcoming — plan carefully',
    barFill: 'bg-red-400',
    barBg: 'bg-red-100',
    badge: 'bg-red-50 border-red-200',
    badgeText: 'text-red-700',
    segments: 3,
  },
};

const CATEGORY_ORDER: SnapshotCategory[] = [
  'high_chair',
  'kids_menu',
  'pram_space',
  'changing_table',
  'noise_level',
  'staff_friendliness',
];

interface ToddlerSnapshotCardProps {
  snapshot: ToddlerSnapshot;
  submissionCount: number;
  stressLevel: StressLevel;
}

export default function ToddlerSnapshotCard({ snapshot, submissionCount, stressLevel }: ToddlerSnapshotCardProps) {
  const stress = STRESS_CONFIG[stressLevel];

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-stone-800">Toddler amenities</h2>
        {submissionCount > 0 && (
          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full ml-auto">
            {submissionCount} parent {submissionCount === 1 ? 'report' : 'reports'}
          </span>
        )}
      </div>

      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 mb-4 ${stress.badge}`}>
        <div className="flex gap-1 flex-shrink-0">
          {[1, 2, 3].map((seg) => (
            <div
              key={seg}
              className={`h-2 w-5 rounded-full ${seg <= stress.segments ? stress.barFill : stress.barBg}`}
            />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-semibold ${stress.badgeText}`}>
            {stress.label}
          </span>
          <span className={`text-xs ${stress.badgeText} opacity-70 ml-1.5`}>
            — {stress.description}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const status = snapshot[cat];
          const config = STATUS_CONFIG[status];

          return (
            <div
              key={cat}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${config.bg} ${config.border}`}
            >
              <span className={`flex-shrink-0 ${config.text}`}>
                {meta.icon}
              </span>
              <span className="text-xs font-medium text-stone-700 flex-1">{meta.label}</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
                <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
