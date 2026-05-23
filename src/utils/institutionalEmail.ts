/**
 * Debe coincidir con INSTITUTIONAL_EMAIL_DOMAINS del backend.
 * Vacío = no validar en cliente (desarrollo).
 */
const ALLOWED_DOMAINS = (import.meta.env.VITE_INSTITUTIONAL_EMAIL_DOMAINS ?? 'edu.co')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isInstitutionalEmail(email: string): boolean {
  if (ALLOWED_DOMAINS.length === 0) return true;

  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf('@');
  if (at < 0) return false;
  const host = lower.slice(at + 1);

  return ALLOWED_DOMAINS.some((d) => {
    const suffix = d.startsWith('@') ? d.slice(1) : d;
    return host === suffix || host.endsWith(`.${suffix}`);
  });
}

export const INSTITUTIONAL_EMAIL_HINT =
  'Usa un correo institucional con dominio .edu.co (por ejemplo tu@universidad.edu.co).';
