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
  /** Base URL para Socket.IO y fetch (sin path extra). */
  baseUrl: string;
  hostname: string;
  port: number;
  secure: boolean;
  /** Path raíz del servidor PeerJS montado en Express (p. ej. "/peerjs"). */
  peerPath: string;
};

/** Parsea VITE_WEBRTC_URL para Socket.IO y PeerJS (puerto/path correctos en prod). */
export function parseWebRtcUrl(url = WEBRTC_URL): WebRtcConnectionConfig {
  const baseUrl = parseServiceUrl(url, 3002);
  const parsed = new URL(baseUrl);
  const secure = parsed.protocol === 'https:';
  const port = parsed.port ? Number(parsed.port) : secure ? 443 : 80;
  const pathname = parsed.pathname.replace(/\/+$/, '');
  const peerPath = pathname || '/peerjs';

  return {
    baseUrl,
    hostname: parsed.hostname,
    port,
    secure,
    peerPath,
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
