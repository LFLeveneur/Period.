// Légende compacte des phases du cycle pour le calendrier
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import type { CyclePhaseDisplay } from '@/types/cycle';

/** Phases affichées dans la légende (toutes les 5 sous-phases) */
const LEGEND_PHASES: CyclePhaseDisplay[] = [
  'menstrual',
  'follicular',
  'ovulation',
  'luteal_early',
  'luteal_late',
];

export function CalendarLegend() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-3)',
        overflowX: 'auto',
        paddingBottom: 'var(--space-1)',
      }}
    >
      {LEGEND_PHASES.map(phase => {
        const config = PHASE_DISPLAY_CONFIG[phase];
        return (
          <div
            key={phase}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              flexShrink: 0,
            }}
          >
            {/* Chip colorée */}
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: config.colorLight,
                border: `2px solid ${config.color}`,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
