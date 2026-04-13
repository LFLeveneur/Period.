// Navigation horizontale entre les exercices de la séance active
import type { ActiveSetData } from '@/types/workout';
import type { SessionExerciseWithDetails } from '@/services/programService';

interface ExerciseNavProps {
  /** Liste des exercices dans l'ordre */
  exercises: SessionExerciseWithDetails[];
  /** ID de l'exercice actuellement affiché */
  currentId: string | null;
  /** État des exercices en mémoire */
  exercisesState: Record<string, { sets: ActiveSetData[]; completed: boolean }>;
  /** Callback au tap sur un exercice */
  onSelect: (sessionExerciseId: string) => void;
}

export function ExerciseNav({ exercises, currentId, exercisesState, onSelect }: ExerciseNavProps) {
  return (
    <div
      style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        scrollbarWidth: 'none',
        flexShrink: 0,
      }}
    >
      {exercises.map((ex, index) => {
        const id = ex.sessionExercise.id;
        const isActive = id === currentId;
        const exState = exercisesState[id];
        const isCompleted = exState?.completed ?? false;
        const name = ex.exercise?.name ?? 'exercice';
        // Troncature à 12 caractères pour un meilleur affichage
        const truncated = name.length > 12 ? name.slice(0, 12) + '…' : name;

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              flexShrink: 0,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: isActive ? '1px solid var(--color-primary)' : '1px solid transparent',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              fontWeight: isActive
                ? ('var(--font-bold)' as React.CSSProperties['fontWeight'])
                : ('var(--font-normal)' as React.CSSProperties['fontWeight']),
              cursor: 'pointer',
              // Fond : actif = primaire, complété = succès léger, sinon bg
              backgroundColor: isActive
                ? 'var(--color-primary)'
                : isCompleted
                ? 'var(--color-success-bg)'
                : 'var(--color-bg)',
              color: isActive
                ? 'var(--color-text)'
                : isCompleted
                ? 'var(--color-success)'
                : 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              transition: 'background-color var(--duration-fast)',
              whiteSpace: 'nowrap',
              // Numéro de l'exercice comme aide contextuelle
              position: 'relative' as React.CSSProperties['position'],
            }}
          >
            {/* Icône de validation pour les exercices terminés */}
            {isCompleted && (
              <span aria-hidden="true" style={{ fontSize: '10px', fontWeight: 700 }}>✓</span>
            )}
            {/* Numéro pour les exercices non actifs ni terminés */}
            {!isCompleted && !isActive && (
              <span
                aria-hidden="true"
                style={{
                  fontSize: '10px',
                  color: 'var(--color-text-muted)',
                  opacity: 0.6,
                }}
              >
                {index + 1}.
              </span>
            )}
            {truncated}
          </button>
        );
      })}
    </div>
  );
}
