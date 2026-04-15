// Types pour le Coach IA — payloads webhook Make et réponses
import type { WorkoutFeeling, PerformanceLevel, VictoryType } from './workout';

// ─── Payload AVANT séance ─────────────────────────────────────────────────

export interface ExerciseBeforeData {
  name: string;
  sets: number;
  targetReps: number;
  targetWeight: number | null;
  inputType: string;
  lastSessionWeight: number | null;
  lastSessionReps: number | null;
  samePhaseLastWeight: number | null;
  samePhaseLastReps: number | null;
  personalRecord: number | null;
}

export interface BeforeSessionPayload {
  type: 'before_session';
  user: {
    name: string;
    fitnessLevel: string;
    objective: string;
  };
  cycle: {
    phase: string;
    cycleDay: number;
    cycleLength: number;
    periodLength: number;
    daysUntilPeriod: number;
  };
  session: {
    name: string;
    totalExercisesCount: number;
    exercises: ExerciseBeforeData[];
  };
}

// ─── Payload APRÈS séance ──────────────────────────────────────────────────

export interface ExerciseAfterData {
  name: string;
  avgRIR: number | null;
  vs_previous_kg_delta: number | null;
  vs_same_phase_kg_delta: number | null;
  progression: string | null;
}

export interface AfterSessionPayload {
  type: 'after_session';
  user: {
    name: string;
    fitnessLevel: string;
    objective: string;
  };
  cycle: {
    phase: string;
    cycleDay: number;
    daysUntilPeriod: number;
  };
  session: {
    name: string;
    durationMinutes: number | null;
    feeling: WorkoutFeeling | null;
    energyScore: number | null;
    performanceScore: number | null;
    performanceLevel: PerformanceLevel | null;
    totalVolume: number | null;
    victories: Array<{
      type: VictoryType;
      exerciseName: string;
      value: number;
      previousValue?: number;
      improvement?: string;
    }>;
    exercises: ExerciseAfterData[];
  };
}

// ─── Réponses du webhook ──────────────────────────────────────────────────

export interface Adjustment {
  label: string;
  advice: string;
}

export interface BeforeSessionAdvice {
  title: string;
  text: string;
  adjustments: Adjustment[];
}

export interface BeforeSessionResponse {
  type: 'before_session';
  summary: string;
  advice: BeforeSessionAdvice;
}

export interface AnalysisBlock {
  title: string;
  text: string;
}

export interface AfterSessionAnalysis {
  performance: AnalysisBlock;
  cycle: AnalysisBlock;
  recovery: AnalysisBlock;
  nextSession: AnalysisBlock;
}

export interface AfterSessionResponse {
  type: 'after_session';
  summary: string;
  analysis: AfterSessionAnalysis;
}

export type AICoachResponse = BeforeSessionResponse | AfterSessionResponse;

// ─── État du composant ────────────────────────────────────────────────────

export type AICoachState = 'idle' | 'loading' | 'ready' | 'error';

// ─── Props du composant ───────────────────────────────────────────────────

export interface AICoachCardProps {
  type: 'before_session' | 'after_session';
  state: AICoachState;
  summary?: string;
  detail?: BeforeSessionAdvice | AfterSessionAnalysis;
}

// ─── Données stockées en base ─────────────────────────────────────────────

export interface AIAdviceRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  session_history_id: string | null;
  type: 'before_session' | 'after_session';
  summary: string;
  payload: AICoachResponse;
  created_at: string;
}
