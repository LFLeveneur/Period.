// Bottom sheet avec les informations biologiques de la phase courante
import { useEffect } from 'react';
import type { CycleDay } from '@/types/cycle';
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface PhaseInfoSheetProps {
  /** Contrôle l'ouverture du bottom sheet */
  isOpen: boolean;
  /** Données du cycle courant — null si suivi inactif */
  cycleDay: CycleDay | null;
  /** Callback pour fermer le sheet */
  onClose: () => void;
}

export function PhaseInfoSheet({ isOpen, cycleDay, onClose }: PhaseInfoSheetProps) {
  // Fermeture via la touche Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloque le scroll du body quand le sheet est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const config = cycleDay ? PHASE_DISPLAY_CONFIG[cycleDay.phase] : null;

  return (
    <>
      {/* Overlay semi-transparent */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(47, 0, 87, 0.4)',
          zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: 'var(--space-6) var(--space-4) calc(var(--space-8) + env(safe-area-inset-bottom))',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideUp var(--duration-slow) ease both',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {config && cycleDay ? (
          <>
            {/* En-tête phase */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--text-2xl)' }} aria-hidden="true">
                {config.emoji}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {config.label}
              </h2>
            </div>

            {/* Séparateur */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

            {/* Texte biologique */}
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                lineHeight: 'var(--leading-relaxed)',
                fontFamily: 'var(--font-family)',
                whiteSpace: 'pre-line',
              }}
            >
              {config.popupText}
            </p>

            {/* Séparateur */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
          </>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-family)',
            }}
          >
            ajoute au moins deux dates de règles pour voir ta prédiction de phase.
          </p>
        )}

        {/* Bouton fermer */}
        <PrimaryButton variant="secondary" onClick={onClose}>
          fermer
        </PrimaryButton>
      </div>
    </>
  );
}
