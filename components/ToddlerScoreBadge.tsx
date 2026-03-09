interface ToddlerScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getScoreColour(score: number) {
  if (score >= 4.5) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  if (score >= 3.5) return { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', dot: 'bg-lime-500' };
  if (score >= 2.5) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
  return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
}

function getScoreLabel(score: number) {
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Good';
  if (score >= 2.5) return 'Moderate';
  return 'Challenging';
}

export default function ToddlerScoreBadge({ score, size = 'md', showLabel = false }: ToddlerScoreBadgeProps) {
  const colours = getScoreColour(score);
  const label = getScoreLabel(score);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${colours.bg} ${colours.text} ${colours.border} ${sizeClasses[size]} font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colours.dot}`} />
      <span>{score.toFixed(1)}</span>
      {showLabel && <span className="text-opacity-80">· {label}</span>}
    </div>
  );
}

export { getScoreLabel, getScoreColour };
