// Fonctions utilitaires pour les calculs de séance
import type { ActiveSetData } from '@/types/workout';
import type { PerformanceLevel, SetTarget } from '@/types/workout';

/**
 * Calcule le volume total d'une série (poids × reps).
 * Retourne 0 si les données ne permettent pas de calcul.
 */
export function calcSetVolume(set: ActiveSetData): number {
  if (!set.completed) return 0;
  const weight = set.weight ?? 0;
  const reps = set.reps ?? 0;
  return weight * reps;
}

/**
 * Calcule le volume total d'un ensemble de séries complétées.
 */
export function calcTotalVolume(
  exercisesMap: Record<string, { sets: ActiveSetData[]; completed: boolean }>
): number {
  let total = 0;
  for (const ex of Object.values(exercisesMap)) {
    for (const s of ex.sets) {
      total += calcSetVolume(s);
    }
  }
  return total;
}

/**
 * Calcule le volume cible d'une liste de set_targets.
 * Retourne 0 si les targets sont cardio (pas de weight/reps).
 */
function calcTargetVolume(targets: SetTarget[]): number {
  return targets.reduce((sum, t) => {
    const w = t.weight ?? 0;
    const r = t.reps ?? 0;
    return sum + w * r;
  }, 0);
}

/**
 * Calcule le performance_score (volume réel / volume cible × 100).
 * Retourne null si le volume cible est 0 (cardio pur — EC-26).
 */
export function calcPerformanceScore(
  exercisesMap: Record<string, { sets: ActiveSetData[]; completed: boolean }>,
  allTargets: Record<string, SetTarget[]>
): number | null {
  let totalReal = 0;
  let totalTarget = 0;

  for (const [id, ex] of Object.entries(exercisesMap)) {
    const targets = allTargets[id] ?? [];
    const target = calcTargetVolume(targets);
    const real = ex.sets.reduce((sum, s) => sum + calcSetVolume(s), 0);
    totalReal += real;
    totalTarget += target;
  }

  if (totalTarget === 0) return null; // EC-26 : cardio pur
  return Math.round((totalReal / totalTarget) * 100);
}

/**
 * Détermine le PerformanceLevel depuis un score.
 * EC-26 : score null → 'solid' par défaut.
 */
export function scoreToPerformanceLevel(score: number | null): PerformanceLevel {
  if (score === null) return 'solid';
  if (score >= 105) return 'beyond';
  if (score >= 95) return 'progression';
  if (score >= 85) return 'solid';
  if (score >= 70) return 'maintained';
  return 'decline';
}

/**
 * Formate une durée en secondes vers MM:SS.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Formate une durée en minutes pour l'affichage (ex: 45 min).
 */
export function formatMinutes(minutes: number): string {
  return `${minutes} min`;
}
