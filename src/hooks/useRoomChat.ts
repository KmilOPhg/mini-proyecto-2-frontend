import { useCallback, useEffect, useRef, useState } from 'react';
import { getMensajes } from '../services/api';
import type { MensajePublico } from '../services/api';
import {
  connectSocket,
  disconnectSocket,
  getActiveSocket,
  joinSalaSocket,
  leaveSalaSocket,
  sendMensajeSocket,
} from '../lib/socket';
import { useAuthStore } from '../store/authStore';

export function useRoomChat(salaId: string | undefined, jwtToken: string | null) {
  const user = useAuthStore(s => s.user);

  const [mensajes, setMensajes] = useState<MensajePublico[]>([]);
  const [chatReady, setChatReady] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Referencia para saber si el efecto sigue vigente tras async
  const activeRef = useRef(true);

  // ── Conexión al socket y carga de historial ──────────────────────────────
  useEffect(() => {
    if (!salaId || !jwtToken) return;

    activeRef.current = true;
    setChatReady(false);
    setChatError(null);

    let sock: ReturnType<typeof getActiveSocket> = null;

    (async () => {
      try {
        // 1. Cargar historial REST
        const history = await getMensajes(jwtToken, salaId, 50);
        if (!activeRef.current) return;
        setMensajes(history);

        // 2. Conectar socket
        sock = await connectSocket(jwtToken);
        if (!activeRef.current) return;

        // 3. Registrar listener DIRECTAMENTE en el socket
        const onMensaje = (msg: MensajePublico) => {
          if (msg.salaId !== salaId) return;
          setMensajes(prev =>
            prev.some(m => m.id === msg.id) ? prev : [...prev, msg],
          );
        };
        sock.on('mensaje:nuevo', onMensaje);

        // 4. Re-registrar listener tras reconexión
        const onReconnect = async () => {
          if (!activeRef.current) return;
          await joinSalaSocket(salaId);
        };
        sock.io.on('reconnect', onReconnect);

        // 5. Unirse a la sala en el socket
        const joinRes = await joinSalaSocket(salaId);
        if (!activeRef.current) return;

        if (!joinRes.ok) {
          setChatError(joinRes.error);
          return;
        }

        setChatReady(true);
      } catch (err) {
        if (!activeRef.current) return;
        setChatError(
          err instanceof Error ? err.message : 'Error al conectar el chat.',
        );
      }
    })();

    return () => {
      activeRef.current = false;

      const s = getActiveSocket();
      if (s) {
        s.off('mensaje:nuevo');
        s.io.off('reconnect');
      }
      leaveSalaSocket(salaId);
      disconnectSocket();
      setChatReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaId, jwtToken]);

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const sendMensaje = useCallback(
    async (texto: string) => {
      if (!salaId || !user) {
        return { ok: false as const, error: 'Sin sesión activa.' };
      }

      const username =
        user.username ??
        [user.nombres, user.apellidos].filter(Boolean).join(' ') ??
        user.email;

      // Mensaje optimista local
      const tempId = `pending-${Date.now()}`;
      const optimistic: MensajePublico = {
        id: tempId,
        salaId,
        uid: user.id,
        username,
        texto,
        createdAt: new Date().toISOString(),
      };

      setMensajes(prev => [...prev, optimistic]);

      const res = await sendMensajeSocket(salaId, texto);

      if (!res.ok) {
        // Revertir si falla
        setMensajes(prev => prev.filter(m => m.id !== tempId));
        return res;
      }

      // Reemplazar el optimista por el mensaje real del servidor
      // (el evento mensaje:nuevo del socket también llega, el dedup por id lo maneja)
      setMensajes(prev => {
        const filtered = prev.filter(m => m.id !== tempId && m.id !== res.mensaje.id);
        return [...filtered, res.mensaje];
      });

      return res;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [salaId, user?.id],
  );

  return { mensajes, chatReady, chatError, sendMensaje };
}
