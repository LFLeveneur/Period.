// Card d'exercice dans la preview de séance — affiche les cibles et l'historique comparatif
import { motion } from 'motion/react';
import type { SessionExerciseWithDetails } from '@/services/programService';
import type { ExerciseHistoryEntry, SetTarget } from '@/types/workout';
import type { CyclePhaseDisplay } from '@/types/cycle';

interface PreviewExerciseCardProps {
  /** Exercice avec ses données détaillées */
  exerciseWithDetails: SessionExerciseWithDetails;
  /** Historique des séances précédentes pour cet exercice */
  history: ExerciseHistoryEntry[];
  /** Phase prévue pour cette séance */
  currentPhase: CyclePhaseDisplay | null;
}

/** Formate les cibles d'une série pour l'affichage condensé */
function formatTargets(targets: SetTarget[], inputType?: string): string {
  if (!targets || targets.length === 0) return '';
  const first = targets[0];
  const sets = targets.length;

  switch (inputType) {
    case 'cardio_duration': {
      const dur = first.duration ? `${Math.round(first.duration / 60)} min` : '';
      return `${sets} × ${dur}`;
    }
    case 'cardio_distance':
      return `${sets} × ${first.distance ?? '?'} km`;
    case 'bodyweight_reps':
      return `${sets} séries × ${first.reps ?? '?'} reps`;
    default: {
      const reps = first.reps ? `${first.reps} reps` : '';
      const weight = first.weight ? ` · ${first.weight} kg` : '';
      const rest = targets[0].rest_after
        ? ` · ${Math.floor(targets[0].rest_after / 60)}'${String(targets[0].rest_after % 60).padStart(2, '0')} de repos`
        : '';
      return `${sets} séries × ${reps}${weight}${rest}`;
    }
  }
}

/** Formate l'entrée d'historique en texte lisible */
function formatHistoryEntry(entry: ExerciseHistoryEntry): string {
  const sets = entry.set_details;
  if (!sets || sets.length === 0) return '';
  const first = sets[0].actual;
  const parts: string[] = [];
  if (first.weight) parts.push(`${first.weight}kg`);
  if (first.reps) parts.push(`${first.reps} reps`);
  if (first.duration) {
    const m = Math.floor(first.duration / 60);
    const s = first.duration % 60;
    parts.push(`${m}:${String(s).padStart(2, '0')}`);
  }
  return parts.join(' · ');
}

export function PreviewExerciseCard({
  exerciseWithDetails,
  history,
  currentPhase,
}: PreviewExerciseCardProps) {
  const { sessionExercise, exercise } = exerciseWithDetails;
  const exerciseName = exercise?.name ?? 'exercice supprimé';
  const category = exercise?.category;
  const inputType = sessionExercise.input_type;
  const targets = sessionExercise.set_targets ?? [];
  const restBetween = sessionExercise.rest_between_sets;

  // Dernière séance (la plus récente)
  const lastEntry = history[0] ?? null;

  // Même phase, cycle précédent
  const samePhasePrevEntry = currentPhase
    ? history.find(h => {
        // Cherche une entrée avec la même phase DB (4 valeurs)
        const phaseMap: Record<CyclePhaseDisplay, string> = {
          menstrual: 'menstrual',
          follicular: 'follicular',
          ovulation: 'ovulation',
          luteal_early: 'luteal',
          luteal_late: 'luteal',
        };
        const targetDb = phaseMap[currentPhase];
        return h.cycle_phase === targetDb && h !== lastEntry;
      })
    : null;

  return (
    <motion.div
      whileHover={{ y: -2 }}
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
      {/* En-tête — titre et catégorie */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
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
          {exerciseName}
        </h3>
        {category && (
          <motion.span
            whileHover={{ scale: 1.05 }}
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-1) var(--space-2)',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-family)',
              whiteSpace: 'nowrap',
              fontWeight: 'bold',
              cursor: 'default',
            }}
          >
            {category}
          </motion.span>
        )}
      </div>

      {/* Cibles — format compact */}
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
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'bold',
            color: 'var(--color-text)',
          }}
        >
          {formatTargets(targets, inputType ?? undefined)}
        </p>
        {restBetween && (
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            repos: {Math.floor(restBetween / 60)}'{String(restBetween % 60).padStart(2, '0')}
          </p>
        )}
      </div>

      {/* Historique comparatif — dernière séance + même phase cycle précédent */}
      {(lastEntry || samePhasePrevEntry) ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {lastEntry && (
            <div
              style={{
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3)',
                borderLeft: '3px solid var(--color-primary)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                dernière séance
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text)',
                  fontWeight: 'bold',
                }}
              >
                {formatHistoryEntry(lastEntry) || '—'}
              </p>
            </div>
          )}

          {samePhasePrevEntry && (
            <div
              style={{
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3)',
                borderLeft: '3px solid var(--color-primary)',
                opacity: 0.75,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                même phase — cycle précédent
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text)',
                  fontWeight: 'bold',
                }}
              >
                {formatHistoryEntry(samePhasePrevEntry) || '—'}
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        /* Pas d'historique — message encourageant */
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            margin: 0,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3)',
            fontStyle: 'italic',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          on n'a pas encore tes données sur cette phase. continue à utiliser Period. — dans un cycle, tu pourras te comparer à toi-même au bon moment. 🖤
        </motion.p>
      )}
    </motion.div>
  );
}
