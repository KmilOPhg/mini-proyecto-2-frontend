/** Normaliza URLs de servicios: en HTTPS (Render) quita puertos internos de desarrollo. */
export function parseServiceUrl(url: string, internalPort?: number): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  const parsed = new URL(trimmed);
  const secure = parsed.protocol === 'https:';
  let port = parsed.port ? Number(parsed.port) : secure ? 443 : 80;

  if (secure && internalPort !== undefined && port === internalPort) {
    port = 443;
  }

  const pathname = parsed.pathname.replace(/\/+$/, '');
  const defaultPort = secure ? 443 : 80;
  const host =
    port === defaultPort ? parsed.hostname : `${parsed.hostname}:${port}`;

  return `${parsed.protocol}//${host}${pathname}`;
}
