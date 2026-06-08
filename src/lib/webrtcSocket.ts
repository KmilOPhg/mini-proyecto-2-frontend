import { io, type Socket } from 'socket.io-client';
import { parseServiceUrl } from './parseServiceUrl';

const WEBRTC_DEV_SOCKET_PATH = '/rtc/socket.io';

function resolveWebRtcUrl(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin;
  }

  const explicit = import.meta.env.VITE_WEBRTC_URL;
  if (typeof explicit === 'string' && explicit.trim()) {
    return parseServiceUrl(explicit.trim(), 3002);
  }
  return 'http://localhost:3002';
}

export const WEBRTC_URL = resolveWebRtcUrl();

export type WebRtcConnectionConfig = {
  baseUrl: string;
  hostname: string;
  port: number;
  secure: boolean;
  peerClientPath: string;
  socketPath: string;
};

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function parseWebRtcUrl(url = WEBRTC_URL): WebRtcConnectionConfig {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const { hostname, protocol, port } = window.location;
    const secure = protocol === 'https:';
    return {
      baseUrl: window.location.origin,
      hostname,
      port: port ? Number(port) : secure ? 443 : 80,
      secure,
      peerClientPath: '/peerjs',
      socketPath: WEBRTC_DEV_SOCKET_PATH,
    };
  }

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

  return {
    baseUrl: parsed.origin,
    hostname: parsed.hostname,
    port,
    secure,
    peerClientPath: '/peerjs',
    socketPath: '/socket.io',
  };
}

export function webrtcApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return normalizedPath;
  }
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
    const { baseUrl, socketPath } = parseWebRtcUrl();
    const sock = io(baseUrl, {
      path: socketPath,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: import.meta.env.DEV ? ['polling'] : ['polling', 'websocket'],
      timeout: 20000,
    });

    const timeout = setTimeout(() => {
      cleanup();
      sock.disconnect();
      socket = null;
      reject(new Error('Tiempo de espera agotado al conectar con el servidor WebRTC'));
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

export function disconnectWebRtcSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
