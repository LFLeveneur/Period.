// Modal de feedback qualitatif — deux questions ouvertes
import { useState } from 'react';
import { X } from 'lucide-react';
import { submitFeedback } from '@/services/analyticsService';
import { useToast } from '@/hooks/useToast';

interface FeedbackModalProps {
  /** Callback appelé à la fermeture de la modal (succès ou annulation) */
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { showToast } = useToast();
  const [liked, setLiked] = useState('');
  const [frustrated, setFrustrated] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = liked.trim().length > 0 || frustrated.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);

    const { error } = await submitFeedback({ liked, frustrated });
    setLoading(false);

    if (error) {
      showToast("impossible d'envoyer le feedback, réessaie.", 'error');
      return;
    }

    showToast('merci pour ton retour 🖤', 'success');
    onClose();
  }

  return (
    // Overlay
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feedback"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(47, 0, 87, 0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
      }}
    >
      {/* Feuille de fond */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
          padding: 'var(--space-6) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* En-tête */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
              }}
            >
              ton avis compte 🖤
            </h2>
            <p
              style={{
                margin: 'var(--space-1) 0 0',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              ça nous aide à améliorer period. pour toi.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="fermer"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Question 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label
            htmlFor="feedback-liked"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
            }}
          >
            qu'est-ce que tu as aimé ?
          </label>
          <textarea
            id="feedback-liked"
            value={liked}
            onChange={(e) => setLiked(e.target.value)}
            placeholder="les recommandations par phase, la roue du cycle..."
            rows={3}
            maxLength={500}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text)',
              resize: 'none',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--leading-relaxed)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Question 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label
            htmlFor="feedback-frustrated"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
            }}
          >
            qu'est-ce qui t'a frustrée ?
          </label>
          <textarea
            id="feedback-frustrated"
            value={frustrated}
            onChange={(e) => setFrustrated(e.target.value)}
            placeholder="la navigation, les données manquantes..."
            rows={3}
            maxLength={500}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text)',
              resize: 'none',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--leading-relaxed)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Bouton envoi */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: canSubmit && !loading ? 'var(--color-text)' : 'var(--color-border)',
            border: 'none',
            color: 'var(--color-text-light)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            fontFamily: 'var(--font-family)',
            cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
            opacity: canSubmit && !loading ? 1 : 0.6,
            transition: 'opacity var(--duration-normal), background-color var(--duration-normal)',
          }}
        >
          {loading ? 'envoi en cours...' : 'envoyer mon retour'}
        </button>
      </div>
    </div>
  );
}
