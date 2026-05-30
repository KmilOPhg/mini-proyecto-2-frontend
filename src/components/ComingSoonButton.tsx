import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const COMING_SOON_LABEL = 'Próximamente';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

/** Botón deshabilitado con tooltip/aria "Próximamente". */
export default function ComingSoonButton({
  label,
  children,
  className = '',
  style,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled
      title={COMING_SOON_LABEL}
      aria-label={`${label} — ${COMING_SOON_LABEL}`}
      className={className}
      style={{ cursor: 'not-allowed', opacity: 0.4, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
