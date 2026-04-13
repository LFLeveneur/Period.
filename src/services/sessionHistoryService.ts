// Service de sauvegarde et récupération de l'historique des séances
import { supabase } from '@/lib/supabase';
import type {
  WorkoutFeeling,
  SetTarget,
  SetDetails,
  Victory,
  ExerciseHistoryEntry,
  SessionHistoryDetail,
  ExerciseHistoryDetail,
  PerformanceLevel,
  SessionHistoryItem,
} from '@/types/workout';
import type { ActiveSessionState } from '@/contexts/ActiveSessionContext';
import type { CyclePhase, CyclePhaseDisplay } from '@/types/cycle';
import {
  calcTotalVolume,
  calcPerformanceScore,
  scoreToPerformanceLevel,
} from '@/utils/sessionUtils';
import { FEELING_TO_SCORE } from '@/constants/session';

// ─── Sauvegarde de séance ─────────────────────────────────────────────────────

/**
 * Sauvegarde une séance complétée.
 * INSERT session_history + exercise_history, UPDATE program_sessions.
 * EC-25 : retry automatique 1 fois si INSERT échoue.
 * Retourne le sessionHistoryId créé.
 */
export async function saveSession(
  userId: string,
  state: ActiveSessionState,
  feeling: WorkoutFeeling,
  sessionTargets: Record<string, SetTarget[]>,
  exerciseNames: Record<string, string>,
  cyclePhase: CyclePhase | null,
  cycleDay: number | null
): Promise<{ data: string | null; error: string | null }> {
  // Calcul des métriques
  const now = new Date();
  const durationMs = now.getTime() - state.startedAt.getTime();
  const duration_minutes = Math.max(1, Math.round(durationMs / 60000));
  const total_volume = calcTotalVolume(state.exercises);
  const performance_score = calcPerformanceScore(state.exercises, sessionTargets);
  const performance_level = scoreToPerformanceLevel(performance_score);
  const energy_score = FEELING_TO_SCORE[feeling];

  const doSave = async (): Promise<{ data: string | null; error: string | null }> => {
    // Étape 1 : INSERT session_history
    const { data: historyRow, error: historyError } = await supabase
      .from('session_history')
      .insert({
        user_id: userId,
        session_id: state.sessionId,
        completed_at: now.toISOString(),
        duration_minutes,
        total_volume,
        energy_score,
        performance_score,
        feeling,
        cycle_phase: cyclePhase,
        cycle_day: cycleDay,
      })
      .select('id')
      .single();

    if (historyError) {
      console.error('[sessionHistoryService] saveSession history', historyError);
      return { data: null, error: historyError.message };
    }

    const sessionHistoryId = historyRow.id as string;

    // Étape 2 : INSERT exercise_history pour chaque exercice avec au moins 1 série complétée
    for (const [sessionExerciseId, exState] of Object.entries(state.exercises)) {
      const completedSets = exState.sets.filter(s => s.completed);
      // EC-24 : pas d'exercise_history si aucune série complétée
      if (completedSets.length === 0) continue;

      const targets = sessionTargets[sessionExerciseId] ?? [];
      const set_details: SetDetails[] = completedSets.map((s, idx) => ({
        set: idx + 1,
        target: targets[idx] ?? {},
        actual: {
          reps: s.reps,
          weight: s.weight,
          duration: s.duration,
          distance: s.distance,
          added_load: s.added_load,
          rir: s.rir,
        },
      }));

      // Calcul du volume max de cette séance pour cet exercice (pour victoires)
      const maxVolume = completedSets.reduce((max, s) => {
        const v = (s.weight ?? 0) * (s.reps ?? 0);
        return v > max ? v : max;
      }, 0);

      const { error: exHistError } = await supabase
        .from('exercise_history')
        .insert({
          user_id: userId,
          session_history_id: sessionHistoryId,
          exercise_catalog_id: state.exerciseIds[sessionExerciseId]?.catalogId ?? null,
          user_custom_exercise_id: state.exerciseIds[sessionExerciseId]?.customId ?? null,
        });

      if (exHistError) {
        console.error('[sessionHistoryService] saveSession exercise_history', exHistError);
        // On continue — on ne bloque pas pour un exercice individuel
      }
    }

    // Étape 3 : UPDATE program_sessions → status = 'completed'
    const { error: updateError } = await supabase
      .from('program_sessions')
      .update({ status: 'completed', completed: true })
      .eq('id', state.sessionId);

    if (updateError) {
      // Non bloquant — la séance est déjà sauvegardée
      console.error('[sessionHistoryService] saveSession update program_sessions', updateError);
    }

    // Étape 4 : Détection des victoires
    const victories = await detectVictories(userId, state, exerciseNames, sessionHistoryId);

    // Étape 5 : Stockage des victoires dans session_history si nécessaire
    if (victories.length > 0) {
      await supabase
        .from('session_history')
        .update({ victories: JSON.stringify(victories), performance_level })
        .eq('id', sessionHistoryId);
    } else {
      await supabase
        .from('session_history')
        .update({ performance_level })
        .eq('id', sessionHistoryId);
    }

    return { data: sessionHistoryId, error: null };
  };

  // EC-25 : retry automatique 1 fois
  const result = await doSave();
  if (result.error) {
    console.warn('[sessionHistoryService] 1er essai échoué, retry...');
    return await doSave();
  }
  return result;
}

// ─── Détection des victoires ──────────────────────────────────────────────────

/**
 * Détecte les victoires (record, meilleure phase) pour chaque exercice de la séance.
 */
async function detectVictories(
  userId: string,
  state: ActiveSessionState,
  exerciseNames: Record<string, string>,
  currentHistoryId: string
): Promise<Victory[]> {
  const victories: Victory[] = [];

  for (const [sessionExerciseId, exState] of Object.entries(state.exercises)) {
    const completedSets = exState.sets.filter(s => s.completed);
    if (completedSets.length === 0) continue;

    const ids = state.exerciseIds[sessionExerciseId];
    if (!ids) continue;

    const exerciseName = exerciseNames[sessionExerciseId] ?? 'exercice';

    // Volume max de cette séance pour cet exercice
    const currentMax = completedSets.reduce((max, s) => {
      const v = (s.weight ?? 0) * (s.reps ?? 0);
      return v > max ? v : max;
    }, 0);

    // Historique précédent pour cet exercice (hors séance courante)
    const history = await getExerciseHistoryRaw(userId, ids.catalogId, ids.customId, 10);
    const previousHistory = history.filter(h => h.session_history_id !== currentHistoryId);

    // Calcul du max historique
    const historicalMax = previousHistory.reduce((max, h) => {
      const setMax = (h.set_details ?? []).reduce((sm, s) => {
        const v = (s.actual?.weight ?? 0) * (s.actual?.reps ?? 0);
        return v > sm ? v : sm;
      }, 0);
      return setMax > max ? setMax : max;
    }, 0);

    // Poids moyen de cette séance
    const currentAvgWeight =
      completedSets.length > 0
        ? completedSets.reduce((sum, s) => sum + (s.weight ?? 0), 0) / completedSets.length
        : 0;

    // Dernière séance avec la même phase
    const samePhaseHistory = previousHistory.find(
      h => h.cycle_phase === state.currentPhase
    );
    const samePhaseAvgWeight = samePhaseHistory
      ? (samePhaseHistory.set_details ?? []).reduce((sum, s) => sum + (s.actual?.weight ?? 0), 0) /
        Math.max(1, (samePhaseHistory.set_details ?? []).length)
      : null;

    const isNewRecord = historicalMax > 0 && currentMax > historicalMax;
    const isBetterPhase =
      samePhaseAvgWeight !== null && currentAvgWeight > samePhaseAvgWeight;

    if (isNewRecord && isBetterPhase) {
      victories.push({
        type: 'double_record',
        exerciseName,
        value: currentMax,
        previousValue: historicalMax,
      });
    } else if (isNewRecord) {
      victories.push({
        type: 'new_record',
        exerciseName,
        value: currentMax,
        previousValue: historicalMax,
      });
    } else if (isBetterPhase && samePhaseAvgWeight !== null) {
      victories.push({
        type: 'better_than_previous_phase',
        exerciseName,
        value: currentAvgWeight,
        previousValue: samePhaseAvgWeight,
      });
    }
  }

  return victories;
}

// ─── Récupération d'historique ────────────────────────────────────────────────

/** Structure brute retournée par la requête historique */
interface RawExerciseHistory {
  id: string;
  session_history_id: string;
  exercise_catalog_id: string | null;
  user_custom_exercise_id: string | null;
  set_details: SetDetails[] | null; // toujours null — colonnes performance non disponibles en base
  input_type: string | null;
  cycle_phase: string | null;
  completed_at: string;
  cycle_day: number | null;
}

/**
 * Récupère l'historique brut d'un exercice (jointure avec session_history).
 */
async function getExerciseHistoryRaw(
  userId: string,
  catalogId: string | null,
  customId: string | null,
  limit = 10
): Promise<(RawExerciseHistory & { cycle_phase: CyclePhase | null; completed_at: string })[]> {
  let query = supabase
    .from('exercise_history')
    .select('*, session_history!inner ( completed_at, cycle_phase, cycle_day, user_id )')
    .eq('session_history.user_id', userId)
    .order('session_history(completed_at)', { ascending: false })
    .limit(limit);

  if (catalogId) {
    query = query.eq('exercise_catalog_id', catalogId);
  } else if (customId) {
    query = query.eq('user_custom_exercise_id', customId);
  } else {
    return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error('[sessionHistoryService] getExerciseHistoryRaw', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const sh = row['session_history'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      session_history_id: row['session_history_id'] as string,
      exercise_catalog_id: row['exercise_catalog_id'] as string | null,
      user_custom_exercise_id: row['user_custom_exercise_id'] as string | null,
      set_details: null,
      input_type: row['input_type'] as string | null,
      cycle_phase: (sh?.['cycle_phase'] as CyclePhase | null) ?? null,
      completed_at: (sh?.['completed_at'] as string) ?? '',
      cycle_day: (sh?.['cycle_day'] as number | null) ?? null,
    };
  });
}

/**
 * Récupère l'historique d'un exercice (pour comparaisons dans preview et active).
 * Retourne les N dernières exercise_history de cet exercice pour l'utilisatrice.
 */
export async function getExerciseHistory(
  userId: string,
  exerciseCatalogId: string | null,
  userCustomExerciseId: string | null,
  limit = 5
): Promise<{ data: ExerciseHistoryEntry[] | null; error: string | null }> {
  const raw = await getExerciseHistoryRaw(userId, exerciseCatalogId, userCustomExerciseId, limit);

  const entries: ExerciseHistoryEntry[] = raw.map(r => ({
    id: r.id,
    session_history_id: r.session_history_id,
    exercise_catalog_id: r.exercise_catalog_id,
    user_custom_exercise_id: r.user_custom_exercise_id,
    set_details: r.set_details,
    input_type: r.input_type as ExerciseHistoryEntry['input_type'],
    completed_at: r.completed_at,
    cycle_phase: r.cycle_phase,
    cycle_day: r.cycle_day,
  }));

  return { data: entries, error: null };
}

// ─── Récupération du détail de séance ────────────────────────────────────────

/**
 * Récupère le détail complet d'une session_history (pour le récap et /history/:id).
 */
export async function getSessionHistoryDetail(
  sessionHistoryId: string
): Promise<{ data: SessionHistoryDetail | null; error: string | null }> {
  // Charge session_history
  const { data: sh, error: shError } = await supabase
    .from('session_history')
    .select('*')
    .eq('id', sessionHistoryId)
    .maybeSingle();

  if (shError) {
    console.error('[sessionHistoryService] getSessionHistoryDetail sh', shError);
    return { data: null, error: shError.message };
  }
  if (!sh) {
    return { data: null, error: 'Séance introuvable.' };
  }

  // Récupère le nom de la séance depuis program_sessions
  let sessionName = 'Séance';
  const sessionId = sh['session_id'] as string | null;
  if (sessionId) {
    const { data: psRow } = await supabase
      .from('program_sessions')
      .select('name')
      .eq('id', sessionId)
      .maybeSingle();
    if (psRow?.['name']) sessionName = psRow['name'] as string;
  }

  // Charge exercise_history pour cette séance
  const { data: exercises, error: exError } = await supabase
    .from('exercise_history')
    .select('*, exercise_catalog:exercise_catalog_id ( name ), user_custom_exercise:user_custom_exercise_id ( name )')
    .eq('session_history_id', sessionHistoryId);

  if (exError) {
    console.error('[sessionHistoryService] getSessionHistoryDetail exercises', exError);
    return { data: null, error: exError.message };
  }

  const performanceScore = sh['performance_score'] as number | null;
  const performanceLevel = (sh['performance_level'] as PerformanceLevel | null) ?? scoreToPerformanceLevel(performanceScore);
  const victoriesRaw = sh['victories'];
  const victories: Victory[] = victoriesRaw
    ? typeof victoriesRaw === 'string'
      ? JSON.parse(victoriesRaw)
      : victoriesRaw
    : [];

  const exerciseDetails: ExerciseHistoryDetail[] = (exercises ?? []).map((ex: Record<string, unknown>) => {
    const catalog = ex['exercise_catalog'] as Record<string, unknown> | null;
    const custom = ex['user_custom_exercise'] as Record<string, unknown> | null;
    const exerciseName =
      (catalog?.['name'] as string) ?? (custom?.['name'] as string) ?? 'exercice supprimé';

    const setDetails: SetDetails[] | null = null;

    // Calcul avg_rir
    let avgRir: number | null = null;
    if (setDetails && setDetails.length > 0) {
      const rirsWithValues = setDetails
        .map(s => s.actual?.rir)
        .filter((r): r is number => r !== undefined && r !== null);
      if (rirsWithValues.length > 0) {
        avgRir =
          Math.round(
            (rirsWithValues.reduce((sum, r) => sum + r, 0) / rirsWithValues.length) * 10
          ) / 10;
      }
    }

    return {
      id: ex['id'] as string,
      exercise_catalog_id: ex['exercise_catalog_id'] as string | null,
      user_custom_exercise_id: ex['user_custom_exercise_id'] as string | null,
      exercise_name: exerciseName,
      input_type: ex['input_type'] as ExerciseHistoryDetail['input_type'],
      set_details: setDetails,
      progression: (ex['progression'] as 'up' | 'down' | 'stable' | null) ?? null,
      vs_previous_kg_delta: null,
      vs_same_phase_kg_delta: null,
      avg_rir: avgRir,
    };
  });

  const detail: SessionHistoryDetail = {
    id: sh['id'] as string,
    session_id: sh['session_id'] as string | null,
    session_name: sessionName,
    completed_at: sh['completed_at'] as string,
    duration_minutes: sh['duration_minutes'] as number | null,
    feeling: sh['feeling'] as WorkoutFeeling | null,
    cycle_phase: sh['cycle_phase'] as CyclePhase | null,
    cycle_day: sh['cycle_day'] as number | null,
    total_volume: sh['total_volume'] as number | null,
    performance_score: performanceScore,
    performance_level: performanceLevel,
    energy_score: sh['energy_score'] as number | null,
    exercises: exerciseDetails,
    victories,
  };

  return { data: detail, error: null };
}

/**
 * Récupère la session_history la plus récente pour un program_session donné.
 * Utilisé pour EC-27 (accès direct /recap sans state en mémoire).
 */
export async function getLatestSessionHistoryBySessionId(
  sessionId: string
): Promise<{ data: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('session_history')
    .select('id')
    .eq('session_id', sessionId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[sessionHistoryService] getLatestSessionHistoryBySessionId', error);
    return { data: null, error: error.message };
  }

  return { data: data ? (data['id'] as string) : null, error: null };
}

// ─── Utilitaires de conversion de phase ──────────────────────────────────────

/** Convertit CyclePhase (DB, 4 valeurs) en CyclePhaseDisplay (UI, 5 sous-phases) */
function toDisplayPhase(phase: string | null): CyclePhaseDisplay | null {
  if (!phase) return null;
  if (phase === 'luteal') return 'luteal_early';
  return phase as CyclePhaseDisplay;
}

/** Convertit CyclePhaseDisplay (UI) en CyclePhase (DB) pour les requêtes */
function toDbPhase(phase: CyclePhaseDisplay): CyclePhase {
  if (phase === 'luteal_early' || phase === 'luteal_late') return 'luteal';
  return phase as CyclePhase;
}

// ─── Liste d'historique ───────────────────────────────────────────────────────

/**
 * Récupère la liste des 30 dernières séances complétées.
 * Si programId fourni → filtre sur les séances appartenant à ce programme.
 */
export async function getHistoryList(
  userId: string,
  programId?: string
): Promise<{ data: SessionHistoryItem[] | null; error: string | null }> {
  // Si filtre programme → récupère d'abord les program_session IDs
  let sessionIdFilter: string[] | null = null;
  if (programId) {
    const { data: psSessions, error: psError } = await supabase
      .from('program_sessions')
      .select('id')
      .eq('program_id', programId);
    if (psError) return { data: null, error: psError.message };
    sessionIdFilter = (psSessions ?? []).map((s: Record<string, unknown>) => s['id'] as string);
    if (sessionIdFilter.length === 0) return { data: [], error: null };
  }

  let query = supabase
    .from('session_history')
    .select('id, completed_at, duration_minutes, cycle_phase, feeling, performance_score, session_id')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(30);

  if (sessionIdFilter !== null) {
    query = query.in('session_id', sessionIdFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[sessionHistoryService] getHistoryList', error);
    return { data: null, error: error.message };
  }

  // Récupère les infos de programme en lot (évite N+1)
  const sessionIds = (data ?? [])
    .map((row: Record<string, unknown>) => row['session_id'] as string | null)
    .filter((id): id is string => Boolean(id));

  const sessionProgramMap: Record<string, { sessionName: string | null; programId: string | null; programName: string | null }> = {};
  if (sessionIds.length > 0) {
    const { data: psData } = await supabase
      .from('program_sessions')
      .select('id, name, program_id, programs:program_id ( name )')
      .in('id', sessionIds);

    for (const ps of (psData ?? []) as Record<string, unknown>[]) {
      const programs = ps['programs'] as Record<string, unknown> | null;
      sessionProgramMap[ps['id'] as string] = {
        sessionName: (ps['name'] as string | null) ?? null,
        programId: (ps['program_id'] as string | null) ?? null,
        programName: (programs?.['name'] as string | null) ?? null,
      };
    }
  }

  const items: SessionHistoryItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const sid = row['session_id'] as string | null;
    const prog = sid ? (sessionProgramMap[sid] ?? { programId: null, programName: null }) : { programId: null, programName: null };
    return {
      id: row['id'] as string,
      sessionName: prog.sessionName ?? 'Séance',
      completedAt: row['completed_at'] as string,
      durationMinutes: (row['duration_minutes'] as number | null) ?? 0,
      cyclePhase: toDisplayPhase(row['cycle_phase'] as string | null),
      feeling: (row['feeling'] as WorkoutFeeling | null) ?? null,
      performanceScore: (row['performance_score'] as number | null) ?? null,
      performanceLevel: null,
      programId: prog.programId,
      programName: prog.programName,
    };
  });

  return { data: items, error: null };
}

// ─── Détail historique (EC-28) ────────────────────────────────────────────────

/**
 * Récupère le détail complet d'une session_history avec gestion EC-28.
 * Récupère le détail complet d'une session_history (pour /history/:id).
 */
export async function getHistoryDetail(
  userId: string,
  sessionHistoryId: string
): Promise<{ data: SessionHistoryDetail | null; error: string | null }> {
  // Charge session_history en vérifiant que ça appartient à l'utilisatrice
  const { data: sh, error: shError } = await supabase
    .from('session_history')
    .select('*')
    .eq('id', sessionHistoryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (shError) {
    console.error('[sessionHistoryService] getHistoryDetail sh', shError);
    return { data: null, error: shError.message };
  }
  if (!sh) return { data: null, error: 'Séance introuvable.' };

  // Récupère le nom de la séance depuis program_sessions
  let sessionName = 'Séance';
  const sessionId = sh['session_id'] as string | null;
  if (sessionId) {
    const { data: psRow } = await supabase
      .from('program_sessions')
      .select('name')
      .eq('id', sessionId)
      .maybeSingle();
    if (psRow?.['name']) sessionName = psRow['name'] as string;
  }

  // Charge exercise_history
  const { data: exercises, error: exError } = await supabase
    .from('exercise_history')
    .select('*, exercise_catalog:exercise_catalog_id ( name ), user_custom_exercise:user_custom_exercise_id ( name )')
    .eq('session_history_id', sessionHistoryId);

  if (exError) {
    console.error('[sessionHistoryService] getHistoryDetail exercises', exError);
    return { data: null, error: exError.message };
  }

  const performanceScore = sh['performance_score'] as number | null;
  const performanceLevel =
    (sh['performance_level'] as PerformanceLevel | null) ??
    scoreToPerformanceLevel(performanceScore);
  const victoriesRaw = sh['victories'];
  const victories: Victory[] = victoriesRaw
    ? typeof victoriesRaw === 'string'
      ? JSON.parse(victoriesRaw)
      : victoriesRaw
    : [];

  const exerciseDetails: ExerciseHistoryDetail[] = (exercises ?? []).map((ex: Record<string, unknown>) => {
    const catalog = ex['exercise_catalog'] as Record<string, unknown> | null;
    const custom = ex['user_custom_exercise'] as Record<string, unknown> | null;
    const exerciseName =
      (catalog?.['name'] as string) ?? (custom?.['name'] as string) ?? 'exercice supprimé';

    const setDetails: SetDetails[] | null = null;
    const isLegacy = false;

    // avg_rir
    let avgRir: number | null = null;
    if (!isLegacy && setDetails && setDetails.length > 0) {
      const rirs = setDetails
        .map(s => s.actual?.rir)
        .filter((r): r is number => r !== undefined && r !== null);
      if (rirs.length > 0) {
        avgRir = Math.round((rirs.reduce((sum, r) => sum + r, 0) / rirs.length) * 10) / 10;
      }
    }

    return {
      id: ex['id'] as string,
      exercise_catalog_id: ex['exercise_catalog_id'] as string | null,
      user_custom_exercise_id: ex['user_custom_exercise_id'] as string | null,
      exercise_name: exerciseName,
      input_type: ex['input_type'] as ExerciseHistoryDetail['input_type'],
      set_details: setDetails,
      progression: (ex['progression'] as 'up' | 'down' | 'stable' | null) ?? null,
      vs_previous_kg_delta: null,
      vs_same_phase_kg_delta: null,
      avg_rir: avgRir,
      isLegacy,
    };
  });

  const detail: SessionHistoryDetail = {
    id: sh['id'] as string,
    session_id: sh['session_id'] as string | null,
    session_name: sessionName,
    completed_at: sh['completed_at'] as string,
    duration_minutes: sh['duration_minutes'] as number | null,
    feeling: sh['feeling'] as WorkoutFeeling | null,
    cycle_phase: sh['cycle_phase'] as CyclePhase | null,
    cycle_day: sh['cycle_day'] as number | null,
    total_volume: sh['total_volume'] as number | null,
    performance_score: performanceScore,
    performance_level: performanceLevel,
    energy_score: sh['energy_score'] as number | null,
    exercises: exerciseDetails,
    victories,
  };

  return { data: detail, error: null };
}

// ─── Comparaison même phase cycle précédent ───────────────────────────────────

/**
 * Récupère la dernière exercise_history pour un exercice dans une phase donnée.
 * Utilisé pour la section "Comparaison même phase cycle précédent" dans /history/:id.
 */
export async function getPreviousPhaseHistory(
  userId: string,
  exerciseCatalogId: string | null,
  userCustomExerciseId: string | null,
  phase: CyclePhaseDisplay
): Promise<{ data: ExerciseHistoryEntry | null; error: string | null }> {
  if (!exerciseCatalogId && !userCustomExerciseId) return { data: null, error: null };

  const dbPhase = toDbPhase(phase);

  let query = supabase
    .from('exercise_history')
    .select('*, session_history!inner ( completed_at, cycle_phase, cycle_day, user_id )')
    .eq('session_history.user_id', userId)
    .eq('session_history.cycle_phase', dbPhase)
    .order('session_history(completed_at)', { ascending: false })
    .limit(1);

  if (exerciseCatalogId) {
    query = query.eq('exercise_catalog_id', exerciseCatalogId);
  } else {
    query = query.eq('user_custom_exercise_id', userCustomExerciseId!);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[sessionHistoryService] getPreviousPhaseHistory', error);
    return { data: null, error: error.message };
  }
  if (!data || data.length === 0) return { data: null, error: null };

  const row = data[0] as Record<string, unknown>;
  const sh = row['session_history'] as Record<string, unknown> | null;

  return {
    data: {
      id: row['id'] as string,
      session_history_id: row['session_history_id'] as string,
      exercise_catalog_id: row['exercise_catalog_id'] as string | null,
      user_custom_exercise_id: row['user_custom_exercise_id'] as string | null,
      set_details: null,
      input_type: row['input_type'] as ExerciseHistoryEntry['input_type'],
      completed_at: (sh?.['completed_at'] as string) ?? '',
      cycle_phase: (sh?.['cycle_phase'] as CyclePhase | null) ?? null,
      cycle_day: (sh?.['cycle_day'] as number | null) ?? null,
    },
    error: null,
  };
}
