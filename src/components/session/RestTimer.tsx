// Timer de repos circulaire — affiché après validation d'une série
import { useState, useEffect, useRef } from 'react';
import { formatDuration } from '@/utils/sessionUtils';

interface RestTimerProps {
  /** Durée initiale en secondes */
  duration: number;
  /** Callback au tap "passer" */
  onSkip: () => void;
  /** Callback ±30s sur les boutons d'ajustement */
  onAdjust: (delta: number) => void;
  /** Callback appelé à 00:00 */
  onComplete: () => void;
}

export function RestTimer({ duration, onSkip, onAdjust, onComplete }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Synchronise remaining si la prop duration change (via onAdjust)
  const initialDuration = useRef(duration);

  useEffect(() => {
    setRemaining(duration);
    initialDuration.current = duration;
  }, [duration]);

  useEffect(() => {
    if (remaining <= 0) {
      onCompleteRef.current();
      return;
    }

    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [remaining]);

  // Calcul de la progression pour l'anneau SVG
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / Math.max(1, initialDuration.current);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(47, 0, 87, 0.85)',
        zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-6)',
        padding: 'var(--space-4)',
      }}
    >
      {/* Anneau SVG circulaire */}
      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          {/* Anneau de fond */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(197, 132, 238, 0.2)"
            strokeWidth="8"
          />
          {/* Anneau de progression */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>

        {/* Temps restant au centre */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text-light)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatDuration(remaining)}
          </span>
        </div>
      </div>

      {/* Label */}
      <p
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-sm)',
          color: 'rgba(249, 237, 225, 0.7)',
          margin: 0,
        }}
      >
        temps de repos
      </p>

      {/* Boutons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* -30s */}
        <button
          onClick={() => onAdjust(-30)}
          style={{
            background: 'rgba(249, 237, 225, 0.1)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-2) var(--space-4)',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-light)',
            cursor: 'pointer',
          }}
        >
          -30s
        </button>

        {/* Passer */}
        <button
          onClick={onSkip}
          style={{
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-2) var(--space-6)',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          passer →
        </button>

        {/* +30s */}
        <button
          onClick={() => onAdjust(30)}
          style={{
            background: 'rgba(249, 237, 225, 0.1)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-2) var(--space-4)',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-light)',
            cursor: 'pointer',
          }}
        >
          +30s
        </button>
      </div>
    </div>
  );
}
