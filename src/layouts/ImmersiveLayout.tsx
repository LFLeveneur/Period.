// Layout immersif — requiert auth + onboarding complété, sans navigation du bas
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/layout/PageTransition';

export function ImmersiveLayout() {
  const { user, profile, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (!profile?.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading || !user || !profile?.onboarding_completed) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <PageTransition type="slide-right" />
    </div>
  );
}
