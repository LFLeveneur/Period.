// Service de debug — opérations de reset et seed de données
// 🚨 À utiliser UNIQUEMENT en développement
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/auth';
import type { Program } from '@/types/workout';

// ─── RESET ──────────────────────────────────────────────────────────────────

/** Réinitialise l'onboarding de l'utilisatrice */
export async function resetOnboarding(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      cycle_tracking: null,
      name: null,
      level: null,
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

/** Supprime toutes les données de cycle de l'utilisatrice */
export async function resetHealthData(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('health_data')
    .delete()
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

/** Supprime tous les programmes de l'utilisatrice (cascade sur les séances et exercices) */
export async function resetPrograms(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

/** Supprime tout l'historique de séances de l'utilisatrice */
export async function resetSessionHistory(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('session_history')
    .delete()
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── SEED ────────────────────────────────────────────────────────────────────

/** Crée une ligne health_data pour un jour du cycle spécifique */
export async function seedCycleDay(
  userId: string,
  cycleDay: number
): Promise<{ error: string | null }> {
  // Paramètres par défaut d'un cycle
  const cycleLength = 28;
  const periodLength = 5;

  // Calcule la date de dernière règle pour que le jour du cycle d'aujourd'hui corresponde
  const today = new Date();
  const lastPeriodDate = new Date(today);
  lastPeriodDate.setDate(lastPeriodDate.getDate() - (cycleDay - 1));
  const lastPeriodDateStr = lastPeriodDate.toISOString().split('T')[0];

  // Vérifie si une ligne existe déjà
  const { data: existing } = await supabase
    .from('health_data')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Met à jour
    const { error } = await supabase
      .from('health_data')
      .update({
        last_period_date: lastPeriodDateStr,
        cycle_length: cycleLength,
        period_length: periodLength,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) return { error: error.message };
  } else {
    // Crée une nouvelle ligne
    const { error } = await supabase
      .from('health_data')
      .insert({
        user_id: userId,
        last_period_date: lastPeriodDateStr,
        cycle_length: cycleLength,
        period_length: periodLength,
      });

    if (error) return { error: error.message };
  }

  return { error: null };
}

/** Crée un programme de test avec 3 séances et 2 exercices chacune */
export async function seedTestProgram(
  userId: string
): Promise<{ data: Program | null; error: string | null }> {
  // Récupère les 2 premiers exercices du catalogue
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercise_catalog')
    .select('id')
    .limit(2);

  if (exercisesError) {
    return { data: null, error: exercisesError.message };
  }

  if (!exercises || exercises.length < 2) {
    return { data: null, error: 'Pas assez d\'exercices dans le catalogue' };
  }

  // Crée le programme
  const { data: program, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      name: 'Programme de test',
      description: 'Programme créé automatiquement par le debug panel',
      duration_weeks: 4,
      is_active: true,
      status: 'active',
    })
    .select()
    .single();

  if (programError) {
    return { data: null, error: programError.message };
  }

  // Crée 3 séances
  const sessionIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const { data: session, error: sessionError } = await supabase
      .from('program_sessions')
      .insert({
        program_id: program.id,
        user_id: userId,
        name: `Séance ${i + 1}`,
        order_index: i,
        status: 'pending',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[debugService] seedTestProgram session', sessionError);
      continue;
    }

    sessionIds.push(session.id);
  }

  // Crée 2 exercices pour chaque séance
  for (const sessionId of sessionIds) {
    for (let i = 0; i < 2; i++) {
      const exerciseId = exercises[i].id;

      const { error: exerciseError } = await supabase
        .from('session_exercises')
        .insert({
          session_id: sessionId,
          exercise_catalog_id: exerciseId,
          user_custom_exercise_id: null,
          set_targets: [{ reps: 10, weight: 20 }],
          order_index: i,
          completed: false,
        });

      if (exerciseError) {
        console.error('[debugService] seedTestProgram exercise', exerciseError);
      }
    }
  }

  return { data: program, error: null };
}

// ─── TYPES DEBUG ──────────────────────────────────────────────────────────────

/** Résumé d'une entrée exercise_history pour le debug */
export interface ExerciseHistoryDebug {
  id: string;
  exercise_catalog_id: string | null;
  user_custom_exercise_id: string | null;
  input_type: string | null;
  set_count: number;
}

/** Résumé d'une séance historique pour le debug */
export interface SessionHistoryDebug {
  id: string;
  completed_at: string;
  session_name: string | null;
  cycle_phase: string | null;
  feeling: string | null;
  duration_minutes: number | null;
  total_volume: number | null;
  exercises: ExerciseHistoryDebug[];
}

/**
 * Récupère toutes les séances et leurs exercices depuis Supabase pour le debug.
 * Retourne les 20 séances les plus récentes.
 */
export async function getSessionHistoryDebug(
  userId: string
): Promise<{ data: SessionHistoryDebug[]; error: string | null }> {
  // Récupère les séances
  const { data: sessions, error: sessionsError } = await supabase
    .from('session_history')
    .select('id, completed_at, session_id, cycle_phase, feeling, duration_minutes, total_volume')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(20);

  if (sessionsError) return { data: [], error: sessionsError.message };
  if (!sessions || sessions.length === 0) return { data: [], error: null };

  // Récupère les exercices pour toutes les séances en une seule requête
  const sessionIds = sessions.map(s => s.id);
  const { data: exercises, error: exError } = await supabase
    .from('exercise_history')
    .select('id, session_history_id, exercise_catalog_id, user_custom_exercise_id, input_type, set_details')
    .in('session_history_id', sessionIds)
    .eq('user_id', userId);

  if (exError) return { data: [], error: exError.message };

  // Groupe les exercices par session
  const exBySession: Record<string, ExerciseHistoryDebug[]> = {};
  for (const ex of exercises ?? []) {
    const sid = ex.session_history_id as string;
    if (!exBySession[sid]) exBySession[sid] = [];
    const setDetails = ex.set_details as unknown[];
    exBySession[sid].push({
      id: ex.id,
      exercise_catalog_id: ex.exercise_catalog_id,
      user_custom_exercise_id: ex.user_custom_exercise_id,
      input_type: ex.input_type,
      set_count: Array.isArray(setDetails) ? setDetails.length : 0,
    });
  }

  const result: SessionHistoryDebug[] = sessions.map(s => ({
    id: s.id,
    completed_at: s.completed_at,
    session_name: s.session_id ?? null,
    cycle_phase: s.cycle_phase,
    feeling: s.feeling,
    duration_minutes: s.duration_minutes,
    total_volume: s.total_volume,
    exercises: exBySession[s.id] ?? [],
  }));

  return { data: result, error: null };
}

// Type pour les données de health_data retournées
export interface HealthDataDebug {
  id: string;
  user_id: string;
  last_period_date: string | null;
  cycle_length: number | null;
  period_length: number | null;
}

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Récupère les infos actuelles du profil */
export async function getDebugInfo(
  userId: string
): Promise<{
  profile: Profile | null;
  healthData: HealthDataDebug | null;
  activeProgram: Program | null;
  error: string | null;
}> {
  const [profileResult, healthDataResult, programResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('health_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('programs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    return {
      profile: null,
      healthData: null,
      activeProgram: null,
      error: profileResult.error.message,
    };
  }

  return {
    profile: (profileResult.data as Profile | null) || null,
    healthData: (healthDataResult.data as HealthDataDebug | null) || null,
    activeProgram: (programResult.data as Program | null) || null,
    error: null,
  };
}
