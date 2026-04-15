// Page récap de fin de séance — affiche les victoires, le détail et le message énergie × performance
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  getSessionHistoryDetail,
  getLatestSessionHistoryBySessionId,
} from '@/services/sessionHistoryService';
import { buildAfterPayload, sendToCoach } from '@/services/aiCoachService';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCycleDay } from '@/hooks/useCycleDay';
import { useToast } from '@/hooks/useToast';
import { CyclePhaseBadge } from '@/components/ui/CyclePhaseBadge';
import { VictoryCard } from '@/components/session/VictoryCard';
import { RecapExerciseCard } from '@/components/session/RecapExerciseCard';
import { AICoachCard } from '@/components/AICoachCard';
import { FEELING_LABELS, RECAP_MESSAGES } from '@/constants/session';
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import { trackEvent } from '@/services/analyticsService';
import type { SessionHistoryDetail } from '@/types/workout';
import type { CyclePhaseDisplay } from '@/types/cycle';
import type { AICoachState, AfterSessionAnalysis } from '@/types/aiCoach';

/** Convertit CyclePhase (DB) en CyclePhaseDisplay (UI) */
function toDisplayPhase(phase: string | null): CyclePhaseDisplay | null {
  if (!phase) return null;
  if (phase === 'luteal') return 'luteal_early';
  return phase as CyclePhaseDisplay;
}

export function SessionRecapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useAuthContext();
  const { cycleDay, cycleLength } = useCycleDay();

  const [detail, setDetail] = useState<SessionHistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachState, setCoachState] = useState<AICoachState>('idle');
  const [coachSummary, setCoachSummary] = useState<string>();
  const [coachDetail, setCoachDetail] = useState<AfterSessionAnalysis>();

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);

      // Récupère le sessionHistoryId depuis location.state (EC-27)
      const sessionHistoryId = (location.state as { sessionHistoryId?: string } | null)
        ?.sessionHistoryId;

      let historyId: string | null = sessionHistoryId ?? null;

      // EC-27 : pas de state → cherche depuis Supabase
      if (!historyId) {
        const { data: foundId, error: findError } = await getLatestSessionHistoryBySessionId(id!);
        if (findError || !foundId) {
          showToast("cette séance n'a pas encore été complétée.", 'info');
          navigate('/home', { replace: true });
          return;
        }
        historyId = foundId;
      }

      const { data, error } = await getSessionHistoryDetail(historyId);
      if (error || !data) {
        showToast("impossible de charger le récap.", 'error');
        navigate('/home', { replace: true });
        return;
      }

      setDetail(data);
      setLoading(false);
      // Track la séance loggée avec la phase du cycle en metadata
      trackEvent('session_logged', {
        phase: data.cycle_phase ?? null,
        duration_minutes: data.duration_minutes ?? null,
        feeling: data.feeling ?? null,
      });
    }

    load();
  }, [id, location.state, navigate, showToast]);

  // Coach IA — appeler après la séance
  useEffect(() => {
    if (!detail || !user || !user.profile || !cycleDay || !cycleLength) return;

    async function loadCoach() {
      setCoachState('loading');

      const payload = buildAfterPayload(
        user.profile!,
        detail.cycle_phase,
        detail.cycle_day ?? cycleDay.cycleDay,
        cycleLength,
        detail
      );

      const result = await sendToCoach(payload, user.id, detail.session_id, detail.id);

      if (result.data) {
        setCoachSummary(result.data.summary);
        setCoachDetail(result.data.detail);
        setCoachState('ready');
      } else {
        setCoachState('idle');
      }
    }

    loadCoach();
  }, [detail, user, cycleDay, cycleLength]);

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--color-bg)',
          minHeight: '100vh',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-border)',
            margin: 'var(--space-8) auto 0',
          }}
        />
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              height: '96px',
              backgroundColor: 'var(--color-border)',
              borderRadius: 'var(--radius-2xl)',
            }}
          />
        ))}
      </div>
    );
  }

  if (!detail) return null;

  const displayPhase = toDisplayPhase(detail.cycle_phase);
  const phaseConfig = displayPhase ? PHASE_DISPLAY_CONFIG[displayPhase] : null;
  const feelingLabel = detail.feeling ? FEELING_LABELS[detail.feeling] : null;
  const recapKey = `${detail.feeling ?? 'solid'}_${detail.performance_level}`;
  const recapMessage = RECAP_MESSAGES[recapKey] ?? RECAP_MESSAGES[`solid_${detail.performance_level}`] ?? '';

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        minHeight: '100vh',
        padding: 'var(--space-6) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        paddingBottom: 'calc(var(--space-4) + 100px)',
      }}
    >
      {/* Icône de complétion + titre */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-4)',
          paddingTop: 'var(--space-4)',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          🖤
        </div>
        <div>
          <h1
            style={{
              margin: '0 0 var(--space-1)',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}
          >
            récap 🏆
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-muted)',
            }}
          >
            {detail.session_name}
          </p>
        </div>
      </div>

      {/* Grille de stats */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Ligne 1 : durée · phase · ressenti */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
            gap: 'var(--space-3)',
            alignItems: 'center',
          }}
        >
          {/* Durée */}
          {detail.duration_minutes && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: '20px' }}>⏱️</span>
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Durée
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-text)',
                  }}
                >
                  {detail.duration_minutes}
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'normal' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text-muted)',
                      marginLeft: '2px',
                    }}
                  >
                    min
                  </span>
                </span>
              </div>
              <div style={{ width: '1px', height: '48px', backgroundColor: 'var(--color-border)' }} />
            </>
          )}

          {/* Phase */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: '20px' }}>🌙</span>
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Phase
            </span>
            {displayPhase ? (
              <CyclePhaseBadge phase={displayPhase} />
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                —
              </span>
            )}
          </div>

          {/* Ressenti */}
          {feelingLabel && (
            <>
              <div style={{ width: '1px', height: '48px', backgroundColor: 'var(--color-border)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: '20px' }}>💪</span>
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Ressenti
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                    color: phaseConfig ? phaseConfig.cardTextColor : 'var(--color-text)',
                    backgroundColor: phaseConfig ? phaseConfig.colorLight : 'var(--color-bg)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px var(--space-2)',
                  }}
                >
                  {feelingLabel}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Ligne 2 : volume total soulevé */}
        {detail.total_volume !== null && detail.total_volume > 0 && (
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span style={{ fontSize: '16px' }}>🏋️</span>
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              volume total
            </span>
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
              }}
            >
              {detail.total_volume.toLocaleString('fr-FR')}
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'normal' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text-muted)',
                  marginLeft: '2px',
                }}
              >
                kg
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Message énergie × performance */}
      {recapMessage && (
        <div
          style={{
            backgroundColor: 'var(--color-bg-dark)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-5)',
            display: 'flex',
            gap: 'var(--space-4)',
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: '28px', flexShrink: 0 }}>🤩</span>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-light)',
              lineHeight: '1.6',
              fontStyle: 'italic',
            }}
          >
            {recapMessage}
          </p>
        </div>
      )}

      {/* Coach IA — analyse après séance */}
      {user?.profile?.cycle_tracking && (
        <AICoachCard type="after_session" state={coachState} summary={coachSummary} detail={coachDetail} />
      )}

      {/* Victoires */}
      {detail.victories.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 var(--space-1)' }}>
            <span style={{ fontSize: '18px' }}>🏆</span>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
              }}
            >
              tes victoires
            </h2>
          </div>
          {detail.victories.map((v, idx) => (
            <VictoryCard key={idx} victory={v} />
          ))}
        </section>
      )}

      {/* Détail exercices */}
      {detail.exercises.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 var(--space-1)' }}>
            <span style={{ fontSize: '18px' }}>🏋️</span>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
              }}
            >
              le détail
            </h2>
          </div>
          {detail.exercises.map(ex => (
            <RecapExerciseCard key={ex.id} exerciseHistory={ex} />
          ))}
        </section>
      )}

      {/* CTA retour accueil — fixé en bas */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-4) var(--space-4) var(--space-6)',
          background: 'linear-gradient(to top, var(--color-bg) 70%, transparent)',
        }}
      >
        <button
          onClick={() => navigate('/home', { replace: true })}
          style={{
            width: '100%',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-2xl)',
            backgroundColor: 'var(--color-bg-dark)',
            border: 'none',
            color: 'var(--color-text-light)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-xl)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          retour à l'accueil
        </button>
      </div>
    </div>
  );
}
