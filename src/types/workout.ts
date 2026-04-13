// Types liés aux programmes, séances, exercices et historique d'entraînement
import type { CyclePhase, CyclePhaseDisplay } from './cycle';

// ─── Enums de base ───────────────────────────────────────────────────────────

/** Statut d'une séance planifiée */
export type SessionStatus = 'pending' | 'completed' | 'skipped';

/** Statut d'un programme */
export type ProgramStatus = 'active' | 'paused' | 'completed';

/** Source d'un exercice */
export type ExerciseSource = 'catalog' | 'custom';

/** Ressenti de fin de séance */
export type WorkoutFeeling = 'survival' | 'notgreat' | 'solid' | 'pr';

/** Alias pour compatibilité avec l'ancien code */
export type Feeling = WorkoutFeeling;

/** Niveau de performance calculé */
export type PerformanceLevel = 'beyond' | 'progression' | 'solid' | 'maintained' | 'decline';

/** Type de victoire dans le récap */
export type VictoryType = 'new_record' | 'better_than_previous_phase' | 'double_record';

/** Fréquence d'une séance template */
export type FrequencyType = 'weekly' | 'biweekly' | 'triweekly' | 'monthly';

/**
 * Type d'input pour un exercice — détermine les champs affichés pendant la séance.
 * weight_reps   → Poids (kg) + Reps + RIR
 * bodyweight_reps → Reps + RIR
 * cardio_duration → Durée (MM:SS)
 * cardio_distance → Distance (km) + Durée
 * weight_plus_load → Reps + Charge ajoutée + RIR
 */
export type ExerciseInputType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'cardio_duration'
  | 'cardio_distance'
  | 'weight_plus_load';

// ─── Exercices ────────────────────────────────────────────────────────────────

/** Exercice du catalogue global (lecture seule) */
export interface ExerciseCatalogItem {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  type: string | null;
  muscle_primary: string | null;
  muscle_secondary: string | null;
  is_public: boolean;
  /** Discriminant pour le type union AnyExercise */
  source: 'catalog';
}

/** Exercice personnalisé créé par l'utilisatrice */
export interface CustomExercise {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  type: string | null;
  muscle_primary: string | null;
  muscle_secondary: string | null;
  notes: string | null;
  created_at?: string;
  /** Discriminant pour le type union AnyExercise */
  source: 'custom';
}

/** Union des deux types d'exercices — utilisée partout où les deux sources sont possibles */
export type AnyExercise = ExerciseCatalogItem | CustomExercise;

// ─── Cibles de série ─────────────────────────────────────────────────────────

/** Cible planifiée pour une série. Stockée en jsonb dans session_exercises.set_targets */
export interface SetTarget {
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  added_load?: number;
  rir?: number;
  rest_after?: number;
}

/** État en temps réel d'une série pendant la séance active (jamais persisté directement) */
export interface SetState {
  weight?: string;
  reps?: string;
  rir?: string;
  duration?: number;
  distance?: number;
  added_load?: number;
  done: boolean;
  target?: SetTarget;
  note?: string;
}

/** Détail complet d'une série complétée. Stocké dans exercise_history.set_details (jsonb) */
export interface SetDetails {
  set: number;
  target: SetTarget;
  actual: {
    reps?: number;
    weight?: number;
    duration?: number;
    distance?: number;
    added_load?: number;
    rir?: number;
  };
  note?: string;
}

// ─── Programmes ───────────────────────────────────────────────────────────────

/** Programme d'entraînement */
export interface Program {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  is_active: boolean;
  status: ProgramStatus;
  created_at: string;
  updated_at?: string;
}

/** Séance planifiée dans un programme */
export interface ProgramSession {
  id: string;
  program_id: string | null;
  user_id: string;
  name: string;
  order_index: number;
  day_of_week: number | null;
  scheduled_date: string | null;
  status: SessionStatus;
  phase_recommendation?: string | null;
  created_at?: string;
}

/** Exercice planifié dans une séance */
export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_catalog_id: string | null;
  user_custom_exercise_id: string | null;
  set_targets: SetTarget[];
  sets?: number;
  reps?: string;
  weight?: number | null;
  order_index: number;
  completed: boolean;
  input_type?: ExerciseInputType;
  rest_between_sets?: number;
  rest_after_exercise?: number;
  is_substitution?: boolean;
  // Champs dénormalisés pour l'affichage (jointure)
  exercise_name?: string;
  exercise_category?: string;
  exercise_type?: string;
}

// ─── Séance à venir (accueil) ─────────────────────────────────────────────────

/** Séance à venir affichée sur l'écran d'accueil */
export interface UpcomingSession {
  id: string;
  name: string;
  programName: string;
  predictedPhase: CyclePhaseDisplay | null;
  /** Date YYYY-MM-DD — utilisée pour afficher le jour de la semaine */
  date: string;
}

// ─── Historique ───────────────────────────────────────────────────────────────

/** Enregistrement d'une séance complétée */
export interface SessionHistory {
  id: string;
  user_id: string;
  session_id: string | null;
  completed_at: string;
  duration_minutes: number | null;
  energy_score?: number;
  performance_score?: number;
  recovery_score?: number;
  total_volume?: number;
  // Champs legacy conservés pour compatibilité
  session_name?: string;
  feeling?: WorkoutFeeling | null;
  notes?: string | null;
  cycle_day?: number | null;
  cycle_phase?: CyclePhase | null;
  program_session_id?: string | null;
}

/** Détail des performances d'un exercice lors d'une séance complétée */
export interface ExerciseHistory {
  id: string;
  user_id: string;
  session_history_id: string;
  exercise_catalog_id: string | null;
  user_custom_exercise_id: string | null;
  set_details?: SetDetails[];
  reps_per_set?: string;
  weight_per_set?: string;
  avg_score?: number;
  progression?: 'up' | 'down' | 'stable';
  input_type?: ExerciseInputType;
  actual_rest_seconds?: number;
  was_substituted?: boolean;
  substituted_from_id?: string;
  // Legacy
  sets_completed?: number;
  reps_completed?: string;
  weight_kg?: number | null;
  notes?: string | null;
}

/** Récap de séance (données combinées) */
export interface SessionRecap {
  sessionHistory: SessionHistory;
  exercises: ExerciseHistory[];
}

// ─── Victoires et récap ───────────────────────────────────────────────────────

/** Victoire détectée et affichée dans le récap de séance */
export interface Victory {
  type: VictoryType;
  exerciseName: string;
  /** Poids du record ou delta d'amélioration (kg) */
  value: number;
  /** Valeur précédente pour comparaison */
  previousValue?: number;
  improvement?: string;
}

/** Données complètes du récap de fin de séance */
export interface SessionRecapData {
  durationMinutes: number;
  exercisesCompleted: number;
  feeling: WorkoutFeeling;
  performance: PerformanceLevel;
  victories: Victory[];
  energyVsPerformanceMessage: string;
}

// ─── Configuration des inputs par type ───────────────────────────────────────

/** Configuration d'un champ de saisie selon le type d'exercice */
export interface SetFieldConfig {
  name: keyof SetState;
  label: string;
  type: 'number' | 'decimal' | 'text' | 'time';
  required?: boolean;
  range?: [number, number];
  placeholder?: string;
}

// ─── État actif de séance ─────────────────────────────────────────────────────

/** État en temps réel d'une série pendant la séance active (valeurs numériques) */
export interface ActiveSetData {
  reps?: number;
  weight?: number;
  duration?: number;    // secondes (cardio)
  distance?: number;    // km (cardio)
  added_load?: number;
  rir?: number;
  completed: boolean;
}

// ─── Historique enrichi (pour comparaisons et récap) ─────────────────────────

/** Entrée d'historique d'exercice avec données de session (via jointure) */
export interface ExerciseHistoryEntry {
  id: string;
  session_history_id: string;
  exercise_catalog_id: string | null;
  user_custom_exercise_id: string | null;
  set_details: SetDetails[] | null;
  input_type: ExerciseInputType | null;
  // Données de session_history (via jointure)
  completed_at: string;
  cycle_phase: CyclePhase | null;
  cycle_day: number | null;
}

/** Détail d'un exercice dans le récap de séance (avec comparaisons calculées) */
export interface ExerciseHistoryDetail {
  id: string;
  exercise_catalog_id: string | null;
  user_custom_exercise_id: string | null;
  exercise_name: string;
  input_type: ExerciseInputType | null;
  set_details: SetDetails[] | null;
  progression: 'up' | 'down' | 'stable' | null;
  vs_previous_kg_delta: number | null;
  vs_same_phase_kg_delta: number | null;
  avg_rir: number | null;
  /** EC-28 : true si les données proviennent des colonnes CSV legacy */
  isLegacy?: boolean;
}

/** Élément de la liste d'historique (pour /history) */
export interface SessionHistoryItem {
  id: string;
  sessionName: string;
  completedAt: string;
  durationMinutes: number;
  cyclePhase: CyclePhaseDisplay | null;
  feeling: WorkoutFeeling | null;
  performanceScore: number | null;
  performanceLevel: PerformanceLevel | null;
  programId: string | null;
  programName: string | null;
}

/** Détail complet d'une session_history (pour le récap et /history/:id) */
export interface SessionHistoryDetail {
  id: string;
  session_id: string | null;
  session_name: string;
  completed_at: string;
  duration_minutes: number | null;
  feeling: WorkoutFeeling | null;
  cycle_phase: CyclePhase | null;
  cycle_day: number | null;
  total_volume: number | null;
  performance_score: number | null;
  performance_level: PerformanceLevel;
  energy_score: number | null;
  exercises: ExerciseHistoryDetail[];
  victories: Victory[];
}
