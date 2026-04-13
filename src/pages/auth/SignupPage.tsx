// Page d'inscription par email et mot de passe
import { useState } from 'react';
import { Link } from 'react-router';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import * as authService from '@/services/authService';
import * as analytics from '@/lib/analytics';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    // Validation locale des mots de passe
    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setLoading(true);
    const { error } = await authService.signUp(email, password);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    analytics.track('auth_user_signed_up', { method: 'email' });
    // Affiche message de confirmation d'email
    setSuccess(true);
  }

  async function handleGoogle() {
    setErrorMessage('');
    setLoading(true);
    const { error } = await authService.signInWithGoogle();
    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    // Si signInWithGoogle() réussit, le flow OAuth rediriges l'utilisatrice
    // et les guards de PublicLayout gèrent la redirection vers /onboarding ou /home
    // Ajouter un timeout pour détecter les cas où le redirect n'a pas eu lieu
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setErrorMessage('Erreur lors de la connexion avec Google. Réessaie.');
    }, 5000);

    // Nettoyer le timeout si une redirection se produit
    return () => clearTimeout(timeoutId);
  }

  // État succès — email envoyé
  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-4)',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Vérifie ta boîte mail 📬
        </h2>
        <p
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)',
            maxWidth: '280px',
          }}
        >
          Un lien de confirmation a été envoyé à <strong>{email}</strong>. Clique dessus pour activer ton compte.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '390px' }}>
        {/* En-tête */}
        <h1
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Créer un compte
        </h1>
        <p
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)',
            marginBottom: 'var(--space-8)',
          }}
        >
          Bienvenue 🌸
        </p>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <InputField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            required
            autoComplete="email"
          />

          <InputField
            id="password"
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 caractères"
            required
            autoComplete="new-password"
          />

          <InputField
            id="confirmPassword"
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />

          {/* Message d'erreur global */}
          {errorMessage && (
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-error)',
                fontFamily: 'var(--font-family)',
                margin: 0,
              }}
            >
              {errorMessage}
            </p>
          )}

          <PrimaryButton type="submit" loading={loading}>
            Créer mon compte
          </PrimaryButton>

          {/* Séparateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', color: 'var(--color-text-muted)' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-family)' }}>ou</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
          </div>

          {/* Bouton Google — design officiel */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              width: '100%',
              padding: 'var(--space-3) var(--space-6)',
              backgroundColor: '#FFFFFF',
              color: '#3C4043',
              border: '1px solid #DADCE0',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              fontFamily: 'var(--font-family)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              boxShadow: 'var(--shadow-sm)',
              transition: `opacity var(--duration-fast), transform var(--duration-fast)`,
            }}
          >
            {/* Logo Google SVG officiel */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.576c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.576 9 3.576z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>
        </form>

        {/* Lien vers connexion */}
        <p
          style={{
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)',
          }}
        >
          Déjà un compte ?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            }}
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
