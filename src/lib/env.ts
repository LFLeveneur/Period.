// Seul fichier autorisé à lire les variables d'environnement Vite
function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Variable d'environnement manquante : ${key}`);
  return value;
}

// Variable optionnelle — ne throw pas si absente
function optionalEnv(key: string): string | undefined {
  return import.meta.env[key] as string | undefined;
}

export const env = {
  SUPABASE_URL: requireEnv('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('VITE_SUPABASE_ANON_KEY'),
  MAKE_WEBHOOK_URL: requireEnv('VITE_MAKE_WEBHOOK_URL'),
  // Clé PostHog — optionnelle, uniquement utile en production
  POSTHOG_KEY: optionalEnv('VITE_POSTHOG_KEY'),
} as const;
