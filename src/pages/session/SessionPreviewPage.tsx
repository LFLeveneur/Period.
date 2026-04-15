// Page aperçu d'une séance — charge les exercices et permet de démarrer
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getSessionById } from '@/services/programService';
import { getExerciseHistory, getSessionCompletionBySessionId } from '@/services/sessionHistoryService';
import { buildBeforePayload, sendToCoach, getCoachAdvice } from '@/services/aiCoachService';
import { useAuthContext } from '@/contexts/AuthContext';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { useCycleDay } from '@/hooks/useCycleDay';
import { PreviewExerciseCard } from '@/components/session/PreviewExerciseCard';
import { AICoachCard } from '@/components/AICoachCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { SessionWithExercises } from '@/services/programService';
import type { ExerciseHistoryEntry } from '@/types/workout';
import type { AICoachState, BeforeSessionAdvice } from '@/types/aiCoach';
import { CYCLE_ADVICE } from '@/constants/session';
import * as analytics from '@/lib/analytics';

export function SessionPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const { startSession } = useActiveSession();
  const { cycleDay } = useCycleDay();

  const [session, setSession] = useState<SessionWithExercises | null>(null);
  const [exerciseHistories, setExerciseHistories] = useState<Record<string, ExerciseHistoryEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [completionWarning, setCompletionWarning] = useState<{ completedAt: string; confirmed?: boolean } | null>(null);
  const [coachState, setCoachState] = useState<AICoachState>('idle');
  const [coachSummary, setCoachSummary] = useState<string>();
  const [coachDetail, setCoachDetail] = useState<BeforeSessionAdvice>();

  useEffect(() => {
    if (!id || !user) return;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: sessionData, error: sessionError } = await getSessionById(id!);

      if (sessionError || !sessionData) {
        setError('impossible de charger cette séance.');
        setLoading(false);
        return;
      }

      setSession(sessionData);

      // Charge l'historique pour chaque exercice en parallèle
      const histories: Record<string, ExerciseHistoryEntry[]> = {};
      await Promise.all(
        sessionData.exercises.map(async ex => {
          const { data } = await getExerciseHistory(
            user!.id,
            ex.sessionExercise.exercise_catalog_id,
            ex.sessionExercise.user_custom_exercise_id,
            20 // 20 entrées pour couvrir la même phase du cycle précédent (~4 semaines de séances)
          );
          histories[ex.sessionExercise.id] = data ?? [];
        })
      );

      setExerciseHistories(histories);

      // Vérifie si cette séance a déjà été complétée
      const { data: completionData } = await getSessionCompletionBySessionId(user!.id, sessionData.session.id);
      if (completionData) {
        setCompletionWarning({ completedAt: completionData.completed_at });
      }

      setLoading(false);

      // Track la vue de la preview après chargement réussi
      analytics.track('session_previewed', {
        session_id: id,
        exercises_count: sessionData.exercises.length,
      });
    }

    load();
  }, [id, user]);

  // Coach IA — vérifie le cache d'abord, appelle le webhook seulement si pas encore analysé
  useEffect(() => {
    if (!session || !user || !cycleDay || !profile || Object.keys(exerciseHistories).length === 0) return;

    async function loadCoach() {
      if (!session || !user || !cycleDay || !profile) return;

      // 1. Vérifier si un conseil existe déjà pour cette séance
      const { data: cached } = await getCoachAdvice(user.id, 'before_session', session.session.id, null);

      if (cached) {
        // Résultat déjà en base — affichage instantané, pas de loading
        setCoachSummary(cached.summary);
        setCoachDetail(cached.detail as BeforeSessionAdvice);
        setCoachState('ready');
        return;
      }

      // 2. Pas encore analysé — appel webhook
      setCoachState('loading');

      // Convertir CyclePhaseDisplay → CyclePhase pour le payload
      const dbPhase = cycleDay.phase === 'luteal_early' || cycleDay.phase === 'luteal_late' ? 'luteal' : cycleDay.phase;

      const payload = buildBeforePayload(
        profile,
        dbPhase,
        cycleDay.cycleDay,
        cycleDay.cycleLength,
        cycleDay.periodLength,
        session,
        exerciseHistories
      );

      const result = await sendToCoach(payload, user.id, session.session.id, null);

      if (result.data) {
        setCoachSummary(result.data.summary);
        setCoachDetail(result.data.detail as BeforeSessionAdvice);
        setCoachState('ready');
      } else {
        setCoachState('idle');
      }
    }

    loadCoach();
  }, [session, user, cycleDay, exerciseHistories, profile]);

  const handleStart = () => {
    if (!session) return;
    // Si une complétion existe et pas encore confirmée, ne rien faire (la modal s'affichera)
    if (completionWarning && !completionWarning.confirmed) {
      return;
    }
    performStartSession();
  };

  const performStartSession = () => {
    if (!session) return;
    setStarting(true);
    startSession(session, cycleDay?.phase ?? null, cycleDay?.cycleDay ?? null);
    analytics.track('session_started', {
      session_id: session.session.id,
      current_phase: cycleDay?.phase ?? null,
      cycle_day: cycleDay?.cycleDay ?? null,
    });
    navigate(`/session/${session.session.id}/active`, { replace: false });
  };

  const handleConfirmRestart = () => {
    setCompletionWarning(prev => prev ? { ...prev, confirmed: true } : null);
    performStartSession();
  };

  // Conseil de phase pour la preview
  const phaseAdvice = cycleDay ? CYCLE_ADVICE[cycleDay.phase]?.upcoming : null;

  // ─── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          background: 'var(--color-bg)',
          minHeight: '100vh',
          padding: 'calc(var(--space-6) + env(safe-area-inset-top, 0px)) var(--space-4) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'var(--color-border)',
              borderRadius: '50%',
            }}
          />
          <div style={{ flex: 1 }}>
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.2, ease: 'easeInOut' }}
              style={{
                width: '60px',
                height: '16px',
                backgroundColor: 'var(--color-border)',
                borderRadius: '999px',
                marginBottom: '8px',
              }}
            />
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.3, ease: 'easeInOut' }}
              style={{
                width: '180px',
                height: '32px',
                backgroundColor: 'var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
        </div>
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4, ease: 'easeInOut' }}
          style={{
            height: '130px',
            background: 'linear-gradient(135deg, var(--color-surface) 0%, rgba(162, 107, 240, 0.05) 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(0,0,0,0.02)'
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 * i, ease: 'easeInOut' }}
              style={{
                height: '110px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: '24px',
                border: '1px solid rgba(0,0,0,0.02)'
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Erreur ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          background: 'var(--color-bg)',
          minHeight: '100vh',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          {error}
        </motion.p>
        <PrimaryButton variant="secondary" onClick={() => navigate(-1)}>
          retour
        </PrimaryButton>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        backgroundImage: 'radial-gradient(circle at top right, rgba(162, 107, 240, 0.12), transparent 400px)',
        minHeight: '100vh',
        paddingBottom: '160px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-6) var(--space-4)',
          paddingTop: 'calc(var(--space-6) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'var(--space-6)',
        }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: '50%',
            cursor: 'pointer',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-lg)',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            backdropFilter: 'blur(8px)',
          }}
        >
          ←
        </motion.button>
        <div style={{ flex: 1 }}>
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              backgroundColor: 'rgba(162, 107, 240, 0.1)',
              color: 'var(--color-primary)',
              borderRadius: '999px',
              fontSize: 'var(--text-xs)',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px'
            }}>
            {cycleDay?.phase ?? 'phase'}
          </motion.span>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 900,
              color: 'var(--color-text)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {session.session.name}
          </h1>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '20px',
            width: '64px',
            height: '64px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.02)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 900,
              color: 'var(--color-primary)',
              lineHeight: 1,
            }}
          >
            {session.exercises.length}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: '9px',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 700,
              marginTop: '4px'
            }}
          >
            exos
          </span>
        </motion.div>
      </motion.header>

      {/* Conseil de phase — Une seule fois, bien mis en avant */}
      {phaseAdvice && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            margin: '0 var(--space-4) var(--space-5)',
            background: 'linear-gradient(135deg, rgba(162, 107, 240, 0.15) 0%, rgba(197, 132, 238, 0.05) 100%)',
            border: '1px solid rgba(162, 107, 240, 0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '24px',
            padding: 'var(--space-4)',
            display: 'flex',
            gap: 'var(--space-4)',
            alignItems: 'flex-start',
            boxShadow: '0 8px 32px rgba(162, 107, 240, 0.08)',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              fontSize: '24px',
              flexShrink: 0,
              background: 'white',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(162, 107, 240, 0.15)'
            }}
          >
            ✨
          </motion.div>
          <div>
            <p
              style={{
                margin: '0 0 6px',
                fontFamily: 'var(--font-family)',
                fontSize: '11px',
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 800,
              }}
            >
              conseil de phase
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text)',
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              {phaseAdvice}
            </p>
          </div>
        </motion.div>
      )}

      {/* Coach IA — analyse avant séance — visible dès que le coach a quelque chose à montrer */}
      {coachState !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ padding: '0 var(--space-4)' }}
        >
          <AICoachCard type="before_session" state={coachState} summary={coachSummary} detail={coachDetail} />
        </motion.div>
      )}

      {/* Titre de section exercices */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          margin: '0 var(--space-4) var(--space-3)',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
        }}
      >
        le programme
      </motion.h2>

      {/* Liste des exercices */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          padding: '0 var(--space-4)',
        }}
      >
        <AnimatePresence>
          {session.exercises.map((ex, idx) => (
            <motion.div
              key={ex.sessionExercise.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + idx * 0.08 }}
            >
              <PreviewExerciseCard
                exerciseWithDetails={ex}
                history={exerciseHistories[ex.sessionExercise.id] ?? []}
                currentPhase={cycleDay?.phase ?? null}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Modal d'avertissement — séance déjà complétée */}
      <AnimatePresence>
        {completionWarning && !completionWarning.confirmed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompletionWarning(null)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(47, 0, 87, 0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 100,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: '20%',
                left: 'var(--space-4)',
                right: 'var(--space-4)',
                transform: 'translateY(-50%)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: '24px',
                padding: 'var(--space-6)',
                maxHeight: '80vh',
                overflowY: 'auto',
                zIndex: 101,
                boxShadow: '0 20px 60px rgba(47, 0, 87, 0.3)',
              }}
            >
              <h2
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 800,
                  color: 'var(--color-text)',
                  margin: '0 0 var(--space-3) 0',
                }}
              >
                ✨ Vous l'avez déjà faite !
              </h2>
              <p
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-text-muted)',
                  margin: '0 0 var(--space-6) 0',
                  lineHeight: 1.6,
                }}
              >
                Vous avez déjà complété cette séance le {format(new Date(completionWarning.completedAt), 'dd MMMM yyyy', { locale: fr })}.
                <br />
                Voulez-vous la relancer ?
              </p>

              {/* Boutons */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  flexDirection: 'column',
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmRestart}
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, #8a4bcf 100%)',
                    border: 'none',
                    color: 'white',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-family)',
                    cursor: 'pointer',
                  }}
                >
                  Oui, relancer
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCompletionWarning(null)}
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    borderRadius: '12px',
                    background: 'var(--color-bg)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-family)',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CTA commencer — fixé en bas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-4) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(to top, var(--color-bg) 60%, rgba(255,255,255,0) 100%)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 40,
        }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          disabled={starting}
          style={{
            width: '100%',
            padding: 'var(--space-4) var(--space-5)',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, #8a4bcf) 100%)',
            border: 'none',
            color: 'white',
            fontSize: 'var(--text-base)',
            fontWeight: 800,
            fontFamily: 'var(--font-family)',
            cursor: starting ? 'not-allowed' : 'pointer',
            opacity: starting ? 0.9 : 1,
            boxShadow: '0 10px 25px -5px rgba(162, 107, 240, 0.5), 0 8px 10px -6px rgba(162, 107, 240, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span>{starting ? 'démarrage...' : 'commencer la séance'}</span>
          <motion.div
            animate={{ x: starting ? 0 : [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}
          >
            ▶
          </motion.div>
        </motion.button>
      </motion.div>
    </div>
  );
}
