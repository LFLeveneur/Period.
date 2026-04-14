// Service de données du calendrier mensuel
import { supabase } from '@/lib/supabase';
import { predictPhasesForMonth } from '@/services/cyclePredictionService';
import type { CycleDay } from '@/types/cycle';

// ─── Types exportés ───────────────────────────────────────────────────────────

/** Données d'un jour dans le calendrier mensuel */
export interface CalendarDay {
  /** Date au format YYYY-MM-DD */
  date: string;
  /** Données de phase du cycle — null si cycle non suivi ou pas de données */
  cycleDay: CycleDay | null;
  /** Séances complétées ce jour (peut être plusieurs) */
  sessionHistory: { id: string; sessionName: string; durationMinutes: number }[];
  /** Séances prévues non complétées (peut être plusieurs) */
  pendingSession: {
    id: string;
    sessionName: string;
    completedHistoryId?: string; // Si défini, cette séance prévue a déjà été faite
  }[];
  /** Séances complétées sans correspondance dans les séances prévues (bonus/extra) */
  extraSessions: { id: string; sessionName: string; durationMinutes: number }[];
}

/** Résultat du calendrier mensuel */
export interface CalendarMonth {
  days: CalendarDay[];
}

// ─── Logique principale ───────────────────────────────────────────────────────

/**
 * Calcule toutes les données du calendrier pour un mois donné.
 * Combine : phases du cycle + séances complétées + séances prévues.
 * EC-29 : mois futurs calculés en mémoire via cyclePredictionService.
 */
export async function getCalendarMonth(
  userId: string,
  year: number,
  month: number // 1-12
): Promise<{ data: CalendarMonth | null; error: string | null }> {
  // Calcule les bornes du mois
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDayDate = new Date(year, month, 0);
  const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
  const daysInMonth = lastDayDate.getDate();

  // Obtient aujourd'hui au format YYYY-MM-DD pour filtrer les séances passées
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Requête parallèle : phases + séances complétées + séances prévues
  const [cycleDays, historyResult, pendingByDateResult, pendingByDayOfWeekResult] = await Promise.all([
    // 1. Phases du cycle pour le mois (en mémoire — EC-29)
    predictPhasesForMonth(userId, year, month),
    // 2. Séances complétées dans le mois — JOIN explicite via session_id
    supabase
      .from('session_history')
      .select('id, session_id, duration_minutes, completed_at, program_sessions!session_id(name)')
      .eq('user_id', userId)
      .gte('completed_at', firstDay)
      .lte('completed_at', lastDay + 'T23:59:59Z'),
    // 3. Séances prévues à date spécifique (scheduled_date)
    supabase
      .from('program_sessions')
      .select('id, name, scheduled_date')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('scheduled_date', firstDay)
      .lte('scheduled_date', lastDay)
      .is('day_of_week', null),
    // 4. Séances prévues récurrentes (day_of_week)
    supabase
      .from('program_sessions')
      .select('id, name, day_of_week')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .not('day_of_week', 'is', null),
  ]);

  // Erreurs non-bloquantes : on affiche quand même le calendrier sans les séances
  if (historyResult.error) {
    console.warn('[calendarService] Séances complétées non chargées (non bloquant) :', historyResult.error.message);
  }
  if (pendingByDateResult.error) {
    console.warn('[calendarService] Séances prévues (date) non chargées (non bloquant) :', pendingByDateResult.error.message);
  }
  if (pendingByDayOfWeekResult.error) {
    console.warn('[calendarService] Séances prévues (récurrentes) non chargées (non bloquant) :', pendingByDayOfWeekResult.error.message);
  }

  // Construit un index des séances complétées par date (YYYY-MM-DD) — accumule toutes les séances
  const historyByDate: Record<string, { id: string; sessionId: string | null; sessionName: string; durationMinutes: number }[]> = {};
  for (const row of (historyResult.data ?? []) as Record<string, unknown>[]) {
    const completedAt = row['completed_at'] as string | null;
    if (!completedAt) continue;
    const dateStr = completedAt.substring(0, 10);
    // Récupère le nom de la séance depuis la relation JOIN program_sessions
    const programSessions = row['program_sessions'] as Record<string, unknown> | null;
    const sessionName = (programSessions?.['name'] as string | null) ?? 'Séance';

    if (!historyByDate[dateStr]) {
      historyByDate[dateStr] = [];
    }
    historyByDate[dateStr]!.push({
      id: row['id'] as string,
      sessionId: (row['session_id'] as string | null) ?? null,
      sessionName,
      durationMinutes: (row['duration_minutes'] as number | null) ?? 0,
    });
  }

  // Construit un index des séances prévues par date — accumule toutes les séances
  const pendingByDate: Record<string, { id: string; sessionName: string; completedHistoryId?: string }[]> = {};

  // Ajouter les séances avec date spécifique (scheduled_date) — seulement si future ou aujourd'hui
  for (const row of (pendingByDateResult.data ?? []) as Record<string, unknown>[]) {
    const dateStr = row['scheduled_date'] as string | null;
    if (!dateStr || dateStr < todayStr) continue; // Exclure les séances passées
    if (!pendingByDate[dateStr]) {
      pendingByDate[dateStr] = [];
    }
    pendingByDate[dateStr]!.push({
      id: row['id'] as string,
      sessionName: (row['name'] as string | null) ?? 'Séance',
    });
  }

  // Ajouter les séances récurrentes (day_of_week) — seulement si future ou aujourd'hui
  for (const row of (pendingByDayOfWeekResult.data ?? []) as Record<string, unknown>[]) {
    const dayOfWeek = row['day_of_week'] as number | null;
    if (dayOfWeek === null || dayOfWeek === undefined) continue;

    const sessionId = row['id'] as string;
    const sessionName = (row['name'] as string | null) ?? 'Séance';

    // Générer toutes les dates du mois avec ce jour de la semaine
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const jsDay = date.getDay(); // 0=dimanche, 1=lundi, ..., 6=samedi
      const monFirstDay = (jsDay + 6) % 7; // Convertir en lun-first (0=lun, 6=dim)

      if (monFirstDay === dayOfWeek) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dateStr < todayStr) continue; // Exclure les séances passées
        if (!pendingByDate[dateStr]) {
          pendingByDate[dateStr] = [];
        }
        pendingByDate[dateStr]!.push({
          id: sessionId,
          sessionName,
        });
      }
    }
  }

  // Construit un index des phases par date
  const phaseByDate: Record<string, CycleDay> = {};
  for (const cd of cycleDays) {
    phaseByDate[cd.date] = cd;
  }

  // ─── Matching des séances prévues avec leurs complétions ────────────────────
  // Pour chaque séance prévue, cherche si elle a une sessionHistory correspondante
  for (const dateStr in pendingByDate) {
    const pendingSessions = pendingByDate[dateStr];
    const histories = historyByDate[dateStr] ?? [];

    for (const pending of pendingSessions) {
      // Cherche une sessionHistory correspondant à cette pendingSession
      const matchingHistory = histories.find(h => h.sessionId === pending.id);
      if (matchingHistory) {
        pending.completedHistoryId = matchingHistory.id;
      }
    }
  }

  // ─── Extraction des séances supplémentaires (complétées mais non prévues) ────
  // Crée un index des extraSessions par date
  const extraSessionsByDate: Record<string, { id: string; sessionName: string; durationMinutes: number }[]> = {};
  for (const dateStr in historyByDate) {
    const histories = historyByDate[dateStr];
    const pendingSessions = pendingByDate[dateStr] ?? [];

    // Créer un set des IDs de sessions prévues pour cette date
    const pendingSessionIds = new Set(pendingSessions.map(p => p.id));

    // Les sessions supplémentaires sont celles complétées sans correspondance prévue
    const extras = histories.filter(h => h.sessionId === null || !pendingSessionIds.has(h.sessionId));

    if (extras.length > 0) {
      extraSessionsByDate[dateStr] = extras.map(e => ({
        id: e.id,
        sessionName: e.sessionName,
        durationMinutes: e.durationMinutes,
      }));
    }
  }

  // Assemble les CalendarDay pour chaque jour du mois
  const days: CalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    days.push({
      date: dateStr,
      cycleDay: phaseByDate[dateStr] ?? null,
      // Garde TOUTES les sessionHistory (complétées ce jour)
      sessionHistory: (historyByDate[dateStr] ?? []).map(h => ({
        id: h.id,
        sessionName: h.sessionName,
        durationMinutes: h.durationMinutes,
      })),
      pendingSession: pendingByDate[dateStr] ?? [],
      extraSessions: extraSessionsByDate[dateStr] ?? [],
    });
  }

  return { data: { days }, error: null };
}
