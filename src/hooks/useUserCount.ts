// Hook pour récupérer le nombre total d'utilisateurs
import { useEffect, useState } from 'react';
import { getUserCount } from '@/services/analyticsService';

interface UseUserCountResult {
  count: number | null;
  loading: boolean;
  error: string | null;
}

export function useUserCount(): UseUserCountResult {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCount() {
      setLoading(true);
      const { data, error: err } = await getUserCount();

      if (isMounted) {
        setCount(data);
        setError(err);
        setLoading(false);
      }
    }

    fetchCount();

    return () => {
      isMounted = false;
    };
  }, []);

  return { count, loading, error };
}
