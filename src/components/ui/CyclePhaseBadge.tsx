// Badge réutilisable pour afficher une phase du cycle
import type { CyclePhaseDisplay } from '@/types/cycle';
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';

interface CyclePhaseBadgeProps {
  /** Phase du cycle à afficher (5 valeurs UI) */
  phase: CyclePhaseDisplay;
  /** Si true, affiche uniquement l'emoji sans le label texte */
  compact?: boolean;
}

export function CyclePhaseBadge({ phase, compact = false }: CyclePhaseBadgeProps) {
  const config = PHASE_DISPLAY_CONFIG[phase];

  const style: React.CSSProperties = {
    backgroundColor: config.colorLight,
    color: config.color,
    borderRadius: 'var(--radius-sm)',
    padding: compact ? 'var(--space-1)' : 'var(--space-1) var(--space-2)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--font-semibold)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: compact ? undefined : 'var(--space-1)',
    whiteSpace: 'nowrap' as const,
  };

  if (compact) {
    return (
      <span style={style} aria-label={config.label}>
        {config.emoji}
      </span>
    );
  }

  return (
    <span style={style}>
      <span aria-hidden="true">{config.emoji}</span>
      {config.label}
    </span>
  );
}
