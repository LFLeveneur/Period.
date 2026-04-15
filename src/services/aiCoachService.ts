// Service Coach IA — appels webhook Make et gestion des conseils
import { supabase } from '@/lib/supabase';
import type {
  BeforeSessionPayload,
  AfterSessionPayload,
  AICoachResponse,
  BeforeSessionAdvice,
  AfterSessionAnalysis,
} from '@/types/aiCoach';
import type { SessionWithExercises } from './programService';
import type { ExerciseHistoryEntry, SessionHistoryDetail } from '@/types/workout';
import type { Profile } from '@/types/auth';
import type { CyclePhase } from '@/types/cycle';

// ─── Constructeurs de payload ─────────────────────────────────────────────

/**
 * Construit le payload pour l'analyse AVANT séance
 */
export function buildBeforePayload(
  profile: Profile,
  cyclePhase: CyclePhase | null,
  cycleDay: number,
  cycleLength: number,
  periodLength: number,
  sessionData: SessionWithExercises,
  exerciseHistories: Record<string, ExerciseHistoryEntry[]>
): BeforeSessionPayload {
  const daysUntilPeriod = cycleLength - cycleDay;

  const exercises = sessionData.exercises.map(ex => {
    const histories = exerciseHistories[ex.sessionExercise.id] ?? [];

    // Dernière séance (quelconque phase)
    const lastEntry = histories[0];
    const lastWeight = lastEntry?.set_details?.[0]?.actual.weight ?? null;
    const lastReps = lastEntry?.set_details?.[0]?.actual.reps ?? null;

    // Même phase du cycle
    const samePhaseEntry = histories.find(h => h.cycle_phase === cyclePhase);
    const samePhaseWeight = samePhaseEntry?.set_details?.[0]?.actual.weight ?? null;
    const samePhaseReps = samePhaseEntry?.set_details?.[0]?.actual.reps ?? null;

    // Record personnel
    let personalRecord: number | null = null;
    if (histories.length > 0) {
      const weights = histories
        .flatMap(h => h.set_details ?? [])
        .map(s => s.actual.weight)
        .filter((w): w is number => w !== null && w !== undefined);
      personalRecord = weights.length > 0 ? Math.max(...weights) : null;
    }

    const setTargets = ex.sessionExercise.set_targets ?? [];
    const firstTarget = setTargets[0];

    return {
      name: ex.sessionExercise.exercise_name ?? 'Exercice',
      sets: ex.sessionExercise.sets ?? setTargets.length,
      targetReps: firstTarget?.reps ?? 0,
      targetWeight: firstTarget?.weight ?? null,
      inputType: ex.sessionExercise.input_type ?? 'weight_reps',
      lastSessionWeight: lastWeight,
      lastSessionReps: lastReps,
      samePhaseLastWeight: samePhaseWeight,
      samePhaseLastReps: samePhaseReps,
      personalRecord,
    };
  });

  return {
    type: 'before_session',
    user: {
      name: profile.name ?? 'Utilisatrice',
      fitnessLevel: profile.level ?? 'intermediaire',
      objective: profile.objective ?? 'equilibre',
    },
    cycle: {
      phase: cyclePhase ?? 'unknown',
      cycleDay,
      cycleLength,
      periodLength,
      daysUntilPeriod,
    },
    session: {
      name: sessionData.session.name,
      totalExercisesCount: sessionData.exercises.length,
      exercises,
    },
  };
}

/**
 * Construit le payload pour l'analyse APRÈS séance
 */
export function buildAfterPayload(
  profile: Profile,
  cyclePhase: CyclePhase | null,
  cycleDay: number,
  cycleLength: number,
  detail: SessionHistoryDetail
): AfterSessionPayload {
  const daysUntilPeriod = cycleLength - cycleDay;

  const exercises = detail.exercises.map(ex => ({
    name: ex.exercise_name,
    avgRIR: ex.avg_rir,
    vs_previous_kg_delta: ex.vs_previous_kg_delta,
    vs_same_phase_kg_delta: ex.vs_same_phase_kg_delta,
    progression: ex.progression,
  }));

  return {
    type: 'after_session',
    user: {
      name: profile.name ?? 'Utilisatrice',
      fitnessLevel: profile.level ?? 'intermediaire',
      objective: profile.objective ?? 'equilibre',
    },
    cycle: {
      phase: cyclePhase ?? 'unknown',
      cycleDay,
      daysUntilPeriod,
    },
    session: {
      name: detail.session_name,
      durationMinutes: detail.duration_minutes,
      feeling: detail.feeling,
      energyScore: detail.energy_score,
      performanceScore: detail.performance_score,
      performanceLevel: detail.performance_level,
      totalVolume: detail.total_volume,
      victories: detail.victories,
      exercises,
    },
  };
}

// ─── Appel webhook ───────────────────────────────────────────────────────

const COACH_WEBHOOK_URL = 'https://hook.eu1.make.com/t24r5o84bw7an2wnjxtdlu6idqo54qum';
const WEBHOOK_TIMEOUT_MS = 20000; // 20 secondes

/**
 * Envoie le payload au Coach IA via webhook Make
 * Vérifie d'abord si le conseil existe en base pour éviter les appels dupliqués
 * Retourne { data } ou { data: null } silencieusement en cas d'erreur
 */
export async function sendToCoach(
  payload: BeforeSessionPayload | AfterSessionPayload,
  userId: string,
  sessionId: string | null,
  sessionHistoryId?: string | null
): Promise<{ data: { summary: string; detail: BeforeSessionAdvice | AfterSessionAnalysis; id: string } | null }> {
  // 1. Vérifier si déjà en base
  const fieldName = payload.type === 'before_session' ? 'session_id' : 'session_history_id';
  const fieldValue = payload.type === 'before_session' ? sessionId : sessionHistoryId;

  const { data: existing } = await supabase
    .from('ai_advice')
    .select('id, summary, payload')
    .eq('user_id', userId)
    .eq('type', payload.type)
    .eq(fieldName, fieldValue)
    .maybeSingle();

  if (existing) {
    // Déjà appelé, récupérer depuis la base
    const detail =
      payload.type === 'before_session'
        ? (existing.payload as any).advice
        : (existing.payload as any).analysis;
    return {
      data: {
        summary: existing.summary,
        detail,
        id: existing.id,
      },
    };
  }

  // 2. POST au webhook avec timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[aiCoachService] webhook timeout or error:', err);
    return { data: null }; // Silencieux
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    console.error('[aiCoachService] webhook error:', response.status);
    return { data: null }; // Silencieux
  }

  // 3. Parser la réponse
  // Make peut renvoyer soit un objet JSON direct, soit un tableau [{ body: "...", status: 200 }]
  let raw: any;
  try {
    raw = await response.json();
  } catch (err) {
    console.error('[aiCoachService] response not JSON:', err);
    return { data: null }; // Silencieux
  }

  let aiResponse: AICoachResponse;

  // Format tableau legacy : [{ body: "{...}", status: 200 }]
  if (Array.isArray(raw)) {
    let jsonStr: string = raw[0]?.body ?? '';

    // Nettoyage BOM (Byte Order Mark) — patterns Windows/Android
    if (typeof jsonStr === 'string' && jsonStr.charCodeAt(0) === 0xFEFF) {
      jsonStr = jsonStr.slice(1);
    }

    try {
      aiResponse = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    } catch (err) {
      console.error('[aiCoachService] JSON parse error:', err);
      return { data: null }; // Silencieux
    }
  } else {
    // Format direct : objet JSON
    aiResponse = raw as AICoachResponse;
  }

  // 4. INSERT dans ai_advice
  const { data: inserted, error: insertError } = await supabase
    .from('ai_advice')
    .insert({
      user_id: userId,
      session_id: sessionId,
      session_history_id: sessionHistoryId,
      type: payload.type,
      summary: aiResponse.summary,
      payload: aiResponse,
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    console.error('[aiCoachService] insert error:', insertError);
    // Retourner quand même le résultat même si la sauvegarde échoue
  }

  const detail =
    payload.type === 'before_session'
      ? (aiResponse as any).advice
      : (aiResponse as any).analysis;

  return {
    data: {
      summary: aiResponse.summary,
      detail,
      id: inserted?.id ?? crypto.randomUUID(),
    },
  };
}

/**
 * Récupère un conseil existant depuis la base
 * Utilisé par SessionActivePage pour réutiliser le conseil "before" sans nouvel appel webhook
 */
export async function getCoachAdvice(
  userId: string,
  type: 'before_session' | 'after_session',
  sessionId?: string | null,
  sessionHistoryId?: string | null
): Promise<{ data: { summary: string; detail: BeforeSessionAdvice | AfterSessionAnalysis; id: string } | null; error: string | null }> {
  const fieldName = type === 'before_session' ? 'session_id' : 'session_history_id';
  const fieldValue = type === 'before_session' ? sessionId : sessionHistoryId;

  const { data, error } = await supabase
    .from('ai_advice')
    .select('id, summary, payload')
    .eq('user_id', userId)
    .eq('type', type)
    .eq(fieldName, fieldValue)
    .maybeSingle();

  if (error) {
    console.error('[aiCoachService] getCoachAdvice error:', error);
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: null };
  }

  const detail = type === 'before_session' ? (data.payload as any).advice : (data.payload as any).analysis;

  return {
    data: {
      summary: data.summary,
      detail,
      id: data.id,
    },
    error: null,
  };
}
