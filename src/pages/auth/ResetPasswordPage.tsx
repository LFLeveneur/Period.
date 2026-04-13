// Page de réinitialisation de mot de passe (deux états : demande + nouveau mot de passe)
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import * as authService from '@/services/authService';
import { supabase } from '@/lib/supabase';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);
  // Détermine si on est en mode "nouveau mot de passe" (après clic sur le lien email)
  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    // Écoute l'événement PASSWORD_RECOVERY envoyé par Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const { error } = await authService.resetPassword(email);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccess(true);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setLoading(true);
    const { error } = await authService.updatePassword(newPassword);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccess(true);
  }

  // État succès
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
          {isResetMode ? 'Mot de passe mis à jour ✅' : 'Email envoyé 📬'}
        </h2>
        <p
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)',
            maxWidth: '280px',
            marginBottom: 'var(--space-6)',
          }}
        >
          {isResetMode
            ? 'Ton mot de passe a été modifié avec succès.'
            : `Un lien de réinitialisation a été envoyé à ${email}.`}
        </p>
        <Link
          to="/login"
          style={{
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-family)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          }}
        >
          Retour à la connexion
        </Link>
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
          {isResetMode ? 'Nouveau mot de passe' : 'Mot de passe oublié'}
        </h1>
        <p
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)',
            marginBottom: 'var(--space-8)',
          }}
        >
          {isResetMode
            ? 'Choisis un nouveau mot de passe.'
            : 'Saisis ton email pour recevoir un lien de réinitialisation.'}
        </p>

        {/* Formulaire demande de reset */}
        {!isResetMode ? (
          <form
            onSubmit={handleRequestReset}
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
              Envoyer le lien
            </PrimaryButton>
          </form>
        ) : (
          /* Formulaire nouveau mot de passe */
          <form
            onSubmit={handleUpdatePassword}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <InputField
              id="newPassword"
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              required
              autoComplete="new-password"
            />

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
              Mettre à jour
            </PrimaryButton>
          </form>
        )}

        {/* Lien retour */}
        <p
          style={{
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)',
          }}
        >
          <Link
            to="/login"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
            }}
          >
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
