// Page détail d'une séance historique — /history/:id (lecture seule + comparaison même phase)
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getHistoryDetail, getPreviousPhaseHistory } from '@/services/sessionHistoryService';
import { CyclePhaseBadge } from '@/components/ui/CyclePhaseBadge';
import { VictoryCard } from '@/components/session/VictoryCard';
import { RecapExerciseCard } from '@/components/session/RecapExerciseCard';
import { PreviousPhaseCard } from '@/components/history/PreviousPhaseCard';
import { FEELING_LABELS, RECAP_MESSAGES } from '@/constants/session';
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import type { SessionHistoryDetail, ExerciseHistoryEntry } from '@/types/workout';
import type { CyclePhaseDisplay } from '@/types/cycle';

/** Convertit CyclePhase (DB) en CyclePhaseDisplay (UI) */
function toDisplayPhase(phase: string | null): CyclePhaseDisplay | null {
  if (!phase) return null;
  if (phase === 'luteal') return 'luteal_early';
  return phase as CyclePhaseDisplay;
}

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  const [detail, setDetail] = useState<SessionHistoryDetail | null>(null);
  const [previousPhaseHistories, setPreviousPhaseHistories] = useState<
    Record<string, ExerciseHistoryEntry | null>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    async function load() {
      setLoading(true);

      const { data, error } = await getHistoryDetail(user!.id, id!);
      if (error || !data) {
        showToast('impossible de charger cette séance.', 'error');
        setLoading(false);
        return;
      }

      setDetail(data);

      // Charge les comparaisons de phase pour chaque exercice
      const displayPhase = toDisplayPhase(data.cycle_phase);
      if (displayPhase) {
        const comparisons: Record<string, ExerciseHistoryEntry | null> = {};
        await Promise.all(
          data.exercises.map(async ex => {
            const key = ex.exercise_catalog_id ?? ex.user_custom_exercise_id ?? ex.id;
            const { data: prev } = await getPreviousPhaseHistory(
              user!.id,
              ex.exercise_catalog_id,
              ex.user_custom_exercise_id,
              displayPhase
            );
            comparisons[key] = prev;
          })
        );
        setPreviousPhaseHistories(comparisons);
      }

      setLoading(false);
    }

    load();
  }, [id, user, showToast]);

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
        <div style={{ width: 120, height: 32, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }} />
        <div style={{ height: 80, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-lg)' }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 96, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-lg)' }} />
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
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        paddingBottom: 'calc(var(--space-4) + 80px)',
      }}
    >
      {/* En-tête avec bouton retour */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'var(--text-xl)',
            color: 'var(--color-text)',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
          }}
        >
          séance passée
        </h1>
      </div>

      {/* Bloc résumé */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
          {detail.duration_minutes && (
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-1) var(--space-2)',
              }}
            >
              {detail.duration_minutes} min
            </span>
          )}
          {displayPhase && <CyclePhaseBadge phase={displayPhase} />}
          {feelingLabel && (
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-sm)',
                color: phaseConfig ? phaseConfig.cardTextColor : 'var(--color-text)',
                backgroundColor: phaseConfig ? phaseConfig.colorLight : 'var(--color-surface)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-1) var(--space-2)',
              }}
            >
              {feelingLabel}
            </span>
          )}
        </div>
      </div>

      {/* Message énergie × performance */}
      {recapMessage && (
        <blockquote
          style={{
            margin: 0,
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-bg-dark)',
            borderRadius: 'var(--radius-lg)',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-light)',
            lineHeight: 'var(--leading-relaxed)',
            fontStyle: 'italic',
          }}
        >
          {recapMessage}
        </blockquote>
      )}

      {/* Victoires */}
      {detail.victories.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
            }}
          >
            tes victoires 🏆
          </h2>
          {detail.victories.map((v, idx) => (
            <VictoryCard key={idx} victory={v} />
          ))}
        </section>
      )}

      {/* Détail par exercice */}
      {detail.exercises.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
            }}
          >
            le détail
          </h2>
          {detail.exercises.map(ex => (
            <RecapExerciseCard key={ex.id} exerciseHistory={ex} />
          ))}
        </section>
      )}

      {/* Comparaison même phase — uniquement dans /history/:id */}
      {displayPhase && detail.exercises.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
            }}
          >
            même phase, cycle précédent
          </h2>
          {detail.exercises.map(ex => {
            const key = ex.exercise_catalog_id ?? ex.user_custom_exercise_id ?? ex.id;
            const prev = previousPhaseHistories[key];
            if (!prev) {
              return (
                <p
                  key={ex.id}
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {ex.exercise_name} — pas encore de données pour cette phase.
                </p>
              );
            }
            return <PreviousPhaseCard key={ex.id} current={ex} previous={prev} />;
          })}
        </section>
      )}
    </div>
  );
}
