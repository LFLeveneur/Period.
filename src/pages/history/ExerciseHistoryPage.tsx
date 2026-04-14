// Page historique d'un exercice — toutes les performances avec phase du cycle
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useAuthContext } from '@/contexts/AuthContext';
import { CyclePhaseBadge } from '@/components/ui/CyclePhaseBadge';
import { getExerciseHistoryFull } from '@/services/sessionHistoryService';
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import type { ExerciseHistoryEntry, SetDetails } from '@/types/workout';
import type { CyclePhase, CyclePhaseDisplay } from '@/types/cycle';

/** Navigation state passé par les pages appelantes */
export interface ExerciseHistoryNavState {
  catalogId: string | null;
  customId: string | null;
  exerciseName: string;
}

/** Table de correspondance phase DB → phase UI */
function toDisplayPhase(phase: CyclePhase | null): CyclePhaseDisplay | null {
  if (!phase) return null;
  if (phase === 'luteal') return 'luteal_early';
  return phase as CyclePhaseDisplay;
}

/** Calcule le volume total d'une entrée (poids × reps, toutes séries) */
function computeVolume(sets: SetDetails[]): number {
  return sets.reduce((sum, s) => {
    return sum + (s.actual?.weight ?? 0) * (s.actual?.reps ?? 0);
  }, 0);
}

/** Formate une date ISO en "lundi 7 avr. 2025" */
function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}


/** Filtres de phase disponibles */
const PHASE_FILTERS: Array<{ key: CyclePhase | 'all'; label: string }> = [
  { key: 'all', label: 'Toutes' },
  { key: 'menstrual', label: 'Menstruation' },
  { key: 'follicular', label: 'Folliculaire' },
  { key: 'ovulation', label: 'Ovulation' },
  { key: 'luteal', label: 'Lutéale' },
];

/** Card d'une entrée d'historique */
function ExerciseEntryCard({ entry }: { entry: ExerciseHistoryEntry }) {
  const displayPhase = toDisplayPhase(entry.cycle_phase);
  const phaseConfig = displayPhase ? PHASE_DISPLAY_CONFIG[displayPhase] : null;
  const sets = entry.set_details ?? [];
  const volume = computeVolume(sets);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: phaseConfig ? `4px solid ${phaseConfig.color}` : '4px solid var(--color-border)',
      }}
    >
      {/* En-tête : date + phase + jour du cycle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              textTransform: 'capitalize',
            }}
          >
            {formatDate(entry.completed_at)}
          </span>
          {entry.cycle_day && (
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              jour J{entry.cycle_day}
            </span>
          )}
        </div>

        {/* Badge de phase + volume */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {displayPhase && <CyclePhaseBadge phase={displayPhase} />}
          {volume > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'bold',
                color: 'var(--color-text-muted)',
              }}
            >
              {volume.toLocaleString('fr-FR')} kg
            </span>
          )}
        </div>
      </div>

      {/* Détail des séries */}
      {sets.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          {sets.map((set, idx) => (
            <span
              key={idx}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text)',
              }}
            >
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                Série {set.set ?? idx + 1} :{' '}
              </span>
              {(() => {
                const a = set.actual;
                const parts: string[] = [];
                if (a.weight !== undefined && a.weight !== null) parts.push(`${a.weight} kg`);
                if (a.reps !== undefined && a.reps !== null) parts.push(`${a.reps} reps`);
                if (a.added_load !== undefined && a.added_load !== null) parts.push(`+${a.added_load} kg`);
                if (a.duration !== undefined && a.duration !== null) {
                  const m = Math.floor(a.duration / 60);
                  const s = a.duration % 60;
                  parts.push(m > 0 ? `${m}min${s > 0 ? ` ${s}s` : ''}` : `${s}s`);
                }
                if (a.distance !== undefined && a.distance !== null) parts.push(`${a.distance} km`);
                if (a.rir !== undefined && a.rir !== null) parts.push(`RIR ${a.rir}`);
                return parts.join(' · ') || '—';
              })()}
            </span>
          ))}
        </div>
      )}

      {/* Message si pas de données détaillées */}
      {sets.length === 0 && (
        <span
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
          }}
        >
          pas de données disponibles pour cette entrée
        </span>
      )}
    </motion.div>
  );
}

export function ExerciseHistoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // Données passées par navigation state
  const navState = (location.state ?? {}) as Partial<ExerciseHistoryNavState>;
  const { catalogId = null, customId = null, exerciseName: nameFromState = 'exercice' } = navState;

  const [entries, setEntries] = useState<ExerciseHistoryEntry[]>([]);
  const [exerciseName, setExerciseName] = useState<string>(nameFromState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<CyclePhase | 'all'>('all');

  // Charge l'historique complet de l'exercice
  useEffect(() => {
    if (!user || (!catalogId && !customId)) {
      setError("impossible de charger cet exercice.");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await getExerciseHistoryFull(user!.id, catalogId, customId);
      if (fetchError || !data) {
        setError("impossible de charger l'historique.");
        setLoading(false);
        return;
      }
      setExerciseName(data.exerciseName);
      setEntries(data.entries);
      setLoading(false);
    }

    load();
  }, [user, catalogId, customId]);

  // Filtre les entrées selon la phase sélectionnée
  const filteredEntries = useMemo(() => {
    if (activePhase === 'all') return entries;
    return entries.filter(e => e.cycle_phase === activePhase);
  }, [entries, activePhase]);

  // Stats globales calculées sur toutes les entrées (pas filtrées)
  const stats = useMemo(() => {
    if (entries.length === 0) return null;

    const totalSessions = entries.length;

    // Meilleur volume (session)
    let bestVolume = 0;
    for (const e of entries) {
      const v = computeVolume(e.set_details ?? []);
      if (v > bestVolume) bestVolume = v;
    }

    // Phase la plus active
    const phaseCounts: Partial<Record<CyclePhase, number>> = {};
    for (const e of entries) {
      if (e.cycle_phase) {
        phaseCounts[e.cycle_phase] = (phaseCounts[e.cycle_phase] ?? 0) + 1;
      }
    }
    const mostActivePhaseEntry = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0];
    const mostActivePhase = mostActivePhaseEntry
      ? toDisplayPhase(mostActivePhaseEntry[0] as CyclePhase)
      : null;

    // Phase config de la phase la plus active
    const mostActiveConfig = mostActivePhase ? PHASE_DISPLAY_CONFIG[mostActivePhase] : null;

    return { totalSessions, bestVolume, mostActivePhase, mostActiveConfig };
  }, [entries]);

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
        <div style={{ width: 200, height: 32, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }} />
        <div style={{ height: 80, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-xl)' }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 120, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
    );
  }

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
        <p style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-base)', color: 'var(--color-text-muted)' }}>
          {error}
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ← retour
        </button>
      </div>
    );
  }

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
            {exerciseName}
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              marginTop: '2px',
            }}
          >
            historique des performances
          </p>
        </div>
      </div>

      {/* Bloc stats globales */}
      {stats && (
        <div
          style={{
            backgroundColor: 'var(--color-bg-dark)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-4)',
            display: 'grid',
            gridTemplateColumns: stats.bestVolume > 0 ? '1fr 1px 1fr 1px 1fr' : '1fr 1px 1fr',
            gap: 'var(--space-2)',
            alignItems: 'center',
          }}
        >
          {/* Total séances */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'rgba(249, 237, 225, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              séances
            </span>
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-light)',
              }}
            >
              {stats.totalSessions}
            </span>
          </div>

          <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(249, 237, 225, 0.15)' }} />

          {/* Meilleur volume */}
          {stats.bestVolume > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-xs)',
                    color: 'rgba(249, 237, 225, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  meilleur vol.
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-text-light)',
                  }}
                >
                  {stats.bestVolume.toLocaleString('fr-FR')}
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'normal' as React.CSSProperties['fontWeight'],
                      marginLeft: '2px',
                      color: 'rgba(249, 237, 225, 0.6)',
                    }}
                  >
                    kg
                  </span>
                </span>
              </div>

              <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(249, 237, 225, 0.15)' }} />
            </>
          )}

          {/* Phase la plus active */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                color: 'rgba(249, 237, 225, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              phase principale
            </span>
            {stats.mostActivePhase ? (
              <CyclePhaseBadge phase={stats.mostActivePhase} />
            ) : (
              <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--text-sm)' }}>—</span>
            )}
          </div>
        </div>
      )}

      {/* Filtres par phase */}
      {entries.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
          }}
        >
          {PHASE_FILTERS.map(f => {
            const isActive = activePhase === f.key;
            // Compte les entrées pour ce filtre
            const count = f.key === 'all'
              ? entries.length
              : entries.filter(e => e.cycle_phase === f.key).length;
            if (f.key !== 'all' && count === 0) return null;

            // Couleur de phase pour le bouton actif
            const phaseDisplay = f.key !== 'all'
              ? toDisplayPhase(f.key as CyclePhase)
              : null;
            const phaseColor = phaseDisplay
              ? PHASE_DISPLAY_CONFIG[phaseDisplay].color
              : 'var(--color-primary)';

            return (
              <button
                key={f.key}
                onClick={() => setActivePhase(f.key)}
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: isActive ? 'bold' : 'normal',
                  color: isActive ? 'var(--color-surface)' : 'var(--color-text-muted)',
                  backgroundColor: isActive ? phaseColor : 'var(--color-surface)',
                  border: isActive ? `1.5px solid ${phaseColor}` : '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  padding: 'var(--space-1) var(--space-3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
                <span
                  style={{
                    marginLeft: '4px',
                    opacity: 0.7,
                    fontSize: '10px',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Liste des entrées */}
      {filteredEntries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredEntries.map((entry, idx) => (
            <ExerciseEntryCard key={entry.id ?? idx} entry={entry} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        /* Aucune entrée du tout */
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '32px' }}>🌱</span>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
              maxWidth: '280px',
            }}
          >
            on n'a pas encore de données pour cet exercice. complète une séance pour voir ta progression ici.
          </p>
        </div>
      ) : (
        /* Aucune entrée pour la phase filtrée */
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '32px' }}>🔍</span>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
              maxWidth: '280px',
            }}
          >
            aucune séance enregistrée pour cette phase. continue à pratiquer — les données viendront. 🖤
          </p>
        </div>
      )}
    </div>
  );
}
