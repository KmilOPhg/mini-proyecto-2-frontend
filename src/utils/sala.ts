import type { SalaPublica } from '../services/api';

export type RoomColor = 'indigo' | 'violet' | 'sky' | 'emerald' | 'amber' | 'rose';

const COLORS: RoomColor[] = ['indigo', 'violet', 'sky', 'emerald', 'amber', 'rose'];

export const COLOR_GRADIENTS: Record<RoomColor, string> = {
  indigo:  'linear-gradient(135deg, #4F46E5 0%, #1E1B4B 100%)',
  violet:  'linear-gradient(135deg, #7C3AED 0%, #2E1065 100%)',
  sky:     'linear-gradient(135deg, #0284C7 0%, #0C2A4A 100%)',
  emerald: 'linear-gradient(135deg, #059669 0%, #042F2E 100%)',
  amber:   'linear-gradient(135deg, #D97706 0%, #3F1F08 100%)',
  rose:    'linear-gradient(135deg, #E11D48 0%, #4C0519 100%)',
};

export function formatSalaCode(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const a = clean.slice(0, 3).padEnd(3, 'X');
  const b = clean.slice(-3).padStart(3, 'X');
  return `CRF-${a}-${b}`;
}

const CODIGO_INVITACION_RE = /^CRF-[A-Z0-9]{3}-[A-Z0-9]{3}$/;

export function isCodigoInvitacion(value: string): boolean {
  return CODIGO_INVITACION_RE.test(value.trim().toUpperCase());
}

export function parseSalaJoinInput(raw: string): string {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(/\/(?:salas|r)\/([^/?#]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]!);
  const codigoMatch = trimmed.match(/CRF-[A-Z0-9]{3}-[A-Z0-9]{3}/i);
  if (codigoMatch) return codigoMatch[0]!.toUpperCase();
  return trimmed.toUpperCase();
}

export function salaShareCode(sala: Pick<SalaPublica, 'id' | 'codigoInvitacion'>): string {
  return sala.codigoInvitacion ?? sala.id;
}

function colorFromId(id: string): RoomColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % COLORS.length;
  return COLORS[hash]!;
}

export function participantGradientFromUid(uid: string): string {
  return COLOR_GRADIENTS[colorFromId(uid)];
}

export function inferSubject(nombre: string): string {
  const beforeDash = nombre.split(/[·\-–—|]/)[0]?.trim();
  if (beforeDash && beforeDash.length <= 24) return beforeDash;
  const words = nombre.trim().split(/\s+/);
  return words.slice(0, 2).join(' ') || 'General';
}

export type RoomCardData = {
  id: string;
  title: string;
  subject: string;
  host: string;
  onlineCount: number;
  totalMembers: number;
  max: number;
  status: 'live' | 'scheduled';
  color: RoomColor;
  time: string;
  desc: string;
  code: string;
};

export function salaToRoomCard(sala: SalaPublica, hostName: string): RoomCardData {
  const subject = sala.materia ?? inferSubject(sala.nombre);
  const created = sala.createdAt ? new Date(sala.createdAt) : null;
  const time = created
    ? created.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const onlineCount = sala.usuariosEnLinea ?? 0;
  const totalMembers = sala.participantes.length;
  const max = sala.aforoMaximo ?? 50;

  return {
    id: sala.id,
    title: sala.nombre,
    subject,
    host: hostName,
    onlineCount,
    totalMembers,
    max,
    status: onlineCount > 0 ? 'live' : 'scheduled',
    color: colorFromId(sala.id),
    time,
    desc: sala.descripcion?.trim()
      || (onlineCount > 0
        ? `${onlineCount} usuario${onlineCount === 1 ? '' : 's'} en la sala ahora.`
        : 'Nadie conectado en este momento.'),
    code: sala.codigoInvitacion ?? formatSalaCode(sala.id),
  };
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function formatMessageTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function validateMensajeTexto(texto: string): string | null {
  const trimmed = texto.trim();
  if (!trimmed) return 'El mensaje no puede estar vacío.';
  if (trimmed.length > 2000) return 'El mensaje no puede superar 2000 caracteres.';
  return null;
}
