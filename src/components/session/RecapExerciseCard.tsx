// Card affichant le détail d'un exercice dans le récap de séance
import { RirInfo } from '@/components/ui/RirInfo';
import type { ExerciseHistoryDetail, SetDetails } from '@/types/workout';

interface RecapExerciseCardProps {
  exerciseHistory: ExerciseHistoryDetail;
}

/** Calcule le volume total d'un exercice (poids × reps, somme de toutes les séries) */
function computeExerciseVolume(setDetails: SetDetails[]): number {
  return setDetails.reduce((sum, s) => {
    const w = s.actual?.weight ?? 0;
    const r = s.actual?.reps ?? 0;
    return sum + w * r;
  }, 0);
}

/** Formate une ligne de série selon le type d'exercice */
function formatSetLine(set: SetDetails): string {
  const actual = set.actual;
  const parts: string[] = [];

  if (actual.weight !== undefined && actual.weight !== null) parts.push(`${actual.weight} kg`);
  if (actual.reps !== undefined && actual.reps !== null) parts.push(`${actual.reps} reps`);
  if (actual.added_load !== undefined && actual.added_load !== null) parts.push(`+${actual.added_load} kg`);
  if (actual.duration !== undefined && actual.duration !== null) {
    const m = Math.floor(actual.duration / 60);
    const s = actual.duration % 60;
    parts.push(m > 0 ? `${m}min ${s > 0 ? s + 's' : ''}` : `${s}s`);
  }
  if (actual.distance !== undefined && actual.distance !== null) parts.push(`${actual.distance} km`);
  if (actual.rir !== undefined && actual.rir !== null) parts.push(`RIR ${actual.rir}`);

  return parts.join(' · ') || '—';
}

/** Icône et couleur selon le sens du delta */
function getDeltaStyle(delta: number): { icon: string; color: string } {
  if (delta > 0) return { icon: '↑', color: 'var(--color-success)' };
  if (delta < 0) return { icon: '↓', color: 'var(--color-error)' };
  return { icon: '→', color: 'var(--color-text-muted)' };
}

export function RecapExerciseCard({ exerciseHistory }: RecapExerciseCardProps) {
  const sets = exerciseHistory.set_details ?? [];
  const volume = sets.length > 0 ? computeExerciseVolume(sets) : 0;
  const hasDelta =
    exerciseHistory.vs_previous_kg_delta !== null ||
    exerciseHistory.vs_same_phase_kg_delta !== null ||
    exerciseHistory.avg_rir !== null;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* En-tête — nom + résumé volume */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            flex: 1,
          }}
        >
          {exerciseHistory.exercise_name}
        </h3>

        {/* Résumé compact : X séries · Y kg total */}
        {sets.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '2px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              {sets.length} série{sets.length > 1 ? 's' : ''}
            </span>
            {volume > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-primary)',
                }}
              >
                {volume.toLocaleString('fr-FR')} kg
              </span>
            )}
          </div>
        )}
      </div>

      {/* Détail série par série */}
      {sets.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {sets.map((set, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              {/* Numéro de série */}
              <span
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  minWidth: '52px',
                  flexShrink: 0,
                }}
              >
                Série {set.set}
              </span>
              {/* Données */}
              <span
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text)',
                }}
              >
                {formatSetLine(set)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Comparaisons + RIR moyen */}
      {hasDelta && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          {exerciseHistory.vs_previous_kg_delta !== null && (() => {
            const { icon, color } = getDeltaStyle(exerciseHistory.vs_previous_kg_delta);
            const delta = exerciseHistory.vs_previous_kg_delta;
            return (
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-xs)',
                  color,
                }}
              >
                {icon} vs séance précédente :{' '}
                {delta >= 0 ? '+' : ''}{delta} kg de volume
              </p>
            );
          })()}

          {exerciseHistory.vs_same_phase_kg_delta !== null && (() => {
            const { icon, color } = getDeltaStyle(exerciseHistory.vs_same_phase_kg_delta);
            const delta = exerciseHistory.vs_same_phase_kg_delta;
            return (
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-xs)',
                  color,
                }}
              >
                {icon} vs même phase (cycle -1) :{' '}
                {delta >= 0 ? '+' : ''}{delta} kg de volume
              </p>
            );
          })()}

          {exerciseHistory.avg_rir !== null && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              RIR moyen <RirInfo /> : {exerciseHistory.avg_rir}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
