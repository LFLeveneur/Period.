// Service de gestion des programmes d'entraînement
import { supabase } from '@/lib/supabase';
import type {
  Program,
  ProgramSession,
  SessionExercise,
  AnyExercise,
  ExerciseInputType,
} from '@/types/workout';
import { buildSetTargets } from '@/utils/setTargets';

// ─── Types de détail ──────────────────────────────────────────────────────────

export interface SessionExerciseWithDetails {
  sessionExercise: SessionExercise;
  /** null si l'exercice a été supprimé du catalogue (EC-15) */
  exercise: AnyExercise | null;
}

export interface SessionWithExercises {
  session: ProgramSession;
  exercises: SessionExerciseWithDetails[];
}

export interface ProgramDetail {
  program: Program;
  sessions: SessionWithExercises[];
}

// ─── Types pour la création ───────────────────────────────────────────────────

export interface CreateExerciseInput {
  exercise_catalog_id?: string;
  user_custom_exercise_id?: string;
  sets: number;
  reps: string;
  weight?: number;
  input_type: ExerciseInputType;
  rest_between_sets?: number;
  order_index: number;
}

export interface CreateSessionInput {
  name: string;
  order_index: number;
  day_of_week?: number;
  exercises: CreateExerciseInput[];
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  duration_weeks?: number;
  sessions: CreateSessionInput[];
}

// ─── Fonctions du service ─────────────────────────────────────────────────────

/**
 * Récupère tous les programmes de l'utilisatrice.
 * Trie : actif en premier, puis par created_at DESC.
 */
export async function getPrograms(
  userId: string
): Promise<{ data: Program[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[programService] getPrograms', error);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Récupère le détail complet d'un programme avec ses séances et exercices.
 * Les exercices incluent les données du catalogue ou des exercices personnalisés via jointure.
 */
export async function getProgramDetail(
  programId: string
): Promise<{ data: ProgramDetail | null; error: string | null }> {
  // Charge le programme
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .maybeSingle();

  if (programError) {
    console.error('[programService] getProgramDetail program', programError);
    return { data: null, error: programError.message };
  }
  if (!program) {
    return { data: null, error: 'Programme introuvable.' };
  }

  // Charge les séances avec leurs exercices et les détails des exercices via jointure
  const { data: sessionsRaw, error: sessionsError } = await supabase
    .from('program_sessions')
    .select(`
      *,
      session_exercises (
        *,
        exercise_catalog:exercise_catalog_id ( id, name, category, subcategory, type, muscle_primary, muscle_secondary, is_public ),
        user_custom_exercise:user_custom_exercise_id ( id, user_id, name, category, subcategory, type, muscle_primary, muscle_secondary, notes )
      )
    `)
    .eq('program_id', programId)
    .order('order_index');

  if (sessionsError) {
    console.error('[programService] getProgramDetail sessions', sessionsError);
    return { data: null, error: sessionsError.message };
  }

  // Transforme les données brutes en structure typée
  const sessions: SessionWithExercises[] = (sessionsRaw ?? []).map(sessionRaw => {
    const session: ProgramSession = {
      id: sessionRaw.id,
      program_id: sessionRaw.program_id,
      user_id: sessionRaw.user_id,
      name: sessionRaw.name,
      order_index: sessionRaw.order_index,
      day_of_week: sessionRaw.day_of_week,
      scheduled_date: sessionRaw.scheduled_date,
      status: sessionRaw.status,
      phase_recommendation: sessionRaw.phase_recommendation,
      created_at: sessionRaw.created_at,
    };

    const exercises: SessionExerciseWithDetails[] = (sessionRaw.session_exercises ?? []).map(
      (seRaw: Record<string, unknown>) => {
        const sessionExercise: SessionExercise = {
          id: seRaw.id as string,
          session_id: seRaw.session_id as string,
          exercise_catalog_id: seRaw.exercise_catalog_id as string | null,
          user_custom_exercise_id: seRaw.user_custom_exercise_id as string | null,
          set_targets: (seRaw.set_targets as SessionExercise['set_targets']) ?? [],
          sets: seRaw.sets as number | undefined,
          reps: seRaw.reps as string | undefined,
          weight: seRaw.weight as number | undefined,
          order_index: seRaw.order_index as number,
          completed: (seRaw.completed as boolean) ?? false,
          input_type: seRaw.input_type as ExerciseInputType | undefined,
          rest_between_sets: seRaw.rest_between_sets as number | undefined,
          rest_after_exercise: seRaw.rest_after_exercise as number | undefined,
        };

        // Détermine l'exercice associé (catalogue ou personnalisé)
        let exercise: AnyExercise | null = null;
        if (seRaw.exercise_catalog && typeof seRaw.exercise_catalog === 'object') {
          const cat = seRaw.exercise_catalog as Record<string, unknown>;
          exercise = {
            id: cat.id as string,
            name: cat.name as string,
            category: cat.category as string,
            subcategory: cat.subcategory as string | null,
            type: cat.type as string | null,
            muscle_primary: cat.muscle_primary as string | null,
            muscle_secondary: cat.muscle_secondary as string | null,
            is_public: cat.is_public as boolean,
            source: 'catalog',
          };
        } else if (
          seRaw.user_custom_exercise &&
          typeof seRaw.user_custom_exercise === 'object'
        ) {
          const cust = seRaw.user_custom_exercise as Record<string, unknown>;
          exercise = {
            id: cust.id as string,
            user_id: cust.user_id as string,
            name: cust.name as string,
            category: cust.category as string | null,
            subcategory: cust.subcategory as string | null,
            type: cust.type as string | null,
            muscle_primary: cust.muscle_primary as string | null,
            muscle_secondary: cust.muscle_secondary as string | null,
            notes: cust.notes as string | null,
            source: 'custom',
          };
        }

        return { sessionExercise, exercise };
      }
    );

    // Trie les exercices par order_index
    exercises.sort(
      (a, b) => a.sessionExercise.order_index - b.sessionExercise.order_index
    );

    return { session, exercises };
  });

  return { data: { program, sessions }, error: null };
}

/**
 * Crée un programme complet avec ses séances et exercices.
 * Retourne l'id du programme créé.
 */
export async function createProgram(
  userId: string,
  input: CreateProgramInput
): Promise<{ data: string | null; error: string | null }> {
  // Étape 1 — crée le programme (inactif par défaut)
  const { data: program, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? null,
      duration_weeks: input.duration_weeks ?? null,
      is_active: false,
      status: 'paused',
    })
    .select('id')
    .single();

  if (programError) {
    console.error('[programService] createProgram', programError);
    return { data: null, error: programError.message };
  }

  const programId = program.id;

  // Étape 2 — crée les séances
  for (const sessionInput of input.sessions) {
    const { data: session, error: sessionError } = await supabase
      .from('program_sessions')
      .insert({
        program_id: programId,
        user_id: userId,
        name: sessionInput.name,
        order_index: sessionInput.order_index,
        day_of_week: sessionInput.day_of_week ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('[programService] createProgram session', sessionError);
      return { data: null, error: sessionError.message };
    }

    const sessionId = session.id;

    // Étape 3 — crée les exercices de la séance
    if (sessionInput.exercises.length > 0) {
      const exercisesToInsert = sessionInput.exercises.map(ex => ({
        session_id: sessionId,
        exercise_catalog_id: ex.exercise_catalog_id ?? null,
        user_custom_exercise_id: ex.user_custom_exercise_id ?? null,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight ?? null,
        input_type: ex.input_type,
        rest_between_sets: ex.rest_between_sets ?? 150,
        order_index: ex.order_index,
        completed: false,
        set_targets: buildSetTargets(ex.sets, ex.reps, ex.weight ?? null, ex.input_type),
      }));

      const { error: exercisesError } = await supabase
        .from('session_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) {
        console.error('[programService] createProgram exercises', exercisesError);
        return { data: null, error: exercisesError.message };
      }
    }
  }

  return { data: programId, error: null };
}

/**
 * Active un programme (désactive tous les autres en premier).
 * EC-16 : si le programme est déjà actif, retourne { error: 'ALREADY_ACTIVE' }.
 * Vérifie que le programme appartient à l'utilisatrice avant activation.
 */
export async function activateProgram(
  userId: string,
  programId: string
): Promise<{ error: string | null }> {
  // Vérifie si le programme appartient à l'utilisatrice et s'il est déjà actif (EC-16)
  const { data: current, error: checkError } = await supabase
    .from('programs')
    .select('is_active')
    .eq('id', programId)
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) {
    console.error('[programService] activateProgram check', checkError);
    return { error: checkError.message };
  }

  if (!current) {
    return { error: 'Programme introuvable.' };
  }

  if (current.is_active) {
    return { error: 'ALREADY_ACTIVE' };
  }

  // Désactive tous les autres programmes de l'utilisatrice
  const { error: deactivateError } = await supabase
    .from('programs')
    .update({ is_active: false, status: 'paused' })
    .eq('user_id', userId)
    .neq('id', programId);

  if (deactivateError) {
    console.error('[programService] activateProgram deactivate', deactivateError);
    return { error: deactivateError.message };
  }

  // Active le programme cible
  const { error: activateError } = await supabase
    .from('programs')
    .update({ is_active: true, status: 'active' })
    .eq('id', programId)
    .eq('user_id', userId);

  if (activateError) {
    console.error('[programService] activateProgram activate', activateError);
    return { error: activateError.message };
  }

  return { error: null };
}

/**
 * Met en pause un programme actif.
 */
export async function pauseProgram(
  programId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programs')
    .update({ is_active: false, status: 'paused' })
    .eq('id', programId);

  if (error) {
    console.error('[programService] pauseProgram', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Supprime un programme.
 * session_history.session_id n'est pas supprimé — l'historique est conservé (EC-17).
 */
export async function deleteProgram(
  programId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId);

  if (error) {
    console.error('[programService] deleteProgram', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Récupère une séance avec tous ses exercices depuis son ID.
 * Utilisé par SessionPreviewPage et SessionActivePage.
 */
export async function getSessionById(
  sessionId: string
): Promise<{ data: SessionWithExercises | null; error: string | null }> {
  const { data: sessionRaw, error: sessionError } = await supabase
    .from('program_sessions')
    .select(`
      *,
      session_exercises (
        *,
        exercise_catalog:exercise_catalog_id ( id, name, category, subcategory, type, muscle_primary, muscle_secondary, is_public ),
        user_custom_exercise:user_custom_exercise_id ( id, user_id, name, category, subcategory, type, muscle_primary, muscle_secondary, notes )
      )
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    console.error('[programService] getSessionById', sessionError);
    return { data: null, error: sessionError.message };
  }
  if (!sessionRaw) {
    return { data: null, error: 'Séance introuvable.' };
  }

  const session: ProgramSession = {
    id: sessionRaw.id,
    program_id: sessionRaw.program_id,
    user_id: sessionRaw.user_id,
    name: sessionRaw.name,
    order_index: sessionRaw.order_index,
    day_of_week: sessionRaw.day_of_week,
    scheduled_date: sessionRaw.scheduled_date,
    status: sessionRaw.status,
    phase_recommendation: sessionRaw.phase_recommendation,
    created_at: sessionRaw.created_at,
  };

  const exercises: SessionExerciseWithDetails[] = (sessionRaw.session_exercises ?? []).map(
    (seRaw: Record<string, unknown>) => {
      const sessionExercise: SessionExercise = {
        id: seRaw.id as string,
        session_id: seRaw.session_id as string,
        exercise_catalog_id: seRaw.exercise_catalog_id as string | null,
        user_custom_exercise_id: seRaw.user_custom_exercise_id as string | null,
        set_targets: (seRaw.set_targets as SessionExercise['set_targets']) ?? [],
        sets: seRaw.sets as number | undefined,
        reps: seRaw.reps as string | undefined,
        weight: seRaw.weight as number | undefined,
        order_index: seRaw.order_index as number,
        completed: (seRaw.completed as boolean) ?? false,
        input_type: seRaw.input_type as ExerciseInputType | undefined,
        rest_between_sets: seRaw.rest_between_sets as number | undefined,
        rest_after_exercise: seRaw.rest_after_exercise as number | undefined,
      };

      let exercise: AnyExercise | null = null;
      if (seRaw.exercise_catalog && typeof seRaw.exercise_catalog === 'object') {
        const cat = seRaw.exercise_catalog as Record<string, unknown>;
        exercise = {
          id: cat.id as string,
          name: cat.name as string,
          category: cat.category as string,
          subcategory: cat.subcategory as string | null,
          type: cat.type as string | null,
          muscle_primary: cat.muscle_primary as string | null,
          muscle_secondary: cat.muscle_secondary as string | null,
          is_public: cat.is_public as boolean,
          source: 'catalog',
        };
      } else if (seRaw.user_custom_exercise && typeof seRaw.user_custom_exercise === 'object') {
        const cust = seRaw.user_custom_exercise as Record<string, unknown>;
        exercise = {
          id: cust.id as string,
          user_id: cust.user_id as string,
          name: cust.name as string,
          category: cust.category as string | null,
          subcategory: cust.subcategory as string | null,
          type: cust.type as string | null,
          muscle_primary: cust.muscle_primary as string | null,
          muscle_secondary: cust.muscle_secondary as string | null,
          notes: cust.notes as string | null,
          source: 'custom',
        };
      }

      return { sessionExercise, exercise };
    }
  );

  exercises.sort((a, b) => a.sessionExercise.order_index - b.sessionExercise.order_index);

  return { data: { session, exercises }, error: null };
}

/**
 * Récupère les 5 dernières séances complétées pour un programme.
 */
export async function getRecentSessionHistory(
  programId: string
): Promise<{ data: Array<{ id: string; completed_at: string; duration_minutes: number | null; session_id: string | null }> | null; error: string | null }> {
  // Récupère d'abord les session_ids du programme
  const { data: sessions, error: sessionsError } = await supabase
    .from('program_sessions')
    .select('id')
    .eq('program_id', programId);

  if (sessionsError) {
    console.error('[programService] getRecentSessionHistory sessions', sessionsError);
    return { data: null, error: sessionsError.message };
  }

  if (!sessions || sessions.length === 0) {
    return { data: [], error: null };
  }

  const sessionIds = sessions.map(s => s.id);

  const { data, error } = await supabase
    .from('session_history')
    .select('id, completed_at, duration_minutes, session_id')
    .in('session_id', sessionIds)
    .order('completed_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[programService] getRecentSessionHistory', error);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Met à jour les informations d'un programme (nom, description, durée).
 */
export async function updateProgram(
  programId: string,
  updates: Partial<{ name: string; description: string | null; duration_weeks: number | null }>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programs')
    .update(updates)
    .eq('id', programId);

  if (error) {
    console.error('[programService] updateProgram', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Met à jour une séance (nom, jour de la semaine, position).
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<{ name: string; day_of_week: number | null; order_index: number }>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('program_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) {
    console.error('[programService] updateSession', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Supprime une séance et ses exercices associés (cascade).
 */
export async function deleteSession(sessionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('program_sessions').delete().eq('id', sessionId);

  if (error) {
    console.error('[programService] deleteSession', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Met à jour un exercice d'une séance (sets, reps, poids, type input, repos).
 */
export async function updateSessionExercise(
  exerciseId: string,
  updates: Partial<{
    sets: number;
    reps: string;
    weight: number | null;
    input_type: ExerciseInputType;
    rest_between_sets: number;
    order_index: number;
  }>
): Promise<{ error: string | null }> {
  // Si les paramètres de l'exercice changent, recalcule les set_targets
  let dataToUpdate = { ...updates };

  if (
    updates.sets !== undefined ||
    updates.reps !== undefined ||
    updates.weight !== undefined ||
    updates.input_type !== undefined
  ) {
    // Récupère les données actuelles pour les champs manquants
    const { data: current } = await supabase
      .from('session_exercises')
      .select('sets, reps, weight, input_type')
      .eq('id', exerciseId)
      .maybeSingle();

    const sets = updates.sets ?? (current?.sets as number) ?? 3;
    const reps = updates.reps ?? (current?.reps as string) ?? '8';
    const weight = updates.weight ?? (current?.weight as number | null) ?? null;
    const inputType = updates.input_type ?? (current?.input_type as ExerciseInputType) ?? 'weight_reps';

    // Recalcule les cibles de séries
    dataToUpdate = {
      ...dataToUpdate,
      set_targets: buildSetTargets(sets, reps, weight, inputType),
    };
  }

  const { error } = await supabase
    .from('session_exercises')
    .update(dataToUpdate)
    .eq('id', exerciseId);

  if (error) {
    console.error('[programService] updateSessionExercise', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Supprime un exercice d'une séance.
 */
export async function deleteSessionExercise(exerciseId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('session_exercises').delete().eq('id', exerciseId);

  if (error) {
    console.error('[programService] deleteSessionExercise', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Réordonne les séances d'un programme en batch (met à jour tous les order_index).
 */
export async function reorderSessions(
  sessionIds: string[]
): Promise<{ error: string | null }> {
  // Crée un tableau des mises à jour : chaque session obtient un nouvel order_index
  const updates = sessionIds.map((id, idx) => ({
    id,
    order_index: idx,
  }));

  // Utilise Promise.all pour les updates en parallèle
  const updatePromises = updates.map(({ id, order_index }) =>
    supabase.from('program_sessions').update({ order_index }).eq('id', id)
  );

  const results = await Promise.all(updatePromises);

  // Vérifie s'il y a des erreurs
  const errorResult = results.find(r => r.error);
  if (errorResult?.error) {
    console.error('[programService] reorderSessions', errorResult.error);
    return { error: errorResult.error.message };
  }

  return { error: null };
}

/**
 * Réordonne les exercices d'une séance en batch (met à jour tous les order_index).
 */
export async function reorderExercises(
  exerciseIds: string[]
): Promise<{ error: string | null }> {
  // Crée un tableau des mises à jour : chaque exercice obtient un nouvel order_index
  const updates = exerciseIds.map((id, idx) => ({
    id,
    order_index: idx,
  }));

  // Utilise Promise.all pour les updates en parallèle
  const updatePromises = updates.map(({ id, order_index }) =>
    supabase.from('session_exercises').update({ order_index }).eq('id', id)
  );

  const results = await Promise.all(updatePromises);

  // Vérifie s'il y a des erreurs
  const errorResult = results.find(r => r.error);
  if (errorResult?.error) {
    console.error('[programService] reorderExercises', errorResult.error);
    return { error: errorResult.error.message };
  }

  return { error: null };
}
