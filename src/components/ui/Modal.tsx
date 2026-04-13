// Modal de confirmation réutilisable
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface ModalProps {
  /** Contrôle l'affichage de la modal */
  isOpen: boolean;
  /** Titre de la modal */
  title: string;
  /** Contenu du corps de la modal */
  children: ReactNode;
  /** Label du bouton de confirmation */
  confirmLabel: string;
  /** Label du bouton d'annulation — défaut : "annuler" */
  cancelLabel?: string;
  /** Callback appelé à la confirmation */
  onConfirm: () => void;
  /** Callback appelé à l'annulation ou au clic sur l'overlay */
  onCancel: () => void;
  /** Affiche un spinner sur le bouton de confirmation */
  isConfirmLoading?: boolean;
  /** Si true — bouton de confirmation en rouge (action destructive) */
  isDanger?: boolean;
}

export function Modal({
  isOpen,
  title,
  children,
  confirmLabel,
  cancelLabel = 'annuler',
  onConfirm,
  onCancel,
  isConfirmLoading = false,
  isDanger = false,
}: ModalProps) {
  // Fermeture via la touche Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Bloque le scroll du body quand la modal est ouverte
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

  return (
    // Overlay semi-transparent avec blur
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(47, 0, 87, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      {/* Card — stoppe la propagation du clic */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '340px',
          width: '100%',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideUp var(--duration-slow) ease both',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Titre */}
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {title}
        </h2>

        {/* Corps */}
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          {children}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <PrimaryButton
            onClick={onConfirm}
            loading={isConfirmLoading}
            style={
              isDanger
                ? { backgroundColor: 'var(--color-error)', color: 'var(--color-text-light)' }
                : undefined
            }
          >
            {confirmLabel}
          </PrimaryButton>

          <PrimaryButton variant="ghost" onClick={onCancel} disabled={isConfirmLoading}>
            {cancelLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
