import { io, type Socket } from 'socket.io-client';
import type { MensajePublico } from '../services/api';

const SOCKET_URL =
  (import.meta.env.VITE_API_URL ?? 'http://localhost:1206/api').replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export type SocketAck<T> = { ok: true } & T | { ok: false; error: string };

export function joinSalaSocket(salaId: string): Promise<{ ok: true; salaId: string } | { ok: false; error: string }> {
  return new Promise(resolve => {
    if (!socket) { resolve({ ok: false, error: 'Sin conexión.' }); return; }
    socket.emit('sala:unirse', { salaId }, (res: { ok: boolean; salaId?: string; error?: string }) => {
      if (res.ok) resolve({ ok: true, salaId: res.salaId ?? salaId });
      else resolve({ ok: false, error: res.error ?? 'No se pudo unir a la sala.' });
    });
  });
}

export function leaveSalaSocket(salaId: string) {
  socket?.emit('sala:salir', { salaId });
}

export function sendMensajeSocket(
  salaId: string,
  texto: string,
): Promise<{ ok: true; mensaje: MensajePublico } | { ok: false; error: string }> {
  return new Promise(resolve => {
    if (!socket) { resolve({ ok: false, error: 'Sin conexión.' }); return; }
    socket.emit('mensaje:enviar', { salaId, texto }, (res: { ok: boolean; mensaje?: MensajePublico; error?: string }) => {
      if (res.ok && res.mensaje) resolve({ ok: true, mensaje: res.mensaje });
      else resolve({ ok: false, error: res.error ?? 'No se pudo enviar el mensaje.' });
    });
  });
}

export function onMensajeNuevo(cb: (msg: MensajePublico) => void) {
  socket?.on('mensaje:nuevo', cb);
  return () => { socket?.off('mensaje:nuevo', cb); };
}
