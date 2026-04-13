// Modale de sélection du ressenti de fin de séance
import type { WorkoutFeeling } from '@/types/workout';
import { FEELING_LABELS } from '@/constants/session';

interface FeelingModalProps {
  isOpen: boolean;
  onSelect: (feeling: WorkoutFeeling) => void;
  onCancel: () => void;
  /** true pendant la sauvegarde en base */
  isLoading: boolean;
}

/** Ordre d'affichage des ressentis */
const FEELING_ORDER: WorkoutFeeling[] = ['survival', 'notgreat', 'solid', 'pr'];

export function FeelingModal({ isOpen, onSelect, onCancel, isLoading }: FeelingModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={isLoading ? undefined : onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(47, 0, 87, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      {/* Feuille bottom sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) var(--radius-lg) var(--radius-lg)',
          width: '100%',
          maxWidth: '480px',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          animation: 'slideUp var(--duration-slow) ease both',
        }}
      >
        {/* Titre */}
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
          }}
        >
          comment s'est passée la séance ?
        </h2>

        <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />

        {/* Options de ressenti */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {FEELING_ORDER.map(feeling => (
            <button
              key={feeling}
              onClick={() => !isLoading && onSelect(feeling)}
              disabled={isLoading}
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                textAlign: 'left',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-text)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              {isLoading && (
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid var(--color-primary)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                    flexShrink: 0,
                  }}
                />
              )}
              {FEELING_LABELS[feeling]}
            </button>
          ))}
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />

        {/* Bouton annuler */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            background: 'transparent',
            border: 'none',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-muted)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            padding: 'var(--space-2)',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          annuler
        </button>
      </div>
    </div>
  );
}
