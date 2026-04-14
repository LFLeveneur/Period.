// Drawer de détail d'une séance — ouvert depuis la page programme
import { useEffect } from 'react';
import type { SessionWithExercises } from '@/services/programService';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface SessionDetailDrawerProps {
  /** Contrôle l'ouverture du drawer */
  isOpen: boolean;
  /** Séance à afficher — null quand fermé */
  session: SessionWithExercises | null;
  /** Callback de fermeture */
  onClose: () => void;
  /** Démarre la séance → /session/:id/preview */
  onStart: () => void;
}

/** Labels des jours de la semaine */
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function SessionDetailDrawer({
  isOpen,
  session,
  onClose,
  onStart,
}: SessionDetailDrawerProps) {
  // Fermeture via Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloque le scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const { session: s, exercises } = session;
  const dayLabel =
    s.day_of_week !== null ? DAY_LABELS[s.day_of_week] : null;

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(47, 0, 87, 0.4)',
        zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'],
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* Drawer */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '85vh',
          marginBottom: '64px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: 'var(--space-6) var(--space-4)',
          overflowY: 'auto',
          animation: 'slideUp var(--duration-slow) ease both',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Indicateur */}
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
            margin: '0 auto',
          }}
        />

        {/* En-tête séance */}
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              fontFamily: 'var(--font-family)',
            }}
          >
            {s.name}
          </h2>
          {dayLabel && (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-family)',
              }}
            >
              {dayLabel}
            </p>
          )}
        </div>

        {/* Séparateur */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />

        {/* Liste des exercices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {exercises.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-family)',
              }}
            >
              aucun exercice dans cette séance.
            </p>
          ) : (
            exercises.map((ex, index) => {
              const exerciseName = ex.exercise
                ? ex.exercise.name
                : null;
              const sets = ex.sessionExercise.set_targets?.length ?? ex.sessionExercise.sets ?? 0;
              const reps = ex.sessionExercise.reps ?? '—';
              const weight = ex.sessionExercise.weight;

              return (
                <div
                  key={ex.sessionExercise.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-2) 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {/* Numéro d'ordre */}
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-family)',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>

                  {/* Nom et détails */}
                  <div style={{ flex: 1 }}>
                    {exerciseName ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 'var(--text-base)',
                          fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-family)',
                        }}
                      >
                        {exerciseName}
                      </p>
                    ) : (
                      // EC-15 : exercice supprimé
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <span style={{ fontSize: 'var(--text-sm)' }}>⚠️</span>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-family)',
                            fontStyle: 'italic',
                          }}
                        >
                          exercice inconnu
                        </p>
                      </div>
                    )}
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-family)',
                      }}
                    >
                      {sets} × {reps}
                      {weight ? ` · ${weight} kg` : ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Séparateur */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />

        {/* CTA commencer */}
        <PrimaryButton onClick={onStart}>
          commencer cette séance →
        </PrimaryButton>
      </div>
    </div>
  );
}
