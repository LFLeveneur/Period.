// Module analytics — wrapper PostHog
// Désactivé en développement : aucun event n'est envoyé hors production
import posthog from 'posthog-js';
import { env } from './env';

const ANALYTICS_ENABLED = import.meta.env.MODE === 'production';

// Initialisation conditionnelle — uniquement en production avec une clé valide
if (ANALYTICS_ENABLED && env.POSTHOG_KEY) {
  posthog.init(env.POSTHOG_KEY, {
    api_host: 'https://eu.posthog.com',
    // Désactive le suivi automatique des pages — on le fait manuellement
    capture_pageview: false,
    // Pas de données personnelles
    sanitize_properties: (props) => {
      const sanitized = { ...props };
      delete sanitized['$email'];
      delete sanitized['email'];
      return sanitized;
    },
  });
}

/** Identifie l'utilisatrice après connexion — jamais de données personnelles */
export function identify(userId: string) {
  if (!ANALYTICS_ENABLED) return;
  posthog.identify(userId);
}

/** Réinitialise la session analytics après déconnexion */
export function reset() {
  if (!ANALYTICS_ENABLED) return;
  posthog.reset();
}

/**
 * Enregistre un event analytics.
 * Jamais de données personnelles (pas d'email, pas de nom).
 * Appeler APRÈS le succès de l'action, jamais avant.
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (!ANALYTICS_ENABLED) return;
  posthog.capture(event, properties);
}
