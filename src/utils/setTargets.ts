// Génération des cibles de série à partir des paramètres d'un exercice
import type { ExerciseInputType, SetTarget } from '@/types/workout';

/**
 * Construit le tableau set_targets à partir des paramètres saisis dans le formulaire.
 * Chaque entrée du tableau représente une série planifiée.
 */
export function buildSetTargets(
  sets: number,
  reps: string,
  weight: number | null,
  inputType: ExerciseInputType
): SetTarget[] {
  // Prend le premier nombre de la plage (ex: "6-8" → 6, "8" → 8)
  const repsNum = parseInt(reps.split('-')[0]) || 8;

  return Array.from({ length: sets }, () => {
    const target: SetTarget = { rir: 2 };

    if (inputType === 'weight_reps' || inputType === 'weight_plus_load') {
      target.reps = repsNum;
      if (weight) target.weight = weight;
    } else if (inputType === 'bodyweight_reps') {
      target.reps = repsNum;
    } else if (inputType === 'cardio_duration') {
      // reps est interprété comme des minutes
      target.duration = repsNum * 60;
    } else if (inputType === 'cardio_distance') {
      target.distance = repsNum;
    }

    return target;
  });
}
