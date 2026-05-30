import { useCallback, useEffect, useRef, useState } from 'react';
import { getMensajes } from '../services/api';
import type { MensajePublico } from '../services/api';
import {
  connectSocket,
  disconnectSocket,
  joinSalaSocket,
  leaveSalaSocket,
  onMensajeNuevo,
  sendMensajeSocket,
  setActiveSala,
  clearActiveSala,
} from '../lib/socket';
import { useAuthStore } from '../store/authStore';

export function useRoomChat(salaId: string | undefined, jwtToken: string | null) {
  const user = useAuthStore(s => s.user);
  const [mensajes, setMensajes] = useState<MensajePublico[]>([]);
  const [chatReady, setChatReady] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const genRef = useRef(0);

  const addMensaje = useCallback((msg: MensajePublico) => {
    setMensajes(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  useEffect(() => {
    if (!salaId || !jwtToken) return;

    const gen = ++genRef.current;
    let removeListener: (() => void) | undefined;

    removeListener = onMensajeNuevo(msg => {
      if (msg.salaId === salaId) addMensaje(msg);
    });

    (async () => {
      try {
        setChatReady(false);
        setChatError(null);

        const history = await getMensajes(jwtToken, salaId, 50);
        if (gen !== genRef.current) return;
        setMensajes(history);

        await connectSocket(jwtToken);
        if (gen !== genRef.current) return;

        setActiveSala(salaId);
        const joinRes = await joinSalaSocket(salaId);
        if (gen !== genRef.current) return;

        if (!joinRes.ok) {
          setChatError(joinRes.error);
          return;
        }

        setChatReady(true);
      } catch (err) {
        if (gen !== genRef.current) return;
        setChatError(err instanceof Error ? err.message : 'Error al conectar el chat.');
      }
    })();

    return () => {
      genRef.current++;
      removeListener?.();
      leaveSalaSocket(salaId);
      clearActiveSala();
      disconnectSocket();
      setChatReady(false);
    };
  }, [salaId, jwtToken, addMensaje]);

  const sendMensaje = useCallback(async (texto: string) => {
    if (!salaId || !user) {
      return { ok: false as const, error: 'Sin sesión activa.' };
    }

    const username =
      user.username
      ?? [user.nombres, user.apellidos].filter(Boolean).join(' ')
      ?? user.email;

    const tempId = `pending-${Date.now()}`;
    const optimistic: MensajePublico = {
      id: tempId,
      salaId,
      uid: user.id,
      username,
      texto,
      createdAt: new Date().toISOString(),
    };
    addMensaje(optimistic);

    const res = await sendMensajeSocket(salaId, texto);
    if (!res.ok) {
      setMensajes(prev => prev.filter(m => m.id !== tempId));
      return res;
    }

    setMensajes(prev => {
      const withoutPending = prev.filter(m => m.id !== tempId && m.id !== res.mensaje.id);
      return [...withoutPending, res.mensaje];
    });

    return res;
  }, [salaId, user, addMensaje]);

  return { mensajes, chatReady, chatError, sendMensaje };
}
