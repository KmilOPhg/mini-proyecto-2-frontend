import { io, type Socket } from 'socket.io-client';
import type { MensajePublico } from '../services/api';

const SOCKET_URL =
  (import.meta.env.VITE_API_URL ?? 'http://localhost:1206/api').replace(/\/api\/?$/, '');

let socket: Socket | null = null;
let currentToken: string | null = null;
let activeSalaId: string | null = null;
let connectPromise: Promise<Socket> | null = null;

const mensajeListeners = new Set<(msg: MensajePublico) => void>();

function dispatchMensaje(msg: MensajePublico) {
  mensajeListeners.forEach(cb => cb(msg));
}

function attachSocketHandlers(sock: Socket) {
  sock.off('mensaje:nuevo');
  sock.on('mensaje:nuevo', dispatchMensaje);

  sock.io.off('reconnect');
  sock.io.on('reconnect', () => {
    if (activeSalaId && sock.connected) {
      sock.emit('sala:unirse', { salaId: activeSalaId });
    }
  });
}

export function connectSocket(token: string): Promise<Socket> {
  if (socket?.connected && currentToken === token) {
    return Promise.resolve(socket);
  }
  if (connectPromise && currentToken === token) {
    return connectPromise;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  connectPromise = new Promise<Socket>((resolve, reject) => {
    const sock = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
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
      connectPromise = null;
      reject(err);
    };

    const cleanup = () => {
      sock.off('connect', onConnect);
      sock.off('connect_error', onError);
    };

    sock.on('connect', onConnect);
    sock.on('connect_error', onError);
  }).finally(() => {
    connectPromise = null;
  });

  return connectPromise!;
}

export function setActiveSala(salaId: string) {
  activeSalaId = salaId;
}

export function clearActiveSala() {
  activeSalaId = null;
}

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  currentToken = null;
  activeSalaId = null;
  connectPromise = null;
}

export function onMensajeNuevo(cb: (msg: MensajePublico) => void) {
  mensajeListeners.add(cb);
  return () => { mensajeListeners.delete(cb); };
}

function emitWithAck<T>(
  event: string,
  payload: unknown,
  timeoutMs = 12000,
): Promise<T> {
  return new Promise(resolve => {
    if (!socket?.connected) {
      resolve({ ok: false, error: 'Sin conexión al chat en tiempo real.' } as T);
      return;
    }
    const timer = setTimeout(() => {
      resolve({ ok: false, error: 'Tiempo de espera agotado.' } as T);
    }, timeoutMs);
    socket.emit(event, payload, (res: T) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

export function joinSalaSocket(salaId: string): Promise<{ ok: true; salaId: string } | { ok: false; error: string }> {
  return emitWithAck('sala:unirse', { salaId });
}

export function leaveSalaSocket(salaId: string) {
  socket?.emit('sala:salir', { salaId });
  if (activeSalaId === salaId) activeSalaId = null;
}

export function sendMensajeSocket(
  salaId: string,
  texto: string,
): Promise<{ ok: true; mensaje: MensajePublico } | { ok: false; error: string }> {
  return emitWithAck('mensaje:enviar', { salaId, texto });
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
