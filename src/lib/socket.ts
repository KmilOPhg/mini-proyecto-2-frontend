import { io, type Socket } from 'socket.io-client';
import type { MensajePublico } from '../services/api';

const SOCKET_URL =
  (import.meta.env.VITE_API_URL ?? 'http://localhost:1206/api').replace(/\/api\/?$/, '');

let socket: Socket | null = null;
let currentToken: string | null = null;
const mensajeListeners = new Set<(msg: MensajePublico) => void>();

function dispatchMensaje(msg: MensajePublico) {
  mensajeListeners.forEach(cb => cb(msg));
}

function attachSocketHandlers(sock: Socket) {
  sock.off('mensaje:nuevo');
  sock.on('mensaje:nuevo', dispatchMensaje);
}

/** Conecta (o reutiliza) el socket y espera a que esté listo. */
export function connectSocket(token: string): Promise<Socket> {
  if (socket?.connected && currentToken === token) {
    return Promise.resolve(socket);
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  return new Promise((resolve, reject) => {
    const sock = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    const onConnect = () => {
      cleanup();
      socket = sock;
      attachSocketHandlers(sock);
      resolve(sock);
    };

    const onError = (err: Error) => {
      cleanup();
      sock.disconnect();
      reject(err);
    };

    const cleanup = () => {
      sock.off('connect', onConnect);
      sock.off('connect_error', onError);
    };

    sock.on('connect', onConnect);
    sock.on('connect_error', onError);
  });
}

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  currentToken = null;
}

export function onMensajeNuevo(cb: (msg: MensajePublico) => void) {
  mensajeListeners.add(cb);
  return () => { mensajeListeners.delete(cb); };
}

export function joinSalaSocket(salaId: string): Promise<{ ok: true; salaId: string } | { ok: false; error: string }> {
  return new Promise(resolve => {
    if (!socket?.connected) {
      resolve({ ok: false, error: 'Sin conexión al chat en tiempo real.' });
      return;
    }
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
    if (!socket?.connected) {
      resolve({ ok: false, error: 'Sin conexión al chat en tiempo real.' });
      return;
    }
    socket.emit('mensaje:enviar', { salaId, texto }, (res: { ok: boolean; mensaje?: MensajePublico; error?: string }) => {
      if (res.ok && res.mensaje) resolve({ ok: true, mensaje: res.mensaje });
      else resolve({ ok: false, error: res.error ?? 'No se pudo enviar el mensaje.' });
    });
  });
}

export function appendMensajeLocal(msg: MensajePublico) {
  dispatchMensaje(msg);
}
