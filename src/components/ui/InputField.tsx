// Champ de saisie standardisé avec label et message d'erreur
import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label affiché au-dessus du champ */
  label: string;
  /** Message d'erreur à afficher sous le champ */
  error?: string;
}

export function InputField({ label, error, id, style, ...props }: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* Label du champ */}
      <label
        htmlFor={id}
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {label}
      </label>

      {/* Champ de saisie — fond blanc, coins arrondis généreux, bordure subtile */}
      <input
        id={id}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          height: '56px',
          padding: '0 var(--space-4)',
          borderRadius: 'var(--radius-xl)',
          border: error
            ? '2px solid var(--color-error)'
            : focused
            ? '2px solid var(--color-primary)'
            : '2px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          fontFamily: 'var(--font-family)',
          outline: 'none',
          boxShadow: focused ? 'var(--shadow-sm)' : 'none',
          transition: `border-color var(--duration-normal), box-shadow var(--duration-normal)`,
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      />

      {/* Message d'erreur */}
      {error && (
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-error)',
            fontFamily: 'var(--font-family)',
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
