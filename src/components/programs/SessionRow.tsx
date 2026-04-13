// Ligne de séance dans la page détail programme
import type { SessionWithExercises } from '@/services/programService';
import type { SessionStatus } from '@/types/workout';

interface SessionRowProps {
  /** Séance avec ses exercices */
  session: SessionWithExercises;
  /** Appelé au tap sur la ligne */
  onTap: () => void;
}

/** Labels des jours de la semaine (0=Lundi … 6=Dimanche) */
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** Couleurs des badges de statut */
const STATUS_STYLES: Record<SessionStatus, { color: string; bg: string }> = {
  pending: { color: 'var(--color-text-muted)', bg: 'transparent' },
  completed: { color: 'var(--color-success)', bg: 'transparent' },
  skipped: { color: 'var(--color-text-muted)', bg: 'transparent' },
};

/** Labels des statuts */
const STATUS_LABELS: Record<SessionStatus, string> = {
  pending: 'à faire',
  completed: 'terminée',
  skipped: 'ignorée',
};

export function SessionRow({ session, onTap }: SessionRowProps) {
  const { session: s, exercises } = session;
  const statusStyle = STATUS_STYLES[s.status];
  const dayLabel = s.day_of_week !== null ? DAY_LABELS[s.day_of_week] : null;
  const exerciseCount = exercises.length;

  return (
    <button
      onClick={onTap}
      className="tappable"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        fontFamily: 'var(--font-family)',
        textAlign: 'left',
      }}
    >
      {/* Infos séance */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {s.name}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 'var(--text-sm)',
            color: statusStyle.color,
          }}
        >
          {exerciseCount} exercice{exerciseCount !== 1 ? 's' : ''} ·{' '}
          <span style={{ color: statusStyle.color }}>{STATUS_LABELS[s.status]}</span>
        </p>
      </div>

      {/* Jour et flèche */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        {dayLabel && (
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            {dayLabel}
          </span>
        )}
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-base)' }}>→</span>
      </div>
    </button>
  );
}
