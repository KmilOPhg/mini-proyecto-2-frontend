import { useCallback, useEffect, useRef, useState } from 'react';
import { getMensajes } from '../services/api';
import type { MensajePublico } from '../services/api';
import {
  connectSocket,
  disconnectSocket,
  getActiveSocket,
  joinSalaSocket,
  leaveSalaSocket,
  refreshPresenceSocket,
  sendMensajeSocket,
} from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { getUserDisplayName } from '../utils/userDisplay';

export type UsuarioEnLinea = { uid: string; nombre: string };

export function useRoomChat(salaId: string | undefined, jwtToken: string | null) {
  const user = useAuthStore(s => s.user);

  const [mensajes, setMensajes] = useState<MensajePublico[]>([]);
  const [usuariosEnLinea, setUsuariosEnLinea] = useState<UsuarioEnLinea[]>([]);
  const [chatReady, setChatReady] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const sessionRef = useRef(0);

  const appendMensaje = useCallback((msg: MensajePublico) => {
    setMensajes(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  useEffect(() => {
    if (!salaId || !jwtToken) return;

    const session = ++sessionRef.current;
    setChatReady(false);
    setChatError(null);
    setUsuariosEnLinea([]);

    let onMensaje: ((msg: MensajePublico) => void) | null = null;
    let onPresencia: ((data: { salaId: string; usuarios: UsuarioEnLinea[] }) => void) | null = null;
    let onReconnect: (() => void) | null = null;

    (async () => {
      try {
        const history = await getMensajes(jwtToken, salaId, 50);
        if (session !== sessionRef.current) return;
        setMensajes(history);

        const sock = await connectSocket(jwtToken);
        if (session !== sessionRef.current) return;

        onMensaje = (msg: MensajePublico) => {
          if (msg.salaId === salaId) appendMensaje(msg);
        };

        onPresencia = (data: { salaId: string; usuarios: UsuarioEnLinea[] }) => {
          if (data.salaId === salaId) setUsuariosEnLinea(data.usuarios);
        };

        onReconnect = () => {
          if (session === sessionRef.current) joinSalaSocket(salaId);
        };

        sock.on('mensaje:nuevo', onMensaje);
        sock.on('presencia:actualizada', onPresencia);
        sock.io.on('reconnect', onReconnect);

        const joinRes = await joinSalaSocket(salaId);
        if (session !== sessionRef.current) return;

        if (!joinRes.ok) {
          setChatError(joinRes.error);
          return;
        }

        setChatReady(true);
      } catch (err) {
        if (session !== sessionRef.current) return;
        setChatError(err instanceof Error ? err.message : 'Error al conectar el chat.');
      }
    })();

    return () => {
      sessionRef.current++;
      const s = getActiveSocket();
      if (s) {
        if (onMensaje) s.off('mensaje:nuevo', onMensaje);
        if (onPresencia) s.off('presencia:actualizada', onPresencia);
        if (onReconnect) s.io.off('reconnect', onReconnect);
      }
      leaveSalaSocket(salaId);
      disconnectSocket();
      setChatReady(false);
      setUsuariosEnLinea([]);
    };
  }, [salaId, jwtToken, appendMensaje]);

  const displayName = user ? getUserDisplayName(user) : '';

  useEffect(() => {
    if (!user || !chatReady || !salaId || !displayName) return;

    setUsuariosEnLinea(prev =>
      prev.map(u => (u.uid === user.id ? { ...u, nombre: displayName } : u)),
    );
    refreshPresenceSocket().catch(() => {});
  }, [displayName, user, chatReady, salaId]);

  const sendMensaje = useCallback(
    async (texto: string) => {
      if (!salaId || !user) {
        return { ok: false as const, error: 'Sin sesión activa.' };
      }

      const username = getUserDisplayName(user);

      const tempId = `pending-${Date.now()}`;
      appendMensaje({
        id: tempId,
        salaId,
        uid: user.id,
        username,
        texto,
        createdAt: new Date().toISOString(),
      });

      const res = await sendMensajeSocket(salaId, texto);

      if (!res.ok) {
        setMensajes(prev => prev.filter(m => m.id !== tempId));
        return res;
      }

      setMensajes(prev => {
        const filtered = prev.filter(m => m.id !== tempId && m.id !== res.mensaje.id);
        return [...filtered, res.mensaje];
      });

      return res;
    },
    [salaId, user, appendMensaje],
  );

  return { mensajes, usuariosEnLinea, chatReady, chatError, sendMensaje };
}
