// Chronomètre total de la séance — affiche MM:SS en temps réel
import { useState, useEffect } from 'react';
import { formatDuration } from '@/utils/sessionUtils';

interface SessionTimerProps {
  /** Date de démarrage de la séance */
  startedAt: Date;
}

export function SessionTimer({ startedAt }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Calcule le temps écoulé initial
    setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span
      style={{
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
        color: 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {formatDuration(elapsed)}
    </span>
  );
}
