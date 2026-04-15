// Service de gestion des données de santé et du cycle
// La table health_data contient une ligne par utilisatrice par date
import { supabase } from '@/lib/supabase';

/**
 * Sauvegarde le premier jour des règles (J1 du cycle).
 * Remplace la ligne J1 la plus récente existante ou en insère une nouvelle.
 * C'est la ligne de référence que cyclePredictionService utilise pour calculer les autres jours.
 */
export async function saveHealthData(
  userId: string,
  lastPeriodDate: string, // format YYYY-MM-DD — le premier jour des règles
  cycleLength: number,
  periodLength: number
): Promise<{ error: string | null }> {
  // Récupère la ligne J1 existante la plus récente
  const { data: latestJ1 } = await supabase
    .from('health_data')
    .select('last_period_date')
    .eq('user_id', userId)
    .eq('cycle_day', 1)
    .order('last_period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const dataToSave = {
    user_id: userId,
    last_period_date: lastPeriodDate,
    cycle_day: 1,
    cycle_phase: 'menstrual' as const,
    cycle_length: cycleLength,
    period_length: periodLength,
    ovulation_day: cycleLength - 14,
  };

  if (latestJ1) {
    // Supprime l'ancienne ligne et insère la nouvelle
    // (Pour éviter d'avoir plusieurs lignes J1 si l'utilisatrice change ses dates)
    const { error: deleteError } = await supabase
      .from('health_data')
      .delete()
      .eq('user_id', userId)
      .eq('last_period_date', latestJ1.last_period_date)
      .eq('cycle_day', 1);

    if (deleteError) return { error: deleteError.message };
  }

  // Insère la nouvelle ligne
  const { error } = await supabase.from('health_data').insert(dataToSave);
  if (error) return { error: error.message };

  return { error: null };
}

/**
 * Déclare le début des règles pour une date donnée.
 * Insère ou met à jour une ligne dans health_data avec cycle_day = 1 et phase = 'menstrual'.
 * Retourne alreadyExists = true si cette date a déjà été déclarée pour ce jour du cycle.
 */
export async function declarePeriodToday(
  userId: string,
  date: string // format YYYY-MM-DD
): Promise<{ alreadyExists: boolean; error: string | null }> {
  // Vérifie si cette date a déjà été déclarée comme J1
  const { data: existing } = await supabase
    .from('health_data')
    .select('id')
    .eq('user_id', userId)
    .eq('last_period_date', date)
    .eq('cycle_day', 1)
    .maybeSingle();

  if (existing) {
    return { alreadyExists: true, error: null };
  }

  // Récupère les stats existantes pour conserver les valeurs personnalisées de l'utilisatrice
  const { data: stats } = await supabase
    .from('health_data')
    .select('cycle_length, period_length, ovulation_day')
    .eq('user_id', userId)
    .eq('cycle_day', 1)
    .order('last_period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cycleLength = stats?.cycle_length ?? 28;
  const periodLength = stats?.period_length ?? 5;
  const ovulationDay = stats?.ovulation_day ?? cycleLength - 14;

  // Insère une nouvelle ligne de J1 avec les valeurs de cycle de l'utilisatrice
  const { error } = await supabase.from('health_data').insert({
    user_id: userId,
    last_period_date: date,
    cycle_day: 1,
    cycle_phase: 'menstrual' as const,
    cycle_length: cycleLength,
    period_length: periodLength,
    ovulation_day: ovulationDay,
  });

  if (error) return { alreadyExists: false, error: error.message };
  return { alreadyExists: false, error: null };
}

/**
 * Retourne la date la plus récente où cycle_day = 1 (premier jour des règles).
 * Retourne un tableau avec une seule date pour compatibilité avec les pages existantes.
 */
export async function getPeriodDates(
  userId: string
): Promise<{ data: string[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('health_data')
    .select('last_period_date')
    .eq('user_id', userId)
    .eq('cycle_day', 1)
    .order('last_period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: [], error: null };
  return { data: [data.last_period_date], error: null };
}

/**
 * Met à jour les valeurs par défaut de cycle_length et period_length
 * pour toutes les futures déclarations de règles.
 * Met à jour la dernière ligne existante avec cycle_day = 1.
 */
export async function updateCycleDefaults(
  userId: string,
  cycleLength: number,
  periodLength: number
): Promise<{ error: string | null }> {
  // Récupère la dernière ligne avec cycle_day = 1 (la plus récente déclaration de règles)
  const { data: lastPeriod } = await supabase
    .from('health_data')
    .select('last_period_date')
    .eq('user_id', userId)
    .eq('cycle_day', 1)
    .order('last_period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastPeriod) {
    // Aucune données existante — on ne peut pas mettre à jour
    return { error: 'aucune donnée de cycle enregistrée' };
  }

  // Met à jour la dernière ligne
  const { error } = await supabase
    .from('health_data')
    .update({
      cycle_length: cycleLength,
      period_length: periodLength,
      ovulation_day: cycleLength - 14,
    })
    .eq('user_id', userId)
    .eq('last_period_date', lastPeriod.last_period_date)
    .eq('cycle_day', 1);

  if (error) return { error: error.message };
  return { error: null };
}
