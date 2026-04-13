// Page d'accueil publique — première impression de l'app
import { useNavigate } from 'react-router';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-dark)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        textAlign: 'center',
      }}
    >
      {/* Logo et titre */}
      <h1
        style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-light)',
          fontFamily: 'var(--font-family)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Period.
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: 'var(--text-lg)',
          color: 'var(--color-text-muted-dark)',
          fontFamily: 'var(--font-family)',
          marginBottom: 'var(--space-12)',
          maxWidth: '280px',
        }}
      >
        ton cycle, ta force. Period. 🖤
      </p>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          width: '100%',
          maxWidth: '320px',
        }}
      >
        {/* Bouton principal */}
        <PrimaryButton onClick={() => navigate('/signup')}>
          Commencer
        </PrimaryButton>

        {/* Lien connexion */}
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-light)',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            opacity: 0.8,
          }}
        >
          J&apos;ai déjà un compte
        </button>
      </div>
    </div>
  );
}
