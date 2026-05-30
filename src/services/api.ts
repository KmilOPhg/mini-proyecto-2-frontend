const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:1206/api';

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
  return request<StudentUser>('/auth/users/me', {
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

export type SalaPublica = {
  id: string;
  nombre: string;
  creadorUid: string;
  participantes: string[];
  esCreador: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export function createSala(token: string, nombre: string) {
  return request<SalaPublica>('/salas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nombre }),
  });
}
