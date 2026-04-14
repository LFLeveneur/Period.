// Types liés à l'authentification et au profil utilisateur

export interface User {
  id: string;
  email: string;
}

/** Niveau d'entraînement de l'utilisatrice */
export type FitnessLevel = 'debutant' | 'intermediaire' | 'avance';

/** Objectif fitness de l'utilisatrice */
export type FitnessObjective = 'masse' | 'perte' | 'tonification' | 'equilibre';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  level: FitnessLevel | null;
  objective: FitnessObjective | null;
  cycle_tracking: boolean | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  is_admin: boolean;
  /** Marqué comme user de test — exclu des KPIs globaux */
  is_test_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthError {
  message: string;
}
