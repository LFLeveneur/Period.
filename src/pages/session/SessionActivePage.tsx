// Page séance active (mode immersif) — cœur de la séance
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useParams, useNavigate } from 'react-router';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getSessionById } from '@/services/programService';
import { getExerciseHistory } from '@/services/sessionHistoryService';
import { SessionTimer } from '@/components/session/SessionTimer';
import { RestTimer } from '@/components/session/RestTimer';
import { ExerciseZone } from '@/components/session/ExerciseZone';
import { ExerciseNav } from '@/components/session/ExerciseNav';
import { FeelingModal } from '@/components/session/FeelingModal';
import { Modal } from '@/components/ui/Modal';
import { CYCLE_ADVICE } from '@/constants/session';
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import type { SessionWithExercises } from '@/services/programService';
import type { ExerciseHistoryEntry, WorkoutFeeling, ActiveSetData } from '@/types/workout';
import type { CyclePhaseDisplay } from '@/types/cycle';
import * as analytics from '@/lib/analytics';

export function SessionActivePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const {
    state,
    currentExerciseId,
    isEnding,
    completeSet,
    setCurrentExercise,
    getExerciseState,
    endSession,
    abandonSession,
  } = useActiveSession();

  // Données de la session (pour l'affichage)
  const [sessionData, setSessionData] = useState<SessionWithExercises | null>(null);
  const [exerciseHistories, setExerciseHistories] = useState<Record<string, ExerciseHistoryEntry[]>>({});

  // État UI
  const [feelingOpen, setFeelingOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [noSetsWarningOpen, setNoSetsWarningOpen] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(60);

  // Targets pour le calcul du score de performance
  const sessionTargetsRef = useRef<Record<string, import('@/types/workout').SetTarget[]>>({});

  // Empêche le guard "state null → preview" de s'activer quand on navigue vers le recap
  const navigatingToRecap = useRef(false);

  // EC-20 : Protection contre fermeture de page
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Guard : si pas de state (accès direct sans passer par preview) → redirect preview
  // Ignoré si on navigue volontairement vers le recap
  useEffect(() => {
    if (state === null && !isEnding && !navigatingToRecap.current) {
      navigate(`/session/${id}/preview`, { replace: true });
    }
  }, [state, isEnding, id, navigate]);

  // Charge les données de la session pour l'affichage et l'historique
  useEffect(() => {
    if (!id || !user || !state) return;

    async function load() {
      const { data } = await getSessionById(id!);
      if (!data) return;

      setSessionData(data);

      // Stocke les targets pour calcul performance
      const targets: Record<string, import('@/types/workout').SetTarget[]> = {};
      for (const ex of data.exercises) {
        targets[ex.sessionExercise.id] = ex.sessionExercise.set_targets ?? [];
      }
      sessionTargetsRef.current = targets;

      // Charge l'historique en parallèle
      const histories: Record<string, ExerciseHistoryEntry[]> = {};
      await Promise.all(
        data.exercises.map(async ex => {
          const { data: hist } = await getExerciseHistory(
            user!.id,
            ex.sessionExercise.exercise_catalog_id,
            ex.sessionExercise.user_custom_exercise_id,
            20 // 20 entrées pour couvrir la même phase du cycle précédent (~4 semaines de séances)
          );
          histories[ex.sessionExercise.id] = hist ?? [];
        })
      );
      setExerciseHistories(histories);
    }

    load();
  }, [id, user, state]);

  // Exercice courant
  const currentExerciseData = sessionData?.exercises.find(
    ex => ex.sessionExercise.id === currentExerciseId
  );

  // Phase courante pour les affichages
  const currentPhaseDisplay = state?.currentPhase
    ? (state.currentPhase === 'luteal' ? 'luteal_early' : state.currentPhase) as CyclePhaseDisplay
    : null;
  const phaseConfig = currentPhaseDisplay ? PHASE_DISPLAY_CONFIG[currentPhaseDisplay] : null;
  const phaseAdvice = currentPhaseDisplay ? CYCLE_ADVICE[currentPhaseDisplay]?.active : null;

  // Calcul de la progression globale
  const totalExercises = sessionData?.exercises.length ?? 0;
  const completedExercises = Object.values(state?.exercises ?? {}).filter(ex => ex.completed).length;
  const progressPercent = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  // Validation d'une série
  const handleCompleteSet = (setIndex: number, data: Omit<ActiveSetData, 'completed'>) => {
    if (!currentExerciseId) return;
    completeSet(currentExerciseId, setIndex, data);

    // Track la série validée
    const ex = sessionData?.exercises.find(e => e.sessionExercise.id === currentExerciseId);
    analytics.track('session_set_completed', {
      session_id: id,
      exercise_name: ex?.exercise?.name ?? '',
      set_number: setIndex + 1,
      input_type: ex?.sessionExercise.input_type ?? '',
      has_weight: data.weight !== null && data.weight !== undefined,
      has_reps: data.reps !== null && data.reps !== undefined,
      has_rir: data.rir !== null && data.rir !== undefined,
      rest_skipped: false,
    });

    // Affiche le timer de repos après validation (défaut 60s)
    const rest = ex?.sessionExercise.rest_between_sets ?? 60;
    setRestDuration(rest);
    setShowRestTimer(true);
  };

  // Fin de séance
  const handleEndSession = async (feeling: WorkoutFeeling) => {
    setFeelingOpen(false);

    // Bloque le guard "state null → preview" avant que endSession vide le state
    navigatingToRecap.current = true;
    const result = await endSession(feeling);

    if (result.error) {
      // Erreur de sauvegarde — le guard peut reprendre son rôle normal
      navigatingToRecap.current = false;
      // EC-25 : toast d'erreur + CTA retour accueil
      showToast('sauvegarde échouée. tes données sont perdues.', 'error');
      analytics.track('session_abandoned', {
        session_id: id,
        exercises_touched: Object.keys(state?.exercises ?? {}).length,
        duration_minutes: state ? Math.floor((Date.now() - state.startedAt.getTime()) / 60000) : 0,
        current_phase: currentPhaseDisplay,
      });
      navigate('/home', { replace: true });
      return;
    }

    // Avertit si des exercices n'ont pas pu être sauvegardés (erreur Supabase)
    if (result.exerciseErrors && result.exerciseErrors.length > 0) {
      showToast(
        `${result.exerciseErrors.length} exercice(s) non sauvegardé(s) — vérifie ta connexion.`,
        'error'
      );
      console.error('[SessionActivePage] exercices non sauvegardés :', result.exerciseErrors);
    }

    // Track la séance terminée avec succès
    const durationMinutes = state ? Math.floor((Date.now() - state.startedAt.getTime()) / 60000) : 0;
    analytics.track('session_completed', {
      session_id: id,
      duration_minutes: durationMinutes,
      feeling,
      current_phase: currentPhaseDisplay,
      saved_exercises_count: result.savedExercisesCount ?? 0,
    });

    navigate(`/session/${id}/recap`, {
      state: { sessionHistoryId: result.data },
      replace: true,
    });
  };

  // Abandon sans sauvegarde
  const handleAbandon = () => {
    analytics.track('session_abandoned', {
      session_id: id,
      exercises_touched: Object.keys(state?.exercises ?? {}).length,
      duration_minutes: state ? Math.floor((Date.now() - state.startedAt.getTime()) / 60000) : 0,
      current_phase: currentPhaseDisplay,
    });
    abandonSession();
    navigate('/home', { replace: true });
  };

  if (!state) return null;

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        backgroundImage: 'radial-gradient(circle at top right, rgba(162, 107, 240, 0.12), transparent 400px)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        // Espace pour le bouton sticky en bas
        paddingBottom: '160px',
      }}
    >
      {/* Header fixe — timer + nom + abandon */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-nav)' as React.CSSProperties['zIndex'],
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          padding: 'calc(var(--space-3) + env(safe-area-inset-top, 0px)) var(--space-4) var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        {/* Timer + nom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-2) var(--space-3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              flexShrink: 0,
            }}
          >
            <motion.span 
              animate={{ opacity: [1, 0.5, 1] }} 
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: '12px' }}
            >
              ⏱
            </motion.span>
            <SessionTimer startedAt={state.startedAt} />
          </motion.div>
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-base)',
              fontWeight: 800,
              color: 'var(--color-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.02em',
            }}
          >
            {state.sessionName}
          </span>
        </div>

        {/* Bouton abandonner uniquement dans le header */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAbandonOpen(true)}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-2) var(--space-3)',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-xs)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#ef4444',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          abandonner
        </motion.button>
      </motion.header>

      {/* Bandeau de phase compact */}
      {phaseConfig && phaseAdvice && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{
            background: `linear-gradient(135deg, ${phaseConfig.color}22 0%, ${phaseConfig.color}11 100%)`,
            borderBottom: `1px solid ${phaseConfig.color}33`,
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            flexShrink: 0,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              fontSize: '16px',
              flexShrink: 0,
              background: 'white',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px ${phaseConfig.color}44`
            }}
          >
            ✨
          </motion.div>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: phaseConfig.cardTextColor || 'var(--color-text)',
              lineHeight: 1.4,
            }}
          >
            {phaseAdvice}
          </p>
        </motion.div>
      )}

      {/* Barre de progression globale */}
      {totalExercises > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface)',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 800,
                color: 'var(--color-text-muted)',
              }}
            >
              progression — {completedExercises}/{totalExercises}
            </span>
            <motion.span
              key={progressPercent}
              initial={{ scale: 1.2, color: 'var(--color-primary)' }}
              animate={{ scale: 1, color: progressPercent === 100 ? 'var(--color-success)' : 'var(--color-text-muted)' }}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {progressPercent}%
            </motion.span>
          </div>
          {/* Barre de progression */}
          <div
            style={{
              height: '6px',
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              style={{
                height: '100%',
                background: progressPercent === 100 
                  ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' 
                  : 'linear-gradient(90deg, var(--color-primary) 0%, #c584ee 100%)',
                borderRadius: 'var(--radius-full)',
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Navigation exercices — en haut pour accès immédiat */}
      {sessionData && (
        <ExerciseNav
          exercises={sessionData.exercises}
          currentId={currentExerciseId}
          exercisesState={state.exercises}
          onSelect={setCurrentExercise}
        />
      )}

      {/* Zone exercice courant */}
      {currentExerciseData && (
        <ExerciseZone
          exerciseWithDetails={currentExerciseData}
          exerciseState={currentExerciseId ? getExerciseState(currentExerciseId) : null}
          onCompleteSet={handleCompleteSet}
          onEditSet={(setIndex, data) => {
            // Correction d'une série déjà validée — pas de timer de repos
            if (currentExerciseId) completeSet(currentExerciseId, setIndex, data);
          }}
          history={currentExerciseId ? (exerciseHistories[currentExerciseId] ?? []) : []}
          currentPhase={currentPhaseDisplay}
        />
      )}

      {/* Timer de repos */}
      {showRestTimer && (
        <RestTimer
          duration={restDuration}
          onSkip={() => setShowRestTimer(false)}
          onAdjust={delta =>
            setRestDuration(prev => Math.max(5, prev + delta))
          }
          onComplete={() => {
            setShowRestTimer(false);
            navigator.vibrate?.(200);
          }}
        />
      )}

      {/* Modale ressenti */}
      <FeelingModal
        isOpen={feelingOpen}
        onSelect={handleEndSession}
        onCancel={() => setFeelingOpen(false)}
        isLoading={isEnding}
      />

      {/* Modale abandon */}
      <Modal
        isOpen={abandonOpen}
        title="abandonner la séance ?"
        confirmLabel="abandonner"
        cancelLabel="continuer la séance"
        isDanger
        onConfirm={handleAbandon}
        onCancel={() => setAbandonOpen(false)}
      >
        tes données ne seront pas sauvegardées.
      </Modal>

      {/* Modale avertissement — aucune série validée */}
      <Modal
        isOpen={noSetsWarningOpen}
        title="aucune série validée"
        confirmLabel="terminer quand même"
        cancelLabel="revenir à la séance"
        onConfirm={() => {
          setNoSetsWarningOpen(false);
          setFeelingOpen(true);
        }}
        onCancel={() => setNoSetsWarningOpen(false)}
      >
        tu n'as validé aucune série. si tu termines maintenant, aucun exercice ne sera enregistré dans ton historique.
      </Modal>

      {/* Bouton "Terminer la séance" sticky en bas — CTA principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-4) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(to top, var(--color-bg) 60%, rgba(255,255,255,0) 100%)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 'var(--z-nav)' as React.CSSProperties['zIndex'],
        }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Garde : au moins une série validée quelque part ?
            const hasAnySets = Object.values(state?.exercises ?? {}).some(ex =>
              ex.sets.some(s => s.completed)
            );
            if (!hasAnySets) {
              setNoSetsWarningOpen(true);
            } else {
              setFeelingOpen(true);
            }
          }}
          style={{
            width: '100%',
            padding: 'var(--space-4) var(--space-5)',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: 'white',
            fontSize: 'var(--text-base)',
            fontWeight: 800,
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4), 0 8px 10px -6px rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span>Terminer la séance</span>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              backgroundColor: 'white',
              color: '#059669',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}
          >
            ✓
          </motion.div>
        </motion.button>
      </motion.div>
    </div>
  );
}
