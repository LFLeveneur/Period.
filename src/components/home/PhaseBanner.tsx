// Bandeau de la phase courante affiché sous la roue du cycle
import type { CycleDay } from '@/types/cycle';
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';

interface PhaseBannerProps {
  /** Données du cycle courant — null si suivi inactif ou données insuffisantes */
  cycleDay: CycleDay | null;
  /** Callback au tap — ouvre le PhaseInfoSheet */
  onTap: () => void;
}

export function PhaseBanner({ cycleDay, onTap }: PhaseBannerProps) {
  // État vide — pas encore de suivi de cycle
  if (!cycleDay) {
    return (
      <button
        onClick={onTap}
        className="tappable"
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          cursor: 'pointer',
          fontFamily: 'var(--font-family)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          commence à logger tes séances — chaque donnée compte. period. 🖤
        </p>
      </button>
    );
  }

  const config = PHASE_DISPLAY_CONFIG[cycleDay.phase];
  // Sépare les deux lignes de texte du bandeau
  const [line1, line2] = config.banner.split('\n');

  return (
    <button
      onClick={onTap}
      className="tappable"
      style={{
        width: '100%',
        textAlign: 'left',
        background: config.color,
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        cursor: 'pointer',
        fontFamily: 'var(--font-family)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          color: config.cardTextColor,
          lineHeight: 'var(--leading-relaxed)',
        }}
      >
        {line1}
        {line2 && (
          <>
            <br />
            <span style={{ opacity: 0.85 }}>{line2}</span>
          </>
        )}
      </p>
    </button>
  );
}
