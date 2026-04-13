// Layout pour les pages publiques (landing, login, signup, reset)
// Redirige si l'utilisatrice est déjà connectée
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/layout/PageTransition';

export function PublicLayout() {
  const { user, profile, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Redirige selon l'état d'onboarding
      if (profile?.onboarding_completed) {
        navigate('/home', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  // Affiche rien pendant le chargement pour éviter un flash
  if (loading) return null;
  if (user) return null;

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageTransition type="fade" />
    </div>
  );
}
