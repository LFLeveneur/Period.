// Contexte d'authentification — fournit user, profile, loading à toute l'app
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import * as analytics from '@/lib/analytics';
import type { User, Profile } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Charge le profil depuis Supabase — avec retry si le profil n'existe pas encore
  async function loadProfile(userId: string) {
    let attempt = 0;
    const maxAttempts = 3;
    const delayMs = 500; // Délai entre les tentatives

    while (attempt < maxAttempts) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
        return;
      }

      // Si le profil n'existe pas (par exemple après OAuth), retry après un délai
      if (error?.code === 'PGRST116' || !data) {
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Après tous les essais, considérer que le profil n'existe pas
          setProfile(null);
          return;
        }
      } else {
        // Erreur autre que "non trouvé", ne pas retry
        setProfile(null);
        return;
      }
    }

    setProfile(null);
  }

  // Rafraîchit le profil manuellement (après onboarding par exemple)
  async function refreshProfile() {
    if (!user) return;
    await loadProfile(user.id);
  }

  useEffect(() => {
    // Vérifie la session existante au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email! });
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Écoute les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Met loading à true pour éviter les redirections prématurées pendant le chargement du profil
        setLoading(true);
        setUser({ id: session.user.id, email: session.user.email! });
        // Identifie l'utilisatrice dans analytics après connexion
        if (event === 'SIGNED_IN') {
          analytics.identify(session.user.id);
        }
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        // Réinitialise la session analytics à la déconnexion
        if (event === 'SIGNED_OUT') {
          analytics.reset();
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook d'accès au contexte d'authentification
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext doit être utilisé dans un AuthProvider');
  }
  return context;
}
