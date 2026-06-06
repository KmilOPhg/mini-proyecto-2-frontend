import { io, type Socket } from 'socket.io-client';

function resolveWebRtcUrl(): string {
  const explicit = import.meta.env.VITE_WEBRTC_URL;
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:3002';
}

export const WEBRTC_URL = resolveWebRtcUrl();

/** Une la base del signaling server con un path sin duplicar barras. */
export function webrtcApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${WEBRTC_URL}${normalizedPath}`;
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
    const sock = io(WEBRTC_URL, {
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
