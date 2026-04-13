// Bouton principal de l'application
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Affiche un spinner de chargement et désactive le bouton */
  loading?: boolean;
  /** Variante visuelle du bouton */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Taille du bouton */
  size?: 'sm' | 'md' | 'lg';
  /** Icône affichée à droite du label */
  iconRight?: ReactNode;
}

export function PrimaryButton({
  children,
  loading = false,
  variant = 'primary',
  size = 'md',
  iconRight,
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  // Styles de base communs
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: iconRight ? 'space-between' : 'center',
    gap: 'var(--space-2)',
    borderRadius: 'var(--radius-xl)',
    fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
    fontFamily: 'var(--font-family)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    border: 'none',
    transition: `opacity var(--duration-fast), transform var(--duration-fast)`,
    width: '100%',
    ...style,
  };

  // Styles de taille
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      height: '40px',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)',
      fontSize: 'var(--text-sm)',
    },
    md: {
      height: '52px',
      paddingLeft: 'var(--space-5)',
      paddingRight: 'var(--space-5)',
      fontSize: 'var(--text-base)',
    },
    lg: {
      height: '56px',
      paddingLeft: 'var(--space-6)',
      paddingRight: 'var(--space-6)',
      fontSize: 'var(--text-base)',
    },
  };

  // Styles de variante
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-text)',
      color: 'var(--color-text-light)',
      boxShadow: 'var(--shadow-lg)',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: 'var(--color-primary)',
      border: '2px solid var(--color-primary)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text)',
    },
    danger: {
      backgroundColor: 'var(--color-error)',
      color: 'var(--color-text-light)',
      boxShadow: 'var(--shadow-sm)',
    },
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
    >
      {/* Spinner de chargement */}
      {loading && (
        <span
          style={{
            width: '18px',
            height: '18px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ flex: iconRight ? 1 : undefined, textAlign: iconRight ? 'left' : undefined }}>
        {children}
      </span>
      {/* Icône droite — visible uniquement si pas en loading */}
      {iconRight && !loading && (
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{iconRight}</span>
      )}
    </button>
  );
}
