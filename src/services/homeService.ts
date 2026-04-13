// Service pour les données de l'écran d'accueil
import { supabase } from '@/lib/supabase';
import { predictPhaseForDate } from '@/services/cyclePredictionService';
import type { UpcomingSession } from '@/types/workout';

/** Formate la date d'aujourd'hui en YYYY-MM-DD */
function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Ajoute N jours à une date YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  // Le suffixe T00:00:00 évite les décalages de timezone
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Récupère les 3 prochaines séances du programme actif.
 * Pour chaque séance, calcule la phase prévue à today+index (j+0, j+1, j+2).
 * Retourne un tableau vide si aucun programme actif ou si aucune séance.
 */
export async function getUpcomingSessions(userId: string): Promise<UpcomingSession[]> {
  // Récupère le programme avec is_active = true
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (programError) {
    console.error('[homeService] Erreur récupération programme actif :', programError.message);
    return [];
  }

  if (!program) return [];

  // Récupère les 3 premières séances triées par order_index
  const { data: sessions, error: sessionsError } = await supabase
    .from('program_sessions')
    .select('id, name')
    .eq('program_id', program.id)
    .order('order_index', { ascending: true })
    .limit(3);

  if (sessionsError) {
    console.error('[homeService] Erreur récupération séances :', sessionsError.message);
    return [];
  }

  if (!sessions || sessions.length === 0) return [];

  const today = getTodayString();
  const result: UpcomingSession[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const sessionDate = addDays(today, i);

    // Calcule la phase prévue à cette date
    const cycleDay = await predictPhaseForDate(userId, sessionDate);

    result.push({
      id: session.id,
      name: session.name,
      programName: program.name,
      predictedPhase: cycleDay?.phase ?? null,
      date: sessionDate,
    });
  }

  return result;
}

/**
 * Retourne l'ID de la première séance du programme actif.
 * Utilisé par la BottomNav pour naviguer vers la prochaine séance.
 * Retourne null si aucun programme actif ou aucune séance.
 */
export async function getNextSessionId(userId: string): Promise<string | null> {
  const { data: program } = await supabase
    .from('programs')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!program) return null;

  const { data: session } = await supabase
    .from('program_sessions')
    .select('id')
    .eq('program_id', program.id)
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle();

  return session?.id ?? null;
}
