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

// ─── Fonctions admin — lecture des KPIs ──────────────────────────────────────
// Ces fonctions nécessitent que l'utilisatrice ait is_admin = true (RLS)

/**
 * Récupère le nombre d'events par type pour les KPIs d'activation.
 * Requiert le rôle admin (RLS).
 */
export async function getActivationKpis(): Promise<{
  data: ActivationKpis | null;
  error: string | null;
}> {
  try {
    // Compte les events distincts par type — one-time events = 1 par utilisatrice
    const { data, error } = await supabase
      .from('events')
      .select('event_type')
      .in('event_type', [
        'signup_started',
        'onboarding_completed',
        'cycle_filled',
        'training_filled',
        'session_logged',
      ]);

    if (error) return { data: null, error: error.message };

    const counts: ActivationKpis = {
      signup_started: 0,
      onboarding_completed: 0,
      cycle_filled: 0,
      training_filled: 0,
      session_logged: 0,
    };

    for (const row of data ?? []) {
      const type = row.event_type as keyof ActivationKpis;
      if (type in counts) counts[type]++;
    }

    return { data: counts, error: null };
  } catch (err) {
    console.error('[analyticsService] getActivationKpis', err);
    return { data: null, error: 'Erreur lors de la récupération des KPIs.' };
  }
}

/**
 * Calcule les métriques de rétention basées sur page_viewed.
 * Requiert le rôle admin (RLS).
 */
export async function getRetentionKpis(): Promise<{
  data: RetentionKpis | null;
  error: string | null;
}> {
  try {
    const now = new Date();
    const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Utilisatrices actives sur 7 jours
    const { data: data7d, error: err7d } = await supabase
      .from('events')
      .select('user_id')
      .eq('event_type', 'page_viewed')
      .gte('created_at', ago7d);

    if (err7d) return { data: null, error: err7d.message };

    // Utilisatrices actives sur 30 jours
    const { data: data30d, error: err30d } = await supabase
      .from('events')
      .select('user_id')
      .eq('event_type', 'page_viewed')
      .gte('created_at', ago30d);

    if (err30d) return { data: null, error: err30d.message };

    // Total utilisatrices (via signup_started ou onboarding_completed)
    const { data: dataTotal, error: errTotal } = await supabase
      .from('events')
      .select('user_id')
      .eq('event_type', 'signup_started');

    if (errTotal) return { data: null, error: errTotal.message };

    return {
      data: {
        active_7d: new Set((data7d ?? []).map((r) => r.user_id)).size,
        active_30d: new Set((data30d ?? []).map((r) => r.user_id)).size,
        total_users: new Set((dataTotal ?? []).map((r) => r.user_id)).size,
      },
      error: null,
    };
  } catch (err) {
    console.error('[analyticsService] getRetentionKpis', err);
    return { data: null, error: 'Erreur lors de la récupération de la rétention.' };
  }
}

/**
 * Récupère la répartition des séances loggées par phase du cycle.
 * La phase est stockée dans metadata.phase lors du trackEvent('session_logged').
 * Requiert le rôle admin (RLS).
 */
export async function getPhaseDistribution(): Promise<{
  data: PhaseDistribution[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('metadata')
      .eq('event_type', 'session_logged')
      .not('metadata', 'is', null);

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
