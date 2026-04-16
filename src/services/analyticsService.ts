// Service de tracking analytics — stocke les events dans Supabase
// Deux modes : one-time (flagué via user_settings) et répété (chaque appel)
import { supabase } from '@/lib/supabase';
import type {
  EventType,
  FeedbackData,
  FeedbackEntry,
  ActivationKpis,
  RetentionKpis,
  PhaseDistribution,
  PageViewStat,
  AdminUserSummary,
  UserDetail,
  AnalyticsEvent,
  NPSEntry,
} from '@/types/analytics';
import { ONE_TIME_EVENTS } from '@/types/analytics';

/** Clé utilisée dans user_settings pour marquer un event comme déjà tracké */
function flagKey(eventType: EventType): string {
  return `event_tracked_${eventType}`;
}

/**
 * Enregistre un événement analytics.
 * - Events one-time : trackés une seule fois par utilisatrice (flag dans user_settings)
 * - Events répétés : trackés à chaque appel (session_logged, page_viewed)
 * Retourne silencieusement en cas d'erreur — ne bloque jamais l'UX.
 * @param userId Optionnel — si fourni, utilise cet ID au lieu de getUser()
 */
export async function trackEvent(
  eventType: EventType,
  metadata?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    // Récupère le user_id — d'abord param, sinon getUser()
    let finalUserId = userId;
    if (!finalUserId) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return;
      finalUserId = authData.user.id;
    }
    const isOneTime = ONE_TIME_EVENTS.includes(eventType);

    if (isOneTime) {
      // Vérifie si l'event a déjà été tracké via user_settings
      const key = flagKey(eventType);
      const { data: existing } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', finalUserId)
        .eq('key', key)
        .maybeSingle();

      // Déjà tracké — on ne double pas l'insertion
      if (existing) return;

      // Insère l'event ET pose le flag en parallèle
      await Promise.all([
        supabase.from('events').insert({
          user_id: finalUserId,
          event_type: eventType,
          metadata: metadata ?? null,
        }),
        supabase.from('user_settings').upsert(
          { user_id: finalUserId, key, value: 'true' },
          { onConflict: 'user_id,key' }
        ),
      ]);
    } else {
      // Event répété — insertion directe sans flag
      await supabase.from('events').insert({
        user_id: finalUserId,
        event_type: eventType,
        metadata: metadata ?? null,
      });
    }
  } catch (err) {
    // Erreur non bloquante — on logue sans crasher
    console.error('[analyticsService] trackEvent', err);
  }
}

/**
 * Soumet un feedback qualitatif.
 * Retourne { error } en cas d'échec.
 */
export async function submitFeedback(
  data: FeedbackData
): Promise<{ error: string | null }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { error: 'Utilisatrice non connectée.' };
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: authData.user.id,
      liked: data.liked || null,
      frustrated: data.frustrated || null,
    });

    if (error) return { error: error.message };

    // Track l'event feedback_submitted
    await trackEvent('feedback_submitted');

    return { error: null };
  } catch (err) {
    console.error('[analyticsService] submitFeedback', err);
    return { error: 'Une erreur est survenue.' };
  }
}

/**
 * Soumet un score NPS (1-10).
 * Retourne { error } en cas d'échec.
 */
export async function submitNPS(score: number): Promise<{ error: string | null }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { error: 'Utilisatrice non connectée.' };
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: authData.user.id,
      nps_score: score,
    });

    if (error) return { error: error.message };

    // Track l'event nps_submitted
    await trackEvent('nps_submitted', { score });

    return { error: null };
  } catch (err) {
    console.error('[analyticsService] submitNPS', err);
    return { error: 'Une erreur est survenue.' };
  }
}

/**
 * Vérifie si l'utilisatrice a déjà soumis une note NPS.
 * Retourne true si une note existe, false sinon.
 */
export async function hasUserSubmittedNPS(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('nps_score')
      .eq('user_id', userId)
      .not('nps_score', 'is', null)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[analyticsService] hasUserSubmittedNPS', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[analyticsService] hasUserSubmittedNPS', err);
    return false;
  }
}

/**
 * Récupère les scores NPS les plus récents.
 * Requiert le rôle admin (RLS).
 * @param limit Nombre de scores à retourner
 * @param excludeUserIds IDs des users à exclure (ex: users de test)
 */
export async function getNPSList(
  limit = 50,
  excludeUserIds: string[] = []
): Promise<{
  data: NPSEntry[] | null;
  error: string | null;
}> {
  try {
    let query = supabase
      .from('feedback')
      .select('id, user_id, nps_score, created_at')
      .not('nps_score', 'is', null)
      .order('created_at', { ascending: false });

    // Exclure les users de test
    if (excludeUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }

    const { data: npsData, error: npsError } = await query.limit(limit);

    if (npsError) return { data: null, error: npsError.message };

    // Récupère les noms des users
    const userIds = (npsData ?? []).map((n) => n.user_id);
    let profileMap: Record<string, string | null> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      profileMap = (profiles ?? []).reduce(
        (acc, p) => {
          acc[p.user_id] = p.display_name;
          return acc;
        },
        {} as Record<string, string | null>
      );
    }

    const result: NPSEntry[] = (npsData ?? []).map((n) => ({
      id: n.id,
      user_id: n.user_id,
      nps_score: n.nps_score,
      user_name: profileMap[n.user_id] ?? null,
      created_at: n.created_at,
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error('[analyticsService] getNPSList', err);
    return { data: null, error: 'Erreur lors de la récupération des NPS.' };
  }
}

// ─── Fonctions admin — lecture des KPIs ──────────────────────────────────────
// Ces fonctions nécessitent que l'utilisatrice ait is_admin = true (RLS)

/**
 * Récupère le nombre d'events par type pour les KPIs d'activation.
 * Requiert le rôle admin (RLS).
 * @param excludeUserIds IDs des users à exclure (ex: users de test)
 */
export async function getActivationKpis(excludeUserIds: string[] = []): Promise<{
  data: ActivationKpis | null;
  error: string | null;
}> {
  try {
    // Source de vérité pour les inscriptions : table profiles (pas les events signup_started,
    // qui peuvent manquer pour les utilisatrices inscrites avant la mise en place du tracking)
    let profilesQuery = supabase
      .from('profiles')
      .select('user_id')
      .eq('is_test_user', false)
      .eq('is_admin', false);

    if (excludeUserIds.length > 0) {
      profilesQuery = profilesQuery.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }

    const { data: profilesData, error: profilesError } = await profilesQuery;
    if (profilesError) return { data: null, error: profilesError.message };

    const totalRegistered = (profilesData ?? []).length;

    // Récupère user_id + event_type pour compter les utilisatrices DISTINCTES par type d'event
    let eventsQuery = supabase
      .from('events')
      .select('event_type, user_id')
      .in('event_type', ['onboarding_completed', 'cycle_filled', 'session_logged']);

    if (excludeUserIds.length > 0) {
      eventsQuery = eventsQuery.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }

    const { data, error } = await eventsQuery;

    if (error) return { data: null, error: error.message };

    // Utilise des Sets pour dédupliquer par user_id — une utilisatrice = 1 comptage max
    const userSets = {
      onboarding_completed: new Set<string>(),
      cycle_filled: new Set<string>(),
      session_logged: new Set<string>(),
    };

    for (const row of data ?? []) {
      const type = row.event_type as keyof typeof userSets;
      if (type in userSets) userSets[type].add(row.user_id);
    }

    // Programmes créés — source de vérité : table programs (pas les events training_filled)
    let programsQuery = supabase
      .from('programs')
      .select('id, user_id');

    if (excludeUserIds.length > 0) {
      programsQuery = programsQuery.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }

    const { data: programsData, error: programsError } = await programsQuery;
    if (programsError) return { data: null, error: programsError.message };

    return {
      data: {
        signup_started: totalRegistered,
        onboarding_completed: userSets.onboarding_completed.size,
        cycle_filled: userSets.cycle_filled.size,
        training_filled: (programsData ?? []).length,
        session_logged: userSets.session_logged.size,
      },
      error: null,
    };
  } catch (err) {
    console.error('[analyticsService] getActivationKpis', err);
    return { data: null, error: 'Erreur lors de la récupération des KPIs.' };
  }
}

/**
 * Calcule les métriques de rétention basées sur page_viewed.
 * Requiert le rôle admin (RLS).
 * @param excludeUserIds IDs des users à exclure (ex: users de test)
 */
export async function getRetentionKpis(excludeUserIds: string[] = []): Promise<{
  data: RetentionKpis | null;
  error: string | null;
}> {
  try {
    const now = new Date();
    const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Filtre commun pour exclure les users de test
    const applyExclusion = <T extends { not: (col: string, op: string, val: string) => T }>(q: T) =>
      excludeUserIds.length > 0 ? q.not('user_id', 'in', `(${excludeUserIds.join(',')})`) : q;

    // Utilisatrices actives sur 7 jours
    const { data: data7d, error: err7d } = await applyExclusion(
      supabase.from('events').select('user_id').eq('event_type', 'page_viewed').gte('created_at', ago7d)
    );

    if (err7d) return { data: null, error: err7d.message };

    // Utilisatrices actives sur 30 jours
    const { data: data30d, error: err30d } = await applyExclusion(
      supabase.from('events').select('user_id').eq('event_type', 'page_viewed').gte('created_at', ago30d)
    );

    if (err30d) return { data: null, error: err30d.message };

    // Total utilisatrices — source de vérité : table profiles (pas les events)
    let profilesQuery = supabase
      .from('profiles')
      .select('user_id')
      .eq('is_test_user', false)
      .eq('is_admin', false);

    if (excludeUserIds.length > 0) {
      profilesQuery = profilesQuery.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }

    const { data: dataTotal, error: errTotal } = await profilesQuery;

    if (errTotal) return { data: null, error: errTotal.message };

    return {
      data: {
        active_7d: new Set((data7d ?? []).map((r) => r.user_id)).size,
        active_30d: new Set((data30d ?? []).map((r) => r.user_id)).size,
        total_users: (dataTotal ?? []).length,
      },
      error: null,
    };
  } catch (err) {
    console.error('[analyticsService] getRetentionKpis', err);
    return { data: null, error: 'Erreur lors de la récupération de la rétention.' };
  }
}

/**
 * Récupère les statistiques de vues par page (path dans metadata).
 * Trie par nombre de vues décroissant.
 * Requiert le rôle admin (RLS).
 */
export async function getPageViewStats(excludeUserIds: string[] = []): Promise<{
  data: PageViewStat[] | null;
  error: string | null;
}> {
  try {
    let query = supabase
      .from('events')
      .select('user_id, metadata')
      .eq('event_type', 'page_viewed')
      .not('metadata', 'is', null);

    if (excludeUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };

    // Agrège les vues par path côté client
    const statsMap: Record<string, { views: number; users: Set<string> }> = {};

    for (const row of data ?? []) {
      const path = (row.metadata as Record<string, unknown>)?.path as string | undefined;
      if (!path) continue;
      if (!statsMap[path]) statsMap[path] = { views: 0, users: new Set() };
      statsMap[path].views++;
      statsMap[path].users.add(row.user_id);
    }

    const result: PageViewStat[] = Object.entries(statsMap)
      .map(([path, { views, users }]) => ({ path, views, unique_users: users.size }))
      .sort((a, b) => b.views - a.views);

    return { data: result, error: null };
  } catch (err) {
    console.error('[analyticsService] getPageViewStats', err);
    return { data: null, error: 'Erreur lors de la récupération des pages vues.' };
  }
}

/**
 * Récupère la répartition des séances loggées par phase du cycle.
 * La phase est stockée dans metadata.phase lors du trackEvent('session_logged').
 * Requiert le rôle admin (RLS).
 */
export async function getPhaseDistribution(excludeUserIds: string[] = []): Promise<{
  data: PhaseDistribution[] | null;
  error: string | null;
}> {
  try {
    let query = supabase
      .from('events')
      .select('metadata')
      .eq('event_type', 'session_logged')
      .not('metadata', 'is', null);

    if (excludeUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) return { data: null, error: error.message };

    // Agrège par phase côté client
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const phase = (row.metadata as Record<string, unknown>)?.phase as string | undefined;
      if (phase) {
        counts[phase] = (counts[phase] ?? 0) + 1;
      }
    }

    const result: PhaseDistribution[] = Object.entries(counts)
      .map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => b.count - a.count);

    return { data: result, error: null };
  } catch (err) {
    console.error('[analyticsService] getPhaseDistribution', err);
    return { data: null, error: 'Erreur lors de la récupération des phases.' };
  }
}

/**
 * Récupère les feedbacks qualitatifs les plus récents.
 * Requiert le rôle admin (RLS).
 */
export async function getFeedbackList(limit = 50): Promise<{
  data: FeedbackEntry[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('id, user_id, liked, frustrated, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    return { data: data as FeedbackEntry[], error: null };
  } catch (err) {
    console.error('[analyticsService] getFeedbackList', err);
    return { data: null, error: 'Erreur lors de la récupération des feedbacks.' };
  }
}

/**
 * Compte le nombre total d'utilisatrices inscrites.
 * Appelle la RPC Postgres count_users() — requiert son déploiement en base.
 * Aucune restriction — peut être appelée publiquement.
 */
export async function getUserCount(): Promise<{
  data: number | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc('count_users');

    if (error) return { data: null, error: error.message };

    return { data: data as number, error: null };
  } catch (err) {
    console.error('[analyticsService] getUserCount', err);
    return { data: null, error: 'Erreur lors du comptage des utilisatrices.' };
  }
}

/**
 * Récupère la liste de tous les profils avec leur résumé d'activité.
 * Requiert une RLS admin sur profiles (voir migration SQL).
 */
export async function getAdminUserList(): Promise<{
  data: AdminUserSummary[] | null;
  error: string | null;
}> {
  try {
    // Récupère tous les profils
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, name, level, objective, is_test_user, is_admin, onboarding_completed, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) return { data: null, error: profilesError.message };

    // Récupère tous les events pour agréger l'activité par user
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('user_id, event_type, created_at');

    if (eventsError) return { data: null, error: eventsError.message };

    // Agrège les events par user_id
    const activityByUser: Record<string, { sessions: number; last_active: string | null; total: number }> = {};
    for (const ev of events ?? []) {
      if (!activityByUser[ev.user_id]) {
        activityByUser[ev.user_id] = { sessions: 0, last_active: null, total: 0 };
      }
      activityByUser[ev.user_id].total++;
      if (ev.event_type === 'session_logged') {
        activityByUser[ev.user_id].sessions++;
      }
      const current = activityByUser[ev.user_id].last_active;
      if (!current || ev.created_at > current) {
        activityByUser[ev.user_id].last_active = ev.created_at;
      }
    }

    const result: AdminUserSummary[] = (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      name: p.name ?? null,
      level: p.level ?? null,
      objective: p.objective ?? null,
      is_test_user: p.is_test_user ?? false,
      is_admin: p.is_admin ?? false,
      onboarding_completed: p.onboarding_completed ?? false,
      created_at: p.created_at,
      sessions_logged: activityByUser[p.user_id]?.sessions ?? 0,
      last_active_at: activityByUser[p.user_id]?.last_active ?? null,
      events_total: activityByUser[p.user_id]?.total ?? 0,
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error('[analyticsService] getAdminUserList', err);
    return { data: null, error: 'Erreur lors de la récupération des utilisateurs.' };
  }
}

/**
 * Active ou désactive le flag "user de test" sur un profil.
 * Requiert une RLS admin sur profiles (voir migration SQL).
 */
export async function toggleTestUser(
  userId: string,
  isTest: boolean
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_test_user: isTest })
      .eq('user_id', userId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[analyticsService] toggleTestUser', err);
    return { error: 'Erreur lors de la mise à jour.' };
  }
}

/**
 * Récupère le détail d'un utilisateur spécifique (events + feedbacks + NPS).
 * Requiert le rôle admin (RLS events/feedback).
 */
export async function getUserDetail(userId: string): Promise<{
  data: UserDetail | null;
  error: string | null;
}> {
  try {
    const [eventsRes, feedbackRes, npsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, user_id, event_type, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('feedback')
        .select('id, user_id, liked, frustrated, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('feedback')
        .select('id, user_id, nps_score, created_at')
        .eq('user_id', userId)
        .not('nps_score', 'is', null)
        .order('created_at', { ascending: false }),
    ]);

    if (eventsRes.error) return { data: null, error: eventsRes.error.message };

    const npsScores: NPSEntry[] = (npsRes.data ?? []).map((n) => ({
      id: n.id,
      user_id: n.user_id,
      nps_score: n.nps_score,
      user_name: undefined,
      created_at: n.created_at,
    }));

    return {
      data: {
        events: (eventsRes.data ?? []) as AnalyticsEvent[],
        feedbacks: (feedbackRes.data ?? []) as FeedbackEntry[],
        nps_scores: npsScores,
      },
      error: null,
    };
  } catch (err) {
    console.error('[analyticsService] getUserDetail', err);
    return { data: null, error: 'Erreur lors de la récupération du détail.' };
  }
}
