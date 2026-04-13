// Card comparaison "même phase, cycle précédent"
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import type { CyclePhaseDisplay } from '@/types/cycle';
import type { ExerciseHistoryDetail } from '@/types/workout';
import type { ExerciseHistoryEntry } from '@/types/workout';

interface PreviousPhaseCardProps {
  /** Exercice de la séance actuelle */
  current: ExerciseHistoryDetail;
  /** Exercice de la même phase au cycle précédent */
  previous: ExerciseHistoryEntry;
}

/** Extrait le poids max et les reps de la première série d'un historique */
function extractBestSet(sets: ExerciseHistoryEntry['set_details']): { weight: number | null; reps: number | null } {
  if (!sets || sets.length === 0) return { weight: null, reps: null };
  // Prend la série avec le volume le plus élevé
  let best = sets[0];
  for (const s of sets) {
    const vol = (s.actual?.weight ?? 0) * (s.actual?.reps ?? 0);
    const bestVol = (best.actual?.weight ?? 0) * (best.actual?.reps ?? 0);
    if (vol > bestVol) best = s;
  }
  return {
    weight: best.actual?.weight ?? null,
    reps: best.actual?.reps ?? null,
  };
}

/** Extrait le poids max et les reps depuis ExerciseHistoryDetail */
function extractBestSetFromDetail(detail: ExerciseHistoryDetail): { weight: number | null; reps: number | null } {
  const sets = detail.set_details;
  if (!sets || sets.length === 0) return { weight: null, reps: null };
  let best = sets[0];
  for (const s of sets) {
    const vol = (s.actual?.weight ?? 0) * (s.actual?.reps ?? 0);
    const bestVol = (best.actual?.weight ?? 0) * (best.actual?.reps ?? 0);
    if (vol > bestVol) best = s;
  }
  return {
    weight: best.actual?.weight ?? null,
    reps: best.actual?.reps ?? null,
  };
}

/** Calcule "il y a N semaines" depuis une date ISO */
function weeksAgo(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(1, Math.round(ms / (7 * 24 * 3600 * 1000)));
}

export function PreviousPhaseCard({ current, previous }: PreviousPhaseCardProps) {
  const prevPhase = previous.cycle_phase
    ? (previous.cycle_phase === 'luteal' ? 'luteal_early' : previous.cycle_phase) as CyclePhaseDisplay
    : null;
  const phaseLabel = prevPhase
    ? PHASE_DISPLAY_CONFIG[prevPhase]?.label
    : 'phase inconnue';

  const prevSet = extractBestSet(previous.set_details);
  const currSet = extractBestSetFromDetail(current);
  const weeks = weeksAgo(previous.completed_at);

  // Calcul du delta de poids
  const delta =
    currSet.weight !== null && prevSet.weight !== null ? currSet.weight - prevSet.weight : null;

  const formatSet = (weight: number | null, reps: number | null): string => {
    const parts: string[] = [];
    if (weight !== null) parts.push(`${weight}kg`);
    if (reps !== null) parts.push(`${reps} reps`);
    return parts.join(' × ') || '—';
  };

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
      {/* Nom exercice */}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
        }}
      >
        {current.exercise_name}
      </p>

      {/* Phase précédente + résultat */}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
        }}
      >
        {phaseLabel} il y a {weeks} {weeks === 1 ? 'semaine' : 'semaines'} : {formatSet(prevSet.weight, prevSet.reps)}
      </p>

      {/* Résultat actuel + delta */}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-sm)',
          color: delta !== null && delta > 0
            ? 'var(--color-success)'
            : delta !== null && delta < 0
            ? 'var(--color-error)'
            : 'var(--color-text)',
        }}
      >
        → cette séance : {formatSet(currSet.weight, currSet.reps)}
        {delta !== null && delta !== 0 && (
          <span> ({delta > 0 ? '+' : ''}{delta}kg {delta > 0 ? '↑' : '↓'})</span>
        )}
      </p>
    </div>
  );
}
