// Types liés au tracking analytics et au feedback qualitatif

/** Types d'événements trackés dans Supabase */
export type EventType =
  | 'signup_started'
  | 'onboarding_completed'
  | 'cycle_filled'
  | 'training_filled'
  | 'session_logged'
  | 'page_viewed'
  | 'feedback_submitted';

/** Events trackés une seule fois par utilisatrice */
export const ONE_TIME_EVENTS: EventType[] = [
  'signup_started',
  'onboarding_completed',
  'cycle_filled',
  'training_filled',
  'feedback_submitted',
];

/** Entrée brute d'un event en base */
export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Données d'un feedback qualitatif */
export interface FeedbackData {
  liked: string;
  frustrated: string;
}

/** Entrée brute d'un feedback en base */
export interface FeedbackEntry {
  id: string;
  user_id: string;
  liked: string | null;
  frustrated: string | null;
  created_at: string;
}

/** Résumé des KPIs d'activation pour le dashboard */
export interface ActivationKpis {
  signup_started: number;
  onboarding_completed: number;
  cycle_filled: number;
  training_filled: number;
  session_logged: number;
}

/** Résumé de rétention pour le dashboard */
export interface RetentionKpis {
  active_7d: number;
  active_30d: number;
  total_users: number;
}

/** Répartition des séances par phase du cycle */
export interface PhaseDistribution {
  phase: string;
  count: number;
}
