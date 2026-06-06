import { io, type Socket } from 'socket.io-client';
import type { MensajePublico } from '../services/api';
import { parseServiceUrl } from './parseServiceUrl';

function resolveSocketUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (typeof explicit === 'string' && explicit.trim()) {
    return parseServiceUrl(explicit.trim(), 3001);
  }
  const api = import.meta.env.VITE_API_URL ?? '/api';
  if (api.startsWith('http')) {
    return parseServiceUrl(api.replace(/\/api\/?$/, ''), 1206);
  }
  return 'http://localhost:3001';
}

const SOCKET_URL = resolveSocketUrl();

let socket: Socket | null = null;
let currentToken: string | null = null;

/** Devuelve el socket actual, o null si no hay conexión activa. */
export function getActiveSocket(): Socket | null {
  return socket;
}

/** Conecta el socket con el token dado y espera a que esté listo. */
export function connectSocket(token: string): Promise<Socket> {
  // Reutilizar si ya está conectado con el mismo token
  if (socket?.connected && currentToken === token) {
    return Promise.resolve(socket);
  }

  // Desconectar cualquier socket previo
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  return new Promise<Socket>((resolve, reject) => {
    const sock = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      transports: ['polling', 'websocket'],
      timeout: 20000,
    });

    const timeout = setTimeout(() => {
      cleanup();
      sock.disconnect();
      socket = null;
      reject(new Error('Tiempo de espera agotado al conectar con el chat en tiempo real'));
    }, 20000);

    const cleanup = () => {
      clearTimeout(timeout);
      sock.off('connect', onConnect);
    };

    const onConnect = () => {
      cleanup();
      socket = sock;
      resolve(sock);
    };

    sock.on('connect', onConnect);
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}

export function joinSalaSocket(salaId: string): Promise<{ ok: true; salaId: string } | { ok: false; error: string }> {
  return new Promise(resolve => {
    if (!socket?.connected) {
      resolve({ ok: false, error: 'Sin conexión al chat en tiempo real.' });
      return;
    }
    const timer = setTimeout(
      () => resolve({ ok: false, error: 'Tiempo de espera agotado al unirse a la sala.' }),
      12000,
    );
    socket.emit('sala:unirse', { salaId }, (res: { ok: boolean; salaId?: string; error?: string }) => {
      clearTimeout(timer);
      if (res.ok) resolve({ ok: true, salaId: res.salaId ?? salaId });
      else resolve({ ok: false, error: res.error ?? 'No se pudo unir a la sala.' });
    });
  });
}

export function refreshPresenceSocket(): Promise<{ ok: true; nombre?: string } | { ok: false; error: string }> {
  return new Promise(resolve => {
    if (!socket?.connected) {
      resolve({ ok: false, error: 'Sin conexión al chat en tiempo real.' });
      return;
    }
    const timer = setTimeout(
      () => resolve({ ok: false, error: 'Tiempo de espera agotado al actualizar presencia.' }),
      8000,
    );
    socket.emit('perfil:actualizar', (res: { ok: boolean; nombre?: string; error?: string }) => {
      clearTimeout(timer);
      if (res.ok) resolve({ ok: true, nombre: res.nombre });
      else resolve({ ok: false, error: res.error ?? 'No se pudo actualizar la presencia.' });
    });
  });
}

export function leaveSalaSocket(salaId: string): Promise<void> {
  return new Promise(resolve => {
    if (!socket?.connected) {
      resolve();
      return;
    }
    const timer = setTimeout(() => resolve(), 4000);
    socket.emit('sala:salir', { salaId }, () => {
      clearTimeout(timer);
      resolve();
    });
  });
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
    const timer = setTimeout(
      () => resolve({ ok: false, error: 'Tiempo de espera agotado al enviar el mensaje.' }),
      12000,
    );
    socket.emit('mensaje:enviar', { salaId, texto }, (res: { ok: boolean; mensaje?: MensajePublico; error?: string }) => {
      clearTimeout(timer);
      if (res.ok && res.mensaje) resolve({ ok: true, mensaje: res.mensaje });
      else resolve({ ok: false, error: res.error ?? 'No se pudo enviar el mensaje.' });
    });
  });
}
