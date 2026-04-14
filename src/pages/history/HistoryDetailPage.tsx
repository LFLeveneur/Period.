// Page détail d'une séance historique — /history/:id
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getHistoryDetail } from '@/services/sessionHistoryService';
import { CyclePhaseBadge } from '@/components/ui/CyclePhaseBadge';
import { VictoryCard } from '@/components/session/VictoryCard';
import { RecapExerciseCard } from '@/components/session/RecapExerciseCard';
import { FEELING_LABELS, RECAP_MESSAGES } from '@/constants/session';
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import type { SessionHistoryDetail } from '@/types/workout';
import type { CyclePhaseDisplay } from '@/types/cycle';

/** Convertit CyclePhase (DB) en CyclePhaseDisplay (UI) */
function toDisplayPhase(phase: string | null): CyclePhaseDisplay | null {
  if (!phase) return null;
  if (phase === 'luteal') return 'luteal_early';
  return phase as CyclePhaseDisplay;
}

/** Formate une date ISO en "lundi 7 avril 2025 · 18h30" */
function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  const dayPart = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${dayPart} · ${h}h${m}`;
}

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  const [detail, setDetail] = useState<SessionHistoryDetail | null>(null);
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
      setLoading(false);
    }

    load();
  }, [id, user, showToast]);

  // ── Skeleton ──────────────────────────────────────────────────────────────────
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: 24, height: 24, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
          <div style={{ width: 180, height: 28, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }} />
        </div>
        <div style={{ height: 40, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', width: '70%' }} />
        <div style={{ height: 100, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-2xl)' }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 120, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-xl)' }} />
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
        gap: 'var(--space-5)',
        paddingBottom: 'calc(var(--space-4) + 80px)',
      }}
    >
      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
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
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}
          >
            {detail.session_name}
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              marginTop: '2px',
              textTransform: 'capitalize',
            }}
          >
            {formatSessionDate(detail.completed_at)}
          </p>
        </div>
      </div>

      {/* ── Grille de stats ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
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
          {detail.duration_minutes ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: '20px' }}>⏱️</span>
                <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Durée
                </span>
                <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
                  {detail.duration_minutes}
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', marginLeft: '2px' }}>min</span>
                </span>
              </div>
              <div style={{ width: '1px', height: '48px', backgroundColor: 'var(--color-border)' }} />
            </>
          ) : (
            <>
              <div />
              <div />
            </>
          )}

          {/* Phase */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: '20px' }}>🌙</span>
            <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Phase
            </span>
            {displayPhase ? (
              <CyclePhaseBadge phase={displayPhase} />
            ) : (
              <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>—</span>
            )}
          </div>

          {/* Ressenti */}
          {feelingLabel ? (
            <>
              <div style={{ width: '1px', height: '48px', backgroundColor: 'var(--color-border)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: '20px' }}>💪</span>
                <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
          ) : (
            <>
              <div />
              <div />
            </>
          )}
        </div>

        {/* Ligne 2 : volume total */}
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
            <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              volume total
            </span>
            <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
              {detail.total_volume.toLocaleString('fr-FR')}
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', marginLeft: '2px' }}>kg</span>
            </span>
          </div>
        )}

        {/* Ligne 3 : jour du cycle */}
        {detail.cycle_day && (
          <div
            style={{
              borderTop: detail.total_volume && detail.total_volume > 0 ? 'none' : '1px solid var(--color-border)',
              paddingTop: detail.total_volume && detail.total_volume > 0 ? 0 : 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              jour J{detail.cycle_day} du cycle
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Message énergie × performance ───────────────────────────────────── */}
      {recapMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
        </motion.div>
      )}

      {/* ── Victoires ───────────────────────────────────────────────────────── */}
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

      {/* ── Exercices ───────────────────────────────────────────────────────── */}
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
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                marginLeft: 'auto',
              }}
            >
              {detail.exercises.length} exercice{detail.exercises.length > 1 ? 's' : ''}
            </span>
          </div>
          {detail.exercises.map(ex => (
            <RecapExerciseCard key={ex.id} exerciseHistory={ex} />
          ))}
        </section>
      )}

      {/* ── État vide ───────────────────────────────────────────────────────── */}
      {detail.exercises.length === 0 && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '32px' }}>📭</span>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
            }}
          >
            aucun exercice enregistré pour cette séance.
          </p>
        </div>
      )}
    </div>
  );
}
