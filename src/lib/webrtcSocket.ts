import { io, type Socket } from 'socket.io-client';
import { parseServiceUrl } from './parseServiceUrl';

function resolveWebRtcUrl(): string {
  const explicit = import.meta.env.VITE_WEBRTC_URL;
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:3002';
}

export const WEBRTC_URL = resolveWebRtcUrl();

export type WebRtcConnectionConfig = {
  /** Origin para Socket.IO y fetch (sin path /peerjs). */
  baseUrl: string;
  hostname: string;
  port: number;
  secure: boolean;
  /** Path del cliente PeerJS (PeerJS añade "/peerjs/id" → mount "/peerjs" en el servidor). */
  peerClientPath: string;
};

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Parsea VITE_WEBRTC_URL para Socket.IO y PeerJS (puerto/path correctos en prod). */
export function parseWebRtcUrl(url = WEBRTC_URL): WebRtcConnectionConfig {
  const normalized = parseServiceUrl(url, 3002);
  const parsed = new URL(normalized);
  const secure = parsed.protocol === 'https:';
  const local = isLocalHost(parsed.hostname);

  let port = parsed.port ? Number(parsed.port) : secure ? 443 : 80;
  if (local && !parsed.port && !secure) {
    port = 3002;
  }
  if (secure && !local) {
    port = 443;
  }

  // Socket.IO y REST usan solo el origin (no /peerjs)
  const baseUrl = `${parsed.protocol}//${parsed.host}`;

  // Express monta PeerJS en app.use("/peerjs", …); el cliente debe usar path "/peerjs"
  // para que las peticiones vayan a /peerjs/peerjs/id (ruta real del servidor).
  const peerClientPath = '/peerjs';

  return {
    baseUrl,
    hostname: parsed.hostname,
    port,
    secure,
    peerClientPath,
  };
}

/** Une la base del signaling server con un path sin duplicar barras. */
export function webrtcApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${parseWebRtcUrl().baseUrl}${normalizedPath}`;
}

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getActiveWebRtcSocket(): Socket | null {
  return socket;
}

export function connectWebRtcSocket(token: string): Promise<Socket> {
  if (socket?.connected && currentToken === token) {
    return Promise.resolve(socket);
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  return new Promise<Socket>((resolve, reject) => {
    const { baseUrl } = parseWebRtcUrl();
    const sock = io(baseUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      transports: ['websocket', 'polling'],
    });

    const onConnect = () => {
      sock.off('connect', onConnect);
      sock.off('connect_error', onError);
      socket = sock;
      resolve(sock);
    };

    const onError = (err: Error) => {
      sock.off('connect', onConnect);
      sock.off('connect_error', onError);
      sock.disconnect();
      socket = null;
      reject(err);
    };

    sock.on('connect', onConnect);
    sock.on('connect_error', onError);
  });
}

export function disconnectWebRtcSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
