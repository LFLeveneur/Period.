// Modal NPS — collecte un score 1-10 sur la satisfaction de l'app
import { useState } from 'react';
import { X, Heart } from 'lucide-react';
import { submitNPS } from '@/services/analyticsService';
import { useToast } from '@/hooks/useToast';

interface NPSModalProps {
  /** Callback appelé à la fermeture (succès ou annulation) */
  onClose: () => void;
  /** Callback appelé UNIQUEMENT après soumission réussie */
  onSuccess: () => void;
}

export function NPSModal({ onClose, onSuccess }: NPSModalProps) {
  const { showToast } = useToast();
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (score === null || loading) return;
    setLoading(true);

    const { error } = await submitNPS(score);
    setLoading(false);

    if (error) {
      showToast("impossible d'envoyer l'avis, réessaie.", 'error');
      return;
    }

    showToast('merci pour ton avis 🖤', 'success');
    onSuccess(); // ← Callback appelé UNIQUEMENT après soumission réussie
    onClose();
  }

  return (
    // Overlay
    <div
      role="dialog"
      aria-modal="true"
      aria-label="NPS"
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
          gap: 'var(--space-6)',
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
              ça te plaît ? 🖤
            </h2>
            <p
              style={{
                margin: 'var(--space-1) 0 0',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              ta note nous aide à améliorer period.
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

        {/* Échelle 1-10 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
            }}
          >
            note de 1 à 10
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 'var(--space-2)',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                style={{
                  height: '48px',
                  borderRadius: 'var(--radius-lg)',
                  border: score === n ? 'none' : '1px solid var(--color-border)',
                  backgroundColor: score === n ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: score === n ? 'white' : 'var(--color-text)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                  cursor: 'pointer',
                  transition: 'all var(--duration-normal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Message selon le score sélectionné */}
        {score !== null && (
          <p
            style={{
              textAlign: 'center',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              marginTop: 'var(--space-2)',
            }}
          >
            {score <= 6 && "merci, ça nous aide à nous améliorer 🙏"}
            {score > 6 && score < 9 && "super, on est sur la bonne voie 💪"}
            {score >= 9 && "wow, tu nous fais trop plaisir ! 🎉"}
          </p>
        )}

        {/* Bouton envoi */}
        <button
          onClick={handleSubmit}
          disabled={score === null || loading}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: score !== null && !loading ? 'var(--color-text)' : 'var(--color-border)',
            border: 'none',
            color: 'var(--color-text-light)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            fontFamily: 'var(--font-family)',
            cursor: score !== null && !loading ? 'pointer' : 'not-allowed',
            opacity: score !== null && !loading ? 1 : 0.6,
            transition: 'opacity var(--duration-normal), background-color var(--duration-normal)',
          }}
        >
          {loading ? 'envoi en cours...' : 'envoyer ma note'}
        </button>
      </div>
    </div>
  );
}
