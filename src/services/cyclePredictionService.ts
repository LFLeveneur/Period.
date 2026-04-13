// Service de prédiction du cycle hormonal — moteur central de Phase 4
import { supabase } from '@/lib/supabase';
import type { CycleDay, CycleStats } from '@/types/cycle';
import { getCyclePhaseDisplay } from '@/types/cycle';

/**
 * Calcule le nombre de jours entre deux dates au format YYYY-MM-DD.
 * Retourne un nombre positif si dateB > dateA.
 */
function daysBetween(dateA: string, dateB: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.round((a - b) / msPerDay);
}

/**
 * Formate une date JS en chaîne YYYY-MM-DD (timezone locale).
 */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Récupère les statistiques de cycle depuis health_data.
 * Cherche le jour le plus récent avec cycle_day = 1 pour connaître le dernier début de règles.
 * Retourne null si aucune donnée n'existe encore.
 */
export async function fetchCycleStats(userId: string): Promise<CycleStats | null> {
  // Récupère le jour le plus récent où cycle_day = 1 (début de règles)
  const { data, error } = await supabase
    .from('health_data')
    .select('last_period_date, cycle_length, period_length, ovulation_day')
    .eq('user_id', userId)
    .order('last_period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[cyclePredictionService] Erreur fetchCycleStats :', error.message);
    return null;
  }

  if (!data) return null;

  const avgCycleLength = data.cycle_length;
  const avgPeriodLength = data.period_length;
  // Utilise ovulation_day si disponible, sinon formule standard (cycleLength - 14)
  const avgOvulationDay = data.ovulation_day ?? (avgCycleLength - 14);
  const lastPeriodDate = data.last_period_date;

  return { avgCycleLength, avgPeriodLength, avgOvulationDay, lastPeriodDate };
}

/**
 * Calcule la CycleDay pour une date donnée.
 * Retourne null si pas assez de données (< 2 déclarations de règles).
 * Retourne null si cycle_tracking = false dans profiles.
 */
export async function predictPhaseForDate(
  userId: string,
  date: string // Format YYYY-MM-DD
): Promise<CycleDay | null> {
  // Vérifie que l'utilisatrice a activé le suivi de cycle
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cycle_tracking')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[cyclePredictionService] Erreur lecture profil :', profileError.message);
    return null;
  }

  if (profile && profile.cycle_tracking === false) {
    return null;
  }

  const stats = await fetchCycleStats(userId);
  if (!stats) return null;

  const { avgCycleLength, avgPeriodLength, avgOvulationDay, lastPeriodDate } = stats;

  let daysDiff = daysBetween(date, lastPeriodDate);

  // Date antérieure au dernier début de règles — on force J1
  if (daysDiff < 0) {
    const phase = getCyclePhaseDisplay(1, avgPeriodLength, avgOvulationDay, avgCycleLength);
    return {
      phase,
      cycleDay: 1,
      cycleLength: avgCycleLength,
      periodLength: avgPeriodLength,
      ovulationDay: avgOvulationDay,
      date,
    };
  }

  // Calcule le jour du cycle courant (1-indexé)
  const cycleDay = (daysDiff % avgCycleLength) + 1;

  if (cycleDay <= 0) {
    console.error('[cyclePredictionService] cycleDay invalide :', cycleDay, 'pour la date', date);
    const phase = getCyclePhaseDisplay(1, avgPeriodLength, avgOvulationDay, avgCycleLength);
    return {
      phase,
      cycleDay: 1,
      cycleLength: avgCycleLength,
      periodLength: avgPeriodLength,
      ovulationDay: avgOvulationDay,
      date,
    };
  }

  const phase = getCyclePhaseDisplay(cycleDay, avgPeriodLength, avgOvulationDay, avgCycleLength);

  return {
    phase,
    cycleDay,
    cycleLength: avgCycleLength,
    periodLength: avgPeriodLength,
    ovulationDay: avgOvulationDay,
    date,
  };
}

/**
 * Calcule la phase pour chaque jour d'un mois entier.
 * Utilisé par le calendrier et l'écran de révélation.
 * Retourne un tableau vide si pas assez de données.
 */
export async function predictPhasesForMonth(
  userId: string,
  year: number,
  month: number // 1-12
): Promise<CycleDay[]> {
  // Vérifie que l'utilisatrice a activé le suivi de cycle
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cycle_tracking')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[cyclePredictionService] Erreur lecture profil :', profileError.message);
    return [];
  }

  if (profile && profile.cycle_tracking === false) {
    return [];
  }

  const stats = await fetchCycleStats(userId);
  if (!stats) return [];

  const { avgCycleLength, avgPeriodLength, avgOvulationDay, lastPeriodDate } = stats;

  // Validation des données de cycle
  if (avgCycleLength <= 0 || avgPeriodLength <= 0 || avgCycleLength < avgPeriodLength) {
    console.warn('[cyclePredictionService] Données de cycle invalides :', {
      avgCycleLength,
      avgPeriodLength,
      lastPeriodDate,
    });
    return [];
  }

  // Génère chaque jour du mois demandé
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: CycleDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = toDateString(new Date(year, month - 1, day));
    const daysDiff = daysBetween(date, lastPeriodDate);

    // Si la date est antérieure au dernier début de règles, on force J1
    if (daysDiff < 0) {
      const phase = getCyclePhaseDisplay(1, avgPeriodLength, avgOvulationDay, avgCycleLength);
      result.push({
        phase,
        cycleDay: 1,
        cycleLength: avgCycleLength,
        periodLength: avgPeriodLength,
        ovulationDay: avgOvulationDay,
        date,
      });
      continue;
    }

    const cycleDay = (daysDiff % avgCycleLength) + 1;

    // Sécurité : cycleDay doit être entre 1 et cycleLength
    if (cycleDay <= 0 || cycleDay > avgCycleLength) {
      console.warn('[cyclePredictionService] cycleDay invalide :', cycleDay, 'pour la date', date);
      continue;
    }

    const phase = getCyclePhaseDisplay(cycleDay, avgPeriodLength, avgOvulationDay, avgCycleLength);

    result.push({
      phase,
      cycleDay,
      cycleLength: avgCycleLength,
      periodLength: avgPeriodLength,
      ovulationDay: avgOvulationDay,
      date,
    });
  }

  return result;
}
