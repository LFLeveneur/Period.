// Système de toast global — fournit le contexte et affiche les toasts
import { createContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

/** Type d'un toast affiché */
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

/** Valeur exposée par le contexte toast */
export interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/** Couleurs de fond selon le type de toast */
const TOAST_BG: Record<ToastMessage['type'], string> = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  info: 'var(--color-bg-dark)',
};

interface ToastProviderProps {
  children: ReactNode;
}

/** Provider à placer à la racine de l'app — wrappé autour de tout */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'info') => {
      const id = Math.random().toString(36).slice(2);

      setToasts(prev => [...prev, { id, message, type }]);

      // Disparaît automatiquement après 3 secondes
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Conteneur positionné au-dessus de la BottomNav */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(64px + env(safe-area-inset-bottom) + var(--space-4))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 'var(--z-toast)' as React.CSSProperties['zIndex'],
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          width: 'calc(100% - var(--space-8))',
          maxWidth: '400px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              backgroundColor: TOAST_BG[toast.type],
              color: 'var(--color-text-light)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-family)',
              fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideUp var(--duration-slow) ease both',
              pointerEvents: 'auto',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
