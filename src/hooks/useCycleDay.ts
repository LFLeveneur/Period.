// Hook principal pour accéder au jour du cycle courant
import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { predictPhaseForDate } from '@/services/cyclePredictionService';
import type { CycleDay } from '@/types/cycle';

/** Formate la date d'aujourd'hui au format YYYY-MM-DD */
function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retourne la CycleDay pour aujourd'hui.
 * Mis en cache — pas de recalcul à chaque render.
 * Retourne null si pas assez de données ou cycle_tracking = false.
 */
export function useCycleDay(): {
  cycleDay: CycleDay | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { user } = useAuthContext();
  const [cycleDay, setCycleDay] = useState<CycleDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCycleDay = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = getTodayString();
      const result = await predictPhaseForDate(user.id, today);
      setCycleDay(result);
    } catch (err) {
      console.error('[useCycleDay] Erreur inattendue :', err);
      setError('Impossible de calculer la phase du cycle.');
      setCycleDay(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charge au montage du composant
  useEffect(() => {
    fetchCycleDay();
  }, [fetchCycleDay]);

  // refresh() force un recalcul sans recharger la page
  // Utilisé depuis l'accueil après "Mes règles ont commencé"
  const refresh = useCallback(() => {
    fetchCycleDay();
  }, [fetchCycleDay]);

  return { cycleDay, loading, error, refresh };
}
