// Hook de tracking de navigation — enregistre un event page_viewed à chaque changement de route
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { trackEvent } from '@/services/analyticsService';

/**
 * À appeler une seule fois dans un layout protégé (AppLayout).
 * Enregistre un event page_viewed avec le pathname à chaque navigation.
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Track la vue de page avec le pathname sans les paramètres de query
    trackEvent('page_viewed', { path: location.pathname });
  }, [location.pathname]);
}
