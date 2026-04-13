// Layout pour l'onboarding — requiert seulement d'être connectée
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/layout/PageTransition';

export function OnboardingLayout() {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
    }}>
      <PageTransition type="scale" />
    </div>
  );
}
