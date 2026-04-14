// Types liés au tracking analytics et au feedback qualitatif
import type { FitnessLevel, FitnessObjective } from './auth';

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

/** Résumé admin d'un utilisateur — profil + activité agrégée */
export interface AdminUserSummary {
  user_id: string;
  name: string | null;
  level: FitnessLevel | null;
  objective: FitnessObjective | null;
  is_test_user: boolean;
  is_admin: boolean;
  onboarding_completed: boolean;
  created_at: string;
  /** Nombre total de séances loggées */
  sessions_logged: number;
  /** Date de dernière activité (dernier event) */
  last_active_at: string | null;
  /** Nombre total d'events trackés */
  events_total: number;
}

/** Détail individuel d'un utilisateur pour le panneau admin */
export interface UserDetail {
  events: AnalyticsEvent[];
  feedbacks: FeedbackEntry[];
}
