// Composant inline d'information sur le RIR — icône (i) avec bulle explicative au tap
import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

/**
 * Affiche une icône (i) discrète. Au tap, une bulle explique ce qu'est le RIR.
 * S'adapte au contexte : s'intègre dans du texte inline ou dans un label.
 */
export function RirInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Ferme la bulle au clic en dehors
  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
    >
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="qu'est-ce que le RIR ?"
        style={{
          background: 'none',
          border: 'none',
          padding: '0 3px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          color: open ? 'var(--color-primary)' : 'var(--color-text-muted)',
          lineHeight: 1,
        }}
      >
        <Info style={{ width: '11px', height: '11px' }} />
      </button>

      {open && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--color-bg-dark)',
            color: 'var(--color-text-light)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.5,
            width: '230px',
            zIndex: 'var(--z-overlay)' as unknown as number,
            boxShadow: 'var(--shadow-lg)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--color-primary)' }}>
            RIR — Reps In Reserve
          </strong>
          nombre de répétitions que tu aurais encore pu faire avant l'échec. RIR 0 = plus rien en réserve. RIR 3 = 3 reps disponibles.
        </span>
      )}
    </span>
  );
}
