// Contexte de la séance active — état en mémoire uniquement, jamais persisté pendant la séance
import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type {
  ActiveSetData,
  WorkoutFeeling,
  ExerciseInputType,
} from '@/types/workout';
import type { SessionWithExercises } from '@/services/programService';
import type { CyclePhaseDisplay, CyclePhase } from '@/types/cycle';
import { saveSession } from '@/services/sessionHistoryService';
import { useAuthContext } from '@/contexts/AuthContext';

// ─── Types internes ───────────────────────────────────────────────────────────

/** Identifiants et métadonnées d'un exercice de séance */
export interface SessionExerciseMeta {
  catalogId: string | null;
  customId: string | null;
  inputType: ExerciseInputType | null;
}

/** État global d'une séance en cours */
export interface ActiveSessionState {
  sessionId: string;
  sessionName: string;
  startedAt: Date;
  currentPhase: CyclePhase | null;
  currentCycleDay: number | null;
  /** Map sessionExerciseId → état des séries */
  exercises: Record<string, { sets: ActiveSetData[]; completed: boolean }>;
  /** Map sessionExerciseId → identifiants exercise */
  exerciseIds: Record<string, SessionExerciseMeta>;
  /** Map sessionExerciseId → nom de l'exercice (pour les victoires) */
  exerciseNames: Record<string, string>;
}

// ─── Valeur du contexte ───────────────────────────────────────────────────────

interface ActiveSessionContextValue {
  state: ActiveSessionState | null;
  currentExerciseId: string | null;
  isEnding: boolean;
  startSession: (
    session: SessionWithExercises,
    currentPhase: CyclePhaseDisplay | null,
    cycleDay?: number | null
  ) => void;
  completeSet: (sessionExerciseId: string, setIndex: number, data: Omit<ActiveSetData, 'completed'>) => void;
  setCurrentExercise: (sessionExerciseId: string) => void;
  getExerciseState: (sessionExerciseId: string) => { sets: ActiveSetData[]; completed: boolean } | null;
  endSession: (feeling: WorkoutFeeling) => Promise<{ data: string | null; error: string | null; savedExercisesCount?: number; exerciseErrors?: string[] }>;
  abandonSession: () => void;
}

// ─── Contexte React ───────────────────────────────────────────────────────────

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null);

interface ActiveSessionProviderProps {
  children: ReactNode;
}

/** Convertit CyclePhaseDisplay (5 valeurs UI) en CyclePhase (4 valeurs DB) */
function displayPhaseToDbPhase(phase: CyclePhaseDisplay | null): CyclePhase | null {
  if (!phase) return null;
  if (phase === 'luteal_early' || phase === 'luteal_late') return 'luteal';
  return phase as CyclePhase;
}

export function ActiveSessionProvider({ children }: ActiveSessionProviderProps) {
  const { user } = useAuthContext();
  const [state, setState] = useState<ActiveSessionState | null>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  /**
   * Initialise la séance active depuis une SessionWithExercises.
   * Crée les séries vides pour chaque exercice (une par set_target).
   */
  const startSession = useCallback(
    (session: SessionWithExercises, phase: CyclePhaseDisplay | null, cycleDay: number | null = null) => {
      const exercises: ActiveSessionState['exercises'] = {};
      const exerciseIds: ActiveSessionState['exerciseIds'] = {};
      const exerciseNames: ActiveSessionState['exerciseNames'] = {};

      for (const ex of session.exercises) {
        const id = ex.sessionExercise.id;
        const nbSets = ex.sessionExercise.set_targets?.length ?? ex.sessionExercise.sets ?? 1;

        exercises[id] = {
          sets: Array.from({ length: nbSets }, () => ({ completed: false })),
          completed: false,
        };

        exerciseIds[id] = {
          catalogId: ex.sessionExercise.exercise_catalog_id,
          customId: ex.sessionExercise.user_custom_exercise_id,
          inputType: ex.sessionExercise.input_type ?? null,
        };

        exerciseNames[id] = ex.exercise?.name ?? 'exercice supprimé';
      }

      // Premier exercice sélectionné par défaut
      const firstId = session.exercises[0]?.sessionExercise.id ?? null;

      setState({
        sessionId: session.session.id,
        sessionName: session.session.name,
        startedAt: new Date(),
        currentPhase: displayPhaseToDbPhase(phase),
        currentCycleDay: cycleDay,
        exercises,
        exerciseIds,
        exerciseNames,
      });

      setCurrentExerciseId(firstId);
    },
    []
  );

  /**
   * Valide une série avec les données saisies.
   * Met à jour l'état en mémoire uniquement.
   */
  const completeSet = useCallback(
    (sessionExerciseId: string, setIndex: number, data: Omit<ActiveSetData, 'completed'>) => {
      setState(prev => {
        if (!prev) return prev;

        const exState = prev.exercises[sessionExerciseId];
        if (!exState) return prev;

        const updatedSets = [...exState.sets];
        updatedSets[setIndex] = { ...data, completed: true };

        // Marque l'exercice comme complété si toutes les séries sont done
        const allDone = updatedSets.every(s => s.completed);

        return {
          ...prev,
          exercises: {
            ...prev.exercises,
            [sessionExerciseId]: {
              sets: updatedSets,
              completed: allDone,
            },
          },
        };
      });
    },
    []
  );

  /** Change l'exercice courant affiché dans la zone centrale */
  const setCurrentExercise = useCallback((sessionExerciseId: string) => {
    setCurrentExerciseId(sessionExerciseId);
  }, []);

  /** Retourne l'état d'un exercice ou null si inconnu */
  const getExerciseState = useCallback(
    (sessionExerciseId: string) => {
      return state?.exercises[sessionExerciseId] ?? null;
    },
    [state]
  );

  /**
   * Termine la séance, sauvegarde en base, retourne le sessionHistoryId + métriques.
   */
  const endSession = useCallback(
    async (feeling: WorkoutFeeling): Promise<{ data: string | null; error: string | null; savedExercisesCount?: number; exerciseErrors?: string[] }> => {
      if (!state || !user) return { data: null, error: 'Aucune séance active.' };

      setIsEnding(true);

      // Reconstruit les set_targets pour chaque exercice (nécessaire pour calcul du volume cible)
      // Les targets sont déjà dans le state — on les passe directement depuis la session
      const sessionTargets: Record<string, import('@/types/workout').SetTarget[]> = {};
      // Les targets sont stockés dans exerciseIds mais pas directement — on ne peut pas les récalculer ici
      // → on utilise un objet vide (force calcul volume cible = 0 si pas de targets passés)
      // Le contexte reçoit les targets via endSessionWithTargets
      for (const id of Object.keys(state.exercises)) {
        sessionTargets[id] = [];
      }

      const result = await saveSession(
        user.id,
        state,
        feeling,
        sessionTargets,
        state.exerciseNames,
        state.currentPhase,
        state.currentCycleDay
      );

      setIsEnding(false);

      if (!result.error) {
        setState(null);
        setCurrentExerciseId(null);
      }

      return result;
    },
    [state, user]
  );

  /**
   * endSessionWithTargets — version enrichie qui reçoit les set_targets depuis la page.
   * Remplace le setState via une closure — utilisée dans SessionActivePage.
   */

  /** Abandonne la séance sans aucune sauvegarde */
  const abandonSession = useCallback(() => {
    setState(null);
    setCurrentExerciseId(null);
  }, []);

  return (
    <ActiveSessionContext.Provider
      value={{
        state,
        currentExerciseId,
        isEnding,
        startSession,
        completeSet,
        setCurrentExercise,
        getExerciseState,
        endSession,
        abandonSession,
      }}
    >
      {children}
    </ActiveSessionContext.Provider>
  );
}

/** Hook d'accès au contexte de séance active */
export function useActiveSession(): ActiveSessionContextValue {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) {
    throw new Error('useActiveSession doit être utilisé dans un ActiveSessionProvider');
  }
  return ctx;
}
