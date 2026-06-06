import { parseServiceUrl } from '../lib/parseServiceUrl';

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL ?? '/api';
  if (!raw.startsWith('http')) return raw;

  const normalized = parseServiceUrl(raw, 1206).replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

const API_BASE = resolveApiBase();

type ApiResponse<T> = {
  status: string;
  msg: string;   // el backend siempre usa "msg", no "message"
  data: T;
};

async function request<T>(
  path: string,
  options?: RequestInit & { headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const json: ApiResponse<T> = await res.json();
  if (!res.ok) throw new Error(json.msg ?? 'Error en la solicitud');
  return json.data;
}

export type StudentUser = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  username: string | null;
  avatar: string | null;
  email: string;
  rolId: string;
  estado: 'ACTIVO' | 'INACTIVO';
  profileComplete: boolean;
};

export function checkUsernameAvailable(username: string) {
  return request<{ available: boolean; username: string }>(
    `/auth/username-available?username=${encodeURIComponent(username)}`
  );
}

export type RegisterInput = {
  nombres: string;
  apellidos: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
};

export function registerStudent(input: RegisterInput) {
  return request<{ customToken: string; user: StudentUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type SessionResult =
  | { needsUsername: true; token: null; user: StudentUser }
  | { needsUsername: false; token: string; user: StudentUser };

export function createSession(idToken: string) {
  return request<SessionResult>('/auth/session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
}

export function logoutSession(token: string) {
  return request<null>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function completeGoogleUsername(idToken: string, username: string) {
  return request<{ token: string; user: StudentUser }>('/auth/google/complete-username', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ username }),
  });
}

export type ProfileUpdateInput = Partial<{
  nombres: string;
  apellidos: string;
  username: string;
  email: string;
  avatar: string | null;
}>;

export function updateMyProfile(token: string, input: ProfileUpdateInput) {
  return request<{ user: StudentUser; token: string }>('/auth/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function deleteMyAccount(token: string) {
  return request<null>('/auth/users/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Salas ──────────────────────────────────────────────────────────────────────

export type PrivacidadSala = 'publica' | 'enlace';

export type SalaPublica = {
  id: string;
  nombre: string;
  creadorUid: string;
  participantes: string[];
  codigoInvitacion: string | null;
  aforoMaximo: number;
  privacidad: PrivacidadSala;
  materia: string | null;
  descripcion: string | null;
  esCreador: boolean;
  usuariosEnLinea: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateSalaInput = {
  nombre: string;
  codigoInvitacion: string;
};

export function createSala(token: string, input: CreateSalaInput) {
  return request<SalaPublica>('/salas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      nombre: input.nombre,
      codigoInvitacion: input.codigoInvitacion,
    }),
  });
}

export type ListarMisSalasData = {
  items: SalaPublica[];
  total: number;
  vacio: boolean;
};

export function listMisSalas(token: string) {
  return request<ListarMisSalasData>('/salas/mias', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getSala(token: string, id: string) {
  return request<SalaPublica>(`/salas/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function joinSala(token: string, id: string) {
  return request<SalaPublica>(`/salas/${encodeURIComponent(id)}/unirse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function joinSalaPorCodigo(token: string, codigo: string) {
  return request<SalaPublica>('/salas/unirse-por-codigo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ codigo: codigo.trim().toUpperCase() }),
  });
}

function shouldTryJoin(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    msg.includes('acceso')
    || msg.includes('encontr')
    || msg.includes('existe')
    || msg.includes('404')
    || msg.includes('not found')
  );
}

/** Resuelve una sala desde el segmento de URL (código CRF-XXX-YYY o id interno). */
export async function resolveSalaAccess(token: string, routeParam: string): Promise<SalaPublica> {
  const parsed = decodeURIComponent(routeParam).trim();

  if (/^CRF-[A-Z0-9]{3}-[A-Z0-9]{3}$/i.test(parsed)) {
    // GET /salas/:id solo acepta el id de Firestore, no el código CRF.
    return joinSalaPorCodigo(token, parsed.toUpperCase());
  }

  try {
    return await getSala(token, parsed);
  } catch (err) {
    if (shouldTryJoin(err)) return joinSala(token, parsed);
    throw err;
  }
}

export type MensajePublico = {
  id: string;
  salaId: string;
  uid: string;
  username: string;
  texto: string;
  createdAt: string | null;
};

export function getMensajes(token: string, salaId: string, limit = 50) {
  return request<MensajePublico[]>(
    `/salas/${encodeURIComponent(salaId)}/mensajes?limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export function deleteSala(token: string, id: string) {
  return request<null>(`/salas/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateSala(token: string, id: string, nombre: string) {
  return request<SalaPublica>(`/salas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nombre: nombre.trim() }),
  });
}
