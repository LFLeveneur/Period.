// Layout protégé — requiert auth + onboarding complété
// Inclut la navigation du bas et le padding pour la BottomNav
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { PageTransition } from '@/components/layout/PageTransition';

export function AppLayout() {
  const { user, profile, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (profile?.cycle_tracking === null) {
        // Redirige vers /onboarding que si l'utilisatrice n'a pas encore répondu à la question du cycle
        navigate('/onboarding', { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  // Affiche rien pendant le chargement ou tant que le profil n'a pas répondu à la question du cycle
  if (loading || !user || !profile || profile.cycle_tracking === null) return null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-bg)',
    }}>
      {/* Padding bas pour ne pas être masqué par la BottomNav (64px + safe area) */}
      <main style={{
        flex: 1,
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + var(--space-4))',
      }}>
        <PageTransition type="fade" />
      </main>
      <BottomNav />
    </div>
  );
}
