// Card d'un programme non actif (en pause ou terminé)
import type { Program, ProgramStatus } from '@/types/workout';

interface ProgramCardProps {
  /** Programme à afficher */
  program: Program;
  /** Appelé au tap sur "activer" */
  onActivate: () => void;
  /** Appelé au tap sur "voir" */
  onDetail: () => void;
  /** Appelé au tap sur "supprimer" */
  onDelete: () => void;
}

/** Labels des statuts non actifs */
const STATUS_LABELS: Partial<Record<ProgramStatus, string>> = {
  paused: 'En pause',
  completed: 'Terminé',
};

export function ProgramCard({ program, onActivate, onDetail, onDelete }: ProgramCardProps) {
  const statusLabel = STATUS_LABELS[program.status] ?? program.status;
  const isPaused = program.status === 'paused';

  const createdDate = new Date(program.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '3px var(--space-3)',
            borderRadius: 'var(--radius-full)',
            backgroundColor: isPaused ? 'rgba(197, 132, 238, 0.12)' : 'var(--color-bg)',
            color: isPaused ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-family)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {statusLabel}
        </span>

        {/* Bouton supprimer */}
        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border: 'none',
            padding: 'var(--space-1)',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            opacity: 0.5,
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-family)',
          }}
          aria-label="Supprimer"
        >
          ✕
        </button>
      </div>

      {/* Nom */}
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
          fontFamily: 'var(--font-family)',
          letterSpacing: '-0.01em',
        }}
      >
        {program.name}
      </p>

      {/* Date création */}
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-family)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        créé le {createdDate}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          onClick={onActivate}
          style={{
            flex: 1,
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-bg-dark)',
            border: 'none',
            color: 'var(--color-text-light)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          activer
        </button>
        <button
          onClick={onDetail}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-bg)',
            border: '1.5px solid var(--color-border)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
          }}
        >
          voir →
        </button>
      </div>
    </div>
  );
}
