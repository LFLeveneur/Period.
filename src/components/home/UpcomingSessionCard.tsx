// Card affichant une séance à venir avec la phase prévue
import type { UpcomingSession } from '@/types/workout';
import { CyclePhaseBadge } from '@/components/ui/CyclePhaseBadge';

interface UpcomingSessionCardProps {
  /** Données de la séance à venir */
  session: UpcomingSession;
  /** Callback au tap — navigue vers /session/:id/preview */
  onTap: () => void;
}

/** Formate une date YYYY-MM-DD en nom de jour en français */
function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { weekday: 'long' });
}

export function UpcomingSessionCard({ session, onTap }: UpcomingSessionCardProps) {
  const dayLabel = formatDayLabel(session.date);

  return (
    <button
      onClick={onTap}
      className="tappable"
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--color-surface)',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        fontFamily: 'var(--font-family)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      {/* Ligne haute : badge phase + jour + flèche */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {session.predictedPhase && (
            <CyclePhaseBadge phase={session.predictedPhase} compact />
          )}
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              textTransform: 'capitalize',
            }}
          >
            {dayLabel}
          </span>
        </div>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>→</span>
      </div>

      {/* Nom de la séance */}
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
        }}
      >
        {session.name}
      </p>
    </button>
  );
}
