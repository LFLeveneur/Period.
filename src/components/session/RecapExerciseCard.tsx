// Card affichant le détail d'un exercice dans le récap de séance
import { RirInfo } from '@/components/ui/RirInfo';
import type { ExerciseHistoryDetail, SetDetails } from '@/types/workout';

interface RecapExerciseCardProps {
  exerciseHistory: ExerciseHistoryDetail;
}

function formatSetLine(set: SetDetails): string {
  const actual = set.actual;
  const parts: string[] = [];

  if (actual.weight !== undefined) parts.push(`${actual.weight}kg`);
  if (actual.reps !== undefined) parts.push(`${actual.reps} reps`);
  if (actual.duration !== undefined) {
    const m = Math.floor(actual.duration / 60);
    const s = actual.duration % 60;
    parts.push(`${m}:${String(s).padStart(2, '0')}`);
  }
  if (actual.distance !== undefined) parts.push(`${actual.distance}km`);
  if (actual.rir !== undefined) parts.push(`RIR ${actual.rir}`);

  return parts.join(' · ');
}

function getProgressionIcon(
  progression: ExerciseHistoryDetail['progression']
): { icon: string; color: string } {
  switch (progression) {
    case 'up':
      return { icon: '↑', color: 'var(--color-success)' };
    case 'down':
      return { icon: '↓', color: 'var(--color-error)' };
    default:
      return { icon: '→', color: 'var(--color-text-muted)' };
  }
}

export function RecapExerciseCard({ exerciseHistory }: RecapExerciseCardProps) {
  const { icon: progIcon, color: progColor } = getProgressionIcon(exerciseHistory.progression);
  const sets = exerciseHistory.set_details ?? [];

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      {/* Nom de l'exercice */}
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
        }}
      >
        {exerciseHistory.exercise_name}
      </h3>

      {/* Séries */}
      {sets.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          {sets.map((set, idx) => (
            <p
              key={idx}
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text)',
              }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>
                Série {set.set} :&nbsp;
              </span>
              {formatSetLine(set)}
            </p>
          ))}
        </div>
      )}

      {/* Comparaisons */}
      {(exerciseHistory.vs_previous_kg_delta !== null ||
        exerciseHistory.vs_same_phase_kg_delta !== null ||
        exerciseHistory.avg_rir !== null) && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          {exerciseHistory.vs_previous_kg_delta !== null && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: progColor,
              }}
            >
              {progIcon} vs séance précédente :{' '}
              {exerciseHistory.vs_previous_kg_delta >= 0 ? '+' : ''}
              {exerciseHistory.vs_previous_kg_delta}kg
            </p>
          )}

          {exerciseHistory.vs_same_phase_kg_delta !== null && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color:
                  exerciseHistory.vs_same_phase_kg_delta > 0
                    ? 'var(--color-success)'
                    : exerciseHistory.vs_same_phase_kg_delta < 0
                    ? 'var(--color-error)'
                    : 'var(--color-text-muted)',
              }}
            >
              {exerciseHistory.vs_same_phase_kg_delta >= 0 ? '↑' : '↓'} vs même phase (cycle -1) :{' '}
              {exerciseHistory.vs_same_phase_kg_delta >= 0 ? '+' : ''}
              {exerciseHistory.vs_same_phase_kg_delta}kg
            </p>
          )}

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
