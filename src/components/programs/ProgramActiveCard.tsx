// Card du programme actif — mis en avant sur la page des programmes
import type { Program } from '@/types/workout';

interface ProgramActiveCardProps {
  /** Programme actif à afficher */
  program: Program;
  /** Appelé au tap sur "mettre en pause" */
  onPause: () => void;
  /** Appelé au tap sur "voir le détail" */
  onDetail: () => void;
}

export function ProgramActiveCard({ program, onPause, onDetail }: ProgramActiveCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-dark)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-6)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Cercle décoratif arrière-plan */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '150px',
          height: '150px',
          backgroundColor: 'var(--color-primary)',
          borderRadius: 'var(--radius-full)',
          opacity: 0.12,
          pointerEvents: 'none',
        }}
      />

      {/* Badge actif */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px var(--space-3)',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            fontFamily: 'var(--font-family)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-text)', display: 'inline-block' }} />
          Actif
        </span>
        {program.duration_weeks && (
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-light)',
              opacity: 0.6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {program.duration_weeks} semaines
          </span>
        )}
      </div>

      {/* Nom du programme */}
      <h2
        style={{
          margin: 0,
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-light)',
          fontFamily: 'var(--font-family)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        {program.name}
      </h2>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          onClick={onDetail}
          style={{
            flex: 1,
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-primary)',
            border: 'none',
            color: 'var(--color-text)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          voir le détail →
        </button>
        <button
          onClick={onPause}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'transparent',
            border: '1.5px solid rgba(249, 237, 225, 0.25)',
            color: 'var(--color-text-light)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            opacity: 0.8,
          }}
        >
          pause
        </button>
      </div>
    </div>
  );
}
