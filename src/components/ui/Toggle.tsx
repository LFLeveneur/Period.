// Composant toggle switch réutilisable (interrupteur on/off)

interface ToggleProps {
  /** Valeur actuelle du toggle */
  checked: boolean;
  /** Callback appelé au changement d'état */
  onChange: (value: boolean) => void;
  /** Désactive le toggle (pas d'interaction) */
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  const handleClick = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      disabled={disabled}
      style={{
        // Pill extérieure : 48×28px
        width: 48,
        height: 28,
        borderRadius: 'var(--radius-full)',
        backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        transition: `background-color var(--duration-normal)`,
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {/* Cercle intérieur */}
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: 'var(--color-surface)',
          display: 'block',
          boxShadow: 'var(--shadow-sm)',
          transition: `transform var(--duration-normal)`,
        }}
      />
    </button>
  );
}
