// Ligne d'exercice dans la bibliothèque — catalogue ou exercice personnalisé
import type { AnyExercise } from '@/types/workout';

interface ExerciseRowProps {
  /** Exercice à afficher (catalogue ou personnalisé) */
  exercise: AnyExercise;
  /** Appelé au tap sur la ligne */
  onTap: () => void;
  /** Appelé au tap sur "modifier" — uniquement pour les exercices personnalisés */
  onEdit?: () => void;
  /** Appelé au tap sur "supprimer" — uniquement pour les exercices personnalisés */
  onDelete?: () => void;
}

/** Badge de catégorie coloré selon la valeur */
function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px var(--space-2)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-text)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
        fontFamily: 'var(--font-family)',
        whiteSpace: 'nowrap',
      }}
    >
      {category}
    </span>
  );
}

export function ExerciseRow({ exercise, onTap, onEdit, onDelete }: ExerciseRowProps) {
  const isCustom = exercise.source === 'custom';

  // Sous-titre : muscle · type
  const subtitle = [exercise.muscle_primary, exercise.type]
    .filter(Boolean)
    .join(' · ') || exercise.category || '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
      }}
      onClick={onTap}
    >
      {/* Infos principales */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: '4px',
          }}
        >
          <CategoryBadge category={exercise.category} />
          {isCustom && (
            <span
              style={{
                display: 'inline-block',
                padding: '2px var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-primary)',
                color: 'var(--color-primary)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-family)',
              }}
            >
              perso
            </span>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {exercise.name}
        </p>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-family)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions pour les exercices personnalisés */}
      {isCustom && (onEdit || onDelete) && (
        <div
          style={{ display: 'flex', gap: 'var(--space-2)' }}
          onClick={e => e.stopPropagation()}
        >
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                background: 'none',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-primary)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-family)',
                padding: '4px var(--space-2)',
                cursor: 'pointer',
              }}
            >
              modifier
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              style={{
                background: 'none',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-family)',
                padding: '4px var(--space-2)',
                cursor: 'pointer',
              }}
            >
              supprimer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
