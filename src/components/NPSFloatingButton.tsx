// Bouton flottant NPS — affiche un cœur flottant en bas à droite
// Affiche le bouton uniquement si l'utilisatrice n'a pas encore soumis de note NPS
import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { hasUserSubmittedNPS } from '@/services/analyticsService';
import { NPSModal } from './NPSModal';

export function NPSFloatingButton() {
  const { user } = useAuthContext();
  const [showButton, setShowButton] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifie dans Supabase si l'utilisatrice a déjà soumis une note NPS
    async function checkNPS() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const hasSubmitted = await hasUserSubmittedNPS(user.id);
      setShowButton(!hasSubmitted);
      setLoading(false);
    }

    checkNPS();
  }, [user?.id]);

  const handleNPSClose = () => {
    setShowModal(false);
    // Fermeture sans soumission — le bouton reste visible
  };

  const handleNPSSuccess = () => {
    // Appelé UNIQUEMENT après soumission réussie
    // Cache le bouton (la donnée est maintenant en base Supabase)
    setShowButton(false);
  };

  // Attend le chargement avant de rendre
  if (loading) return null;
  if (!showButton) return null;

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setShowModal(true)}
        aria-label="donner un avis NPS"
        style={{
          position: 'fixed',
          bottom: 'calc(80px + var(--space-4) + env(safe-area-inset-bottom))',
          right: 'var(--space-4)',
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-primary)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'],
          transition: 'transform var(--duration-normal), box-shadow var(--duration-normal)',
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget;
          btn.style.transform = 'scale(1.1)';
          btn.style.boxShadow = 'var(--shadow-xl)';
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget;
          btn.style.transform = 'scale(1)';
          btn.style.boxShadow = 'var(--shadow-lg)';
        }}
      >
        <Heart size={24} fill="white" color="white" />
      </button>

      {/* Modal NPS */}
      {showModal && <NPSModal onClose={handleNPSClose} onSuccess={handleNPSSuccess} />}
    </>
  );
}
