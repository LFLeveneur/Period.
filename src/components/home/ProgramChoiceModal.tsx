// Modal de choix entre importer ou créer un programme
import type { ReactNode } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface ProgramChoiceModalProps {
  /** Contrôle l'affichage du modal */
  isOpen: boolean;
  /** Callback au tap "Importer un programme" */
  onImport: () => void;
  /** Callback au tap "Créer manuellement" */
  onCreate: () => void;
  /** Callback pour fermer le modal */
  onClose: () => void;
}

export function ProgramChoiceModal({
  isOpen,
  onImport,
  onCreate,
  onClose,
}: ProgramChoiceModalProps) {
  if (!isOpen) return null;

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

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          maxWidth: 'calc(100vw - var(--space-8))',
          zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
          boxShadow: 'var(--shadow-xl)',
          animation: 'scaleUp var(--duration-slow) ease both',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Titre */}
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
          }}
        >
          créer mon programme
        </h2>

        {/* Descriptif */}
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--leading-relaxed)',
            fontFamily: 'var(--font-family)',
          }}
        >
          importe un programme depuis make ou crée-le manuellement
        </p>

        {/* Boutons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <PrimaryButton onClick={onImport}>
            importer un programme
          </PrimaryButton>
          <PrimaryButton variant="secondary" onClick={onCreate}>
            créer manuellement
          </PrimaryButton>
        </div>

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="tappable"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            padding: 'var(--space-2)',
          }}
        >
          annuler
        </button>
      </div>
    </>
  );
}
