// Service de gestion des exercices — catalogue public et exercices personnalisés
import { supabase } from '@/lib/supabase';
import type { ExerciseCatalogItem, CustomExercise } from '@/types/workout';

/** Filtres optionnels pour la requête catalogue */
interface ExerciseCatalogFilters {
  category?: string;
  type?: string;
  muscle?: string;
  search?: string;
}

/**
 * Récupère les exercices du catalogue public.
 * Filtrés par catégorie, type, muscle et/ou recherche par nom.
 * Limités à 20 par page (pagination offset).
 */
export async function getExerciseCatalog(
  filters?: ExerciseCatalogFilters,
  page = 0
): Promise<{ data: ExerciseCatalogItem[] | null; error: string | null }> {
  const from = page * 20;
  const to = from + 19;

  let query = supabase
    .from('exercise_catalog')
    .select('*')
    .eq('is_public', true)
    .order('name')
    .range(from, to);

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.muscle) {
    query = query.ilike('muscle_primary', `%${filters.muscle}%`);
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[exerciseService] getExerciseCatalog', error);
    return { data: null, error: error.message };
  }

  // Ajoute le discriminant source pour le type union AnyExercise
  const items = (data ?? []).map(item => ({ ...item, source: 'catalog' as const }));
  return { data: items, error: null };
}

/**
 * Récupère les exercices personnalisés de l'utilisatrice.
 */
export async function getCustomExercises(
  userId: string
): Promise<{ data: CustomExercise[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('user_custom_exercises')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    console.error('[exerciseService] getCustomExercises', error);
    return { data: null, error: error.message };
  }

  const items = (data ?? []).map(item => ({ ...item, source: 'custom' as const }));
  return { data: items, error: null };
}

/**
 * Crée un exercice personnalisé pour l'utilisatrice.
 */
export async function createCustomExercise(
  userId: string,
  data: Omit<CustomExercise, 'id' | 'user_id' | 'source' | 'created_at'>
): Promise<{ data: CustomExercise | null; error: string | null }> {
  const { data: created, error } = await supabase
    .from('user_custom_exercises')
    .insert({ ...data, user_id: userId })
    .select()
    .single();

  if (error) {
    console.error('[exerciseService] createCustomExercise', error);
    return { data: null, error: error.message };
  }

  return { data: { ...created, source: 'custom' as const }, error: null };
}

/**
 * Met à jour un exercice personnalisé.
 */
export async function updateCustomExercise(
  id: string,
  updates: Partial<Omit<CustomExercise, 'id' | 'user_id' | 'source' | 'created_at'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_custom_exercises')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[exerciseService] updateCustomExercise', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Supprime un exercice personnalisé.
 * Retourne { error: 'EXERCISE_IN_USE' } si l'exercice est utilisé dans une séance.
 */
export async function deleteCustomExercise(
  id: string
): Promise<{ error: string | null }> {
  // Vérifie si l'exercice est utilisé dans des séances planifiées
  const { data: usages, error: checkError } = await supabase
    .from('session_exercises')
    .select('id')
    .eq('user_custom_exercise_id', id)
    .limit(1);

  if (checkError) {
    console.error('[exerciseService] deleteCustomExercise check', checkError);
    return { error: checkError.message };
  }

  if (usages && usages.length > 0) {
    return { error: 'EXERCISE_IN_USE' };
  }

  const { error } = await supabase
    .from('user_custom_exercises')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[exerciseService] deleteCustomExercise', error);
    return { error: error.message };
  }

  return { error: null };
}
