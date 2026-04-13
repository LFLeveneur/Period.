// Card affichant un élément de la liste d'historique des séances
import { CyclePhaseBadge } from '@/components/ui/CyclePhaseBadge';
import { FEELING_LABELS } from '@/constants/session';
import type { SessionHistoryItem } from '@/types/workout';

interface HistoryCardProps {
  /** Données de la séance historisée */
  entry: SessionHistoryItem;
  /** Callback au tap sur la card */
  onTap: () => void;
}

/** Formate une date ISO en "Lundi 7 avril · 18h30" */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date);
  const dayNum = date.getDate();
  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  // Capitalise le premier caractère du jour
  const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${dayCapitalized} ${dayNum} ${monthName} · ${hours}h${minutes}`;
}

export function HistoryCard({ entry, onTap }: HistoryCardProps) {
  const feelingLabel = entry.feeling ? FEELING_LABELS[entry.feeling] : null;

  return (
    <button
      onClick={onTap}
      style={{
        width: '100%',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      {/* Ligne badges */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        {entry.cyclePhase && <CyclePhaseBadge phase={entry.cyclePhase} compact />}
        {feelingLabel && (
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            {feelingLabel}
          </span>
        )}
      </div>

      {/* Nom séance + programme */}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
        }}
      >
        {entry.sessionName}
        {entry.programName && (
          <span
            style={{
              fontWeight: 'var(--font-normal)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text-muted)',
            }}
          >
            {' '}— {entry.programName}
          </span>
        )}
      </p>

      {/* Ligne date + durée + flèche */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
          }}
        >
          {formatDate(entry.completedAt)}
          {entry.durationMinutes > 0 && ` · ${entry.durationMinutes} min`}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-base)' }}>→</span>
      </div>
    </button>
  );
}
