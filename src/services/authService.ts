// Service d'authentification — toutes les opérations auth via Supabase
import { supabase } from '@/lib/supabase';
import type { AuthError } from '@/types/auth';

// Traduit les messages d'erreur Supabase en français
function mapErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('Email not confirmed')) return 'Vérifie ta boîte mail pour confirmer ton compte.';
  if (message.includes('User already registered')) return 'Un compte existe déjà avec cet email.';
  if (message.includes('Password should be at least 6 characters')) return 'Le mot de passe doit faire au moins 6 caractères.';
  return 'Une erreur est survenue. Réessaie.';
}

// Inscription avec email et mot de passe
export async function signUp(email: string, password: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: { message: mapErrorMessage(error.message) } };
  return { error: null };
}

// Connexion avec email et mot de passe
export async function signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: { message: mapErrorMessage(error.message) } };
  return { error: null };
}

// Connexion avec Google OAuth
export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    // Redirige vers la racine après authentification
    // Supabase détecte le code du callback et termine le flow
    // PublicLayout gère ensuite la redirection vers /onboarding ou /home selon l'état du profil
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) return { error: { message: mapErrorMessage(error.message) } };
  return { error: null };
}

// Déconnexion
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  if (error) return { error: { message: mapErrorMessage(error.message) } };
  return { error: null };
}

// Envoi d'email de réinitialisation de mot de passe
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) return { error: { message: mapErrorMessage(error.message) } };
  return { error: null };
}

// Mise à jour du mot de passe (après reset)
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: { message: mapErrorMessage(error.message) } };
  return { error: null };
}

// Suppression du compte utilisateur via fonction RPC Supabase
export async function deleteAccount(): Promise<{ error: AuthError | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: { message: 'Aucune session active.' } };

  const { error } = await supabase.rpc('delete_user');
  if (error) return { error: { message: mapErrorMessage(error.message) } };

  await supabase.auth.signOut();
  return { error: null };
}

// Récupère l'utilisateur courant depuis la session
export async function getCurrentUser(): Promise<{ data: { id: string; email: string } | null; error: string | null }> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return { data: null, error: error?.message ?? null };
  return {
    data: { id: session.user.id, email: session.user.email! },
    error: null,
  };
}
