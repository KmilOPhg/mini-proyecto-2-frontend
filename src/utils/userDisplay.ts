import type { StudentUser } from '../services/api';

/** Nombre visible en salas y chat: nombre completo, username o email. */
export function getUserDisplayName(user: Pick<StudentUser, 'username' | 'nombres' | 'apellidos' | 'email'>): string {
  const full = [user.nombres, user.apellidos].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user.username?.trim()) return user.username.trim();
  return user.email;
}
