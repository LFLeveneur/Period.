// Fiche détail d'un exercice — bottom sheet en lecture seule
import { useEffect } from 'react';
import type { AnyExercise } from '@/types/workout';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface ExerciseDetailSheetProps {
  /** Contrôle l'ouverture du drawer */
  isOpen: boolean;
  /** Exercice à afficher — null quand fermé */
  exercise: AnyExercise | null;
  /** Callback de fermeture */
  onClose: () => void;
}

/** Ligne de détail avec label et valeur */
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-family)',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--text-sm)',
          color: value ? 'var(--color-text)' : 'var(--color-text-muted)',
          fontFamily: 'var(--font-family)',
          textAlign: 'right',
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

export function ExerciseDetailSheet({ isOpen, exercise, onClose }: ExerciseDetailSheetProps) {
  // Fermeture via Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloque le scroll du body quand ouvert
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !exercise) return null;

  const isCustom = exercise.source === 'custom';

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(47, 0, 87, 0.4)',
        zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'],
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* Drawer depuis le bas */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '85vh',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: 'var(--space-6) var(--space-4)',
          overflowY: 'auto',
          animation: 'slideUp var(--duration-slow) ease both',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Indicateur de glissement */}
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
            margin: '0 auto',
          }}
        />

        {/* Titre */}
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {exercise.name}
        </h2>

        {/* Détails */}
        <div>
          <DetailRow label="catégorie" value={exercise.category} />
          <DetailRow label="sous-catégorie" value={exercise.subcategory} />
          <DetailRow label="type" value={exercise.type} />
          <DetailRow label="muscle principal" value={exercise.muscle_primary} />
          <DetailRow label="muscle secondaire" value={exercise.muscle_secondary} />
          {isCustom && (
            <DetailRow label="notes" value={exercise.notes} />
          )}
        </div>

        {/* Bouton fermer */}
        <PrimaryButton variant="secondary" onClick={onClose}>
          fermer
        </PrimaryButton>
      </div>
    </div>
  );
}
