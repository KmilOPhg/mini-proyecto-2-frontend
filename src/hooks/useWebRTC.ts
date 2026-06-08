import { useEffect, useRef, useState, useCallback } from 'react';
import { Peer, type MediaConnection } from 'peerjs';
import type { Socket } from 'socket.io-client';
import { connectWebRtcSocket, disconnectWebRtcSocket, parseWebRtcUrl, webrtcApiUrl } from '../lib/webrtcSocket';
import { mediaSecureContextError, screenShareUnsupportedError } from '../lib/mediaSecureContext';

export type RemotePeerState = {
  stream: MediaStream;
  audioMuted: boolean;
  videoMuted: boolean;
  sharingScreen: boolean;
  /** Incrementa al cambiar la pista de video (p. ej. pantalla compartida). */
  streamVersion: number;
};

export type UseWebRTCReturn = {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Map<string, RemotePeerState>;
  audioMuted: boolean;
  videoMuted: boolean;
  sharingScreen: boolean;
  webrtcReady: boolean;
  webrtcError: string | null;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreen: () => Promise<void>;
};

type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

function buildOutboundStream(
  videoTrack: MediaStreamTrack | null,
  audioSource?: MediaStream | null,
): MediaStream {
  const out = new MediaStream();
  audioSource?.getAudioTracks().forEach((t) => out.addTrack(t));
  if (videoTrack) out.addTrack(videoTrack);
  return out;
}

function countRemotePeers(uidToPeerId: Map<string, string>, myUid: string): number {
  let count = 0;
  for (const uid of uidToPeerId.keys()) {
    if (uid !== myUid) count += 1;
  }
  return count;
}

function isRecoverablePeerError(message: string): boolean {
  return /could not connect to peer|peer-unavailable|connection (?:has )?closed|lost|disconnected/i.test(message);
}

function isStreamLive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  const tracks = stream.getTracks();
  return tracks.length > 0 && tracks.some((t) => t.readyState === 'live');
}

async function acquireUserMedia(): Promise<MediaStream | null> {
  const secureError = mediaSecureContextError();
  if (secureError) throw new Error(secureError);

  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch {
      return null;
    }
  }
}

async function fetchIceServers(): Promise<IceServerConfig[]> {
  try {
    const res = await fetch(webrtcApiUrl('/ice-servers'));
    if (!res.ok) throw new Error('ICE fetch failed');
    const data = await res.json() as { data?: { iceServers?: IceServerConfig[] } };
    return data?.data?.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }];
  } catch {
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }
}

export function useWebRTC(
  salaId: string | undefined,
  jwtToken: string | null,
  myUid: string,
): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RemotePeerState>>(new Map());
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [webrtcReady, setWebrtcReady] = useState(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenEndTimerRef = useRef<number | undefined>(undefined);
  const activeCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const peerIdToUidRef = useRef<Map<string, string>>(new Map());
  const uidToPeerIdRef = useRef<Map<string, string>>(new Map());
  const remoteNamesRef = useRef<Map<string, string>>(new Map());
  const streamVersionRef = useRef<Map<string, number>>(new Map());
  const myUidRef = useRef(myUid);
  myUidRef.current = myUid;

  const bumpStreamVersion = useCallback((uid: string): number => {
    const next = (streamVersionRef.current.get(uid) ?? 0) + 1;
    streamVersionRef.current.set(uid, next);
    return next;
  }, []);

  const setRemote = useCallback((uid: string, updater: (prev: RemotePeerState | undefined) => RemotePeerState | null) => {
    setRemoteStreams(prev => {
      const next = new Map(prev);
      const result = updater(prev.get(uid));
      if (result === null) next.delete(uid);
      else next.set(uid, result);
      return next;
    });
  }, []);

  const getOutboundStream = useCallback((): MediaStream | null => {
    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    if (screenTrack?.readyState === 'live') {
      return buildOutboundStream(screenTrack, localStreamRef.current);
    }
    return localStreamRef.current;
  }, []);

  const resolveRemoteUid = useCallback((call: MediaConnection): string => {
    const fromMetadata = (call.metadata as { uid?: string })?.uid;
    if (fromMetadata) return fromMetadata;
    return peerIdToUidRef.current.get(call.peer) ?? call.peer;
  }, []);

  const publishRemoteStream = useCallback((
    remoteUid: string,
    remoteStream: MediaStream,
    overrides?: Partial<Pick<RemotePeerState, 'audioMuted' | 'videoMuted' | 'sharingScreen'>>,
  ) => {
    const version = bumpStreamVersion(remoteUid);
    setRemote(remoteUid, (prev) => ({
      stream: remoteStream,
      audioMuted: overrides?.audioMuted ?? prev?.audioMuted ?? false,
      videoMuted: overrides?.videoMuted ?? prev?.videoMuted ?? false,
      sharingScreen: overrides?.sharingScreen ?? prev?.sharingScreen ?? false,
      streamVersion: version,
    }));
  }, [bumpStreamVersion, setRemote]);

  const attachCallHandlers = useCallback((call: MediaConnection, remoteUid: string) => {
    const bindStream = (remoteStream: MediaStream) => {
      publishRemoteStream(remoteUid, remoteStream);

      const onTracksChanged = () => {
        publishRemoteStream(remoteUid, remoteStream, { videoMuted: false });
      };
      remoteStream.addEventListener('addtrack', onTracksChanged);
      remoteStream.addEventListener('removetrack', onTracksChanged);
    };

    call.on('stream', bindStream);

    const pc = call.peerConnection;
    if (pc) {
      pc.ontrack = (event) => {
        const stream = event.streams[0]
          ?? (event.track ? new MediaStream([event.track]) : null);
        if (stream) {
          publishRemoteStream(remoteUid, stream, { videoMuted: false });
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'failed' || state === 'disconnected') {
          void pc.restartIce?.();
        }
      };
    }

    call.on('error', () => {
      if (activeCallsRef.current.get(remoteUid) === call) {
        activeCallsRef.current.delete(remoteUid);
      }
    });

    call.on('close', () => {
      if (activeCallsRef.current.get(remoteUid) !== call) return;
      activeCallsRef.current.delete(remoteUid);
    });
  }, [publishRemoteStream]);

  const callPeer = useCallback((
    peerId: string,
    remoteUid: string,
    options?: { force?: boolean; stream?: MediaStream },
  ) => {
    const peer = peerRef.current;
    if (!peer || !remoteUid || remoteUid === myUidRef.current) return false;
    if (!options?.force && activeCallsRef.current.has(remoteUid)) return false;

    const outbound = options?.stream ?? getOutboundStream() ?? new MediaStream();
    const call = peer.call(peerId, outbound, {
      metadata: { uid: myUidRef.current },
    });
    if (!call) return false;

    activeCallsRef.current.set(remoteUid, call);
    attachCallHandlers(call, remoteUid);
    return true;
  }, [attachCallHandlers, getOutboundStream]);

  const registerPeerMapping = useCallback((peerId: string, uid: string) => {
    const oldPeerId = uidToPeerIdRef.current.get(uid);
    if (oldPeerId && oldPeerId !== peerId) {
      peerIdToUidRef.current.delete(oldPeerId);
      const staleCall = activeCallsRef.current.get(uid);
      if (staleCall) {
        staleCall.close();
        activeCallsRef.current.delete(uid);
      }
    }
    peerIdToUidRef.current.set(peerId, uid);
    uidToPeerIdRef.current.set(uid, peerId);
  }, []);

  /** Re-llama a cada peer con el stream saliente (necesario para pantalla compartida en móvil). */
  const recallPeersWithVideo = useCallback(async (
    videoTrack: MediaStreamTrack | null,
  ): Promise<number> => {
    const outbound = buildOutboundStream(videoTrack, localStreamRef.current);
    const entries = [...activeCallsRef.current.entries()];
    let count = 0;

    for (const [remoteUid, oldCall] of entries) {
      const peerId = uidToPeerIdRef.current.get(remoteUid);
      oldCall.close();
      activeCallsRef.current.delete(remoteUid);
      if (!peerId) continue;
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      if (callPeer(peerId, remoteUid, { force: true, stream: outbound })) {
        count += 1;
      }
    }

    return count;
  }, [callPeer]);

  const handleIncomingCall = useCallback((call: MediaConnection) => {
    const remoteUid = resolveRemoteUid(call);
    if (remoteUid === myUidRef.current) return;

    const existing = activeCallsRef.current.get(remoteUid);
    if (existing && existing !== call) existing.close();

    call.answer(getOutboundStream() ?? undefined);
    activeCallsRef.current.set(remoteUid, call);
    attachCallHandlers(call, remoteUid);
  }, [attachCallHandlers, getOutboundStream, resolveRemoteUid]);

  const stopScreenShare = useCallback(async (notifyServer: boolean) => {
    if (screenEndTimerRef.current) {
      window.clearTimeout(screenEndTimerRef.current);
      screenEndTimerRef.current = undefined;
    }

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    await recallPeersWithVideo(cameraTrack);

    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setSharingScreen(false);

    if (notifyServer) {
      const sock = socketRef.current;
      if (sock && salaId) sock.emit('screen:stop', { salaId });
    }
  }, [recallPeersWithVideo, salaId]);

  useEffect(() => {
    if (!salaId || !jwtToken) return;

    const token = jwtToken;
    let destroyed = false;

    async function init() {
      const iceServers = await fetchIceServers();

      let stream: MediaStream | null = null;
      try {
        stream = await acquireUserMedia();
      } catch (err) {
        if (!destroyed) {
          setWebrtcError(err instanceof Error ? err.message : 'No se pudo acceder a cámara o micrófono');
        }
      }

      if (destroyed) {
        stream?.getTracks().forEach(t => t.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const { hostname, port, secure, peerClientPath } = parseWebRtcUrl();
      const peer = new Peer({
        host: hostname,
        port,
        path: peerClientPath,
        config: {
          iceServers,
          iceCandidatePoolSize: 10,
        },
        secure,
      });

      peerRef.current = peer;

      peer.on('disconnected', () => {
        if (destroyed) return;
        if (!peer.destroyed) peer.reconnect();
      });

      peer.on('error', (err: Error) => {
        if (destroyed || isRecoverablePeerError(err.message)) return;
        setWebrtcError(err.message);
      });

      peer.on('open', async (peerId: string) => {
        if (destroyed) { peer.destroy(); return; }

        try {
          const sock = await connectWebRtcSocket(token);
          if (destroyed) { peer.destroy(); return; }

          socketRef.current = sock;

          sock.emit(
            'sala:join',
            { salaId, peerId },
            (ack: { ok: boolean; peers?: Array<{ peerId: string; uid: string; nombre: string; audioMuted: boolean; videoMuted: boolean; sharingScreen: boolean }>; error?: string }) => {
              if (!ack.ok) {
                setWebrtcError(ack.error ?? 'No se pudo unir a la sala WebRTC');
                return;
              }
              setWebrtcReady(true);

              // Solo quien entra llama a los que ya estaban (evita doble llamada).
              for (const p of (ack.peers ?? [])) {
                registerPeerMapping(p.peerId, p.uid);
                window.setTimeout(() => callPeer(p.peerId, p.uid), 300);
              }
            }
          );

          sock.on('peer:joined', (data: { peerId: string; uid: string; nombre: string }) => {
            registerPeerMapping(data.peerId, data.uid);
            remoteNamesRef.current.set(data.uid, data.nombre);
          });

          sock.on('peer:left', (data: { peerId: string; uid: string }) => {
            const call = activeCallsRef.current.get(data.uid);
            call?.close();
            activeCallsRef.current.delete(data.uid);
            peerIdToUidRef.current.delete(data.peerId);
            uidToPeerIdRef.current.delete(data.uid);
            setRemote(data.uid, () => null);
          });

          sock.on('media:state-changed', (data: { uid: string; audioMuted: boolean; videoMuted: boolean }) => {
            setRemote(data.uid, prev => {
              if (!prev) return null;
              return { ...prev, audioMuted: data.audioMuted, videoMuted: data.videoMuted };
            });
          });

          sock.on('screen:started', (data: { uid: string }) => {
            setRemote(data.uid, (prev) => {
              if (!prev) return null;
              const tracks = prev.stream.getTracks();
              const fresh = tracks.length > 0 ? new MediaStream(tracks) : prev.stream;
              const version = (streamVersionRef.current.get(data.uid) ?? 0) + 1;
              streamVersionRef.current.set(data.uid, version);
              return {
                ...prev,
                stream: fresh,
                sharingScreen: true,
                videoMuted: false,
                streamVersion: version,
              };
            });
          });

          sock.on('screen:stopped', (data: { uid: string }) => {
            setRemote(data.uid, prev => {
              if (!prev) return null;
              return { ...prev, sharingScreen: false };
            });
          });

          const onWebRtcReconnect = () => {
            if (destroyed) return;
            sock.emit(
              'sala:join',
              { salaId, peerId },
              (ack: { ok: boolean; peers?: Array<{ peerId: string; uid: string }> }) => {
                if (!ack.ok) return;
                for (const p of ack.peers ?? []) {
                  registerPeerMapping(p.peerId, p.uid);
                  window.setTimeout(() => callPeer(p.peerId, p.uid), 300);
                }
              },
            );
          };
          sock.io.on('reconnect', onWebRtcReconnect);

        } catch (err) {
          if (!destroyed) setWebrtcError(err instanceof Error ? err.message : 'Error de conexión WebRTC');
        }
      });

      peer.on('call', (call: MediaConnection) => {
        handleIncomingCall(call);
      });
    }

    init();

    return () => {
      destroyed = true;
      if (screenEndTimerRef.current) window.clearTimeout(screenEndTimerRef.current);

      const sock = socketRef.current;
      if (sock) {
        if (salaId) sock.emit('sala:leave', { salaId });
        disconnectWebRtcSocket();
        socketRef.current = null;
      }

      for (const call of activeCallsRef.current.values()) call.close();
      activeCallsRef.current.clear();
      peerIdToUidRef.current.clear();
      uidToPeerIdRef.current.clear();

      peerRef.current?.destroy();
      peerRef.current = null;

      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;

      setLocalStream(null);
      setScreenStream(null);
      setRemoteStreams(new Map());
      setWebrtcReady(false);
      setAudioMuted(false);
      setVideoMuted(false);
      setSharingScreen(false);
    };
  }, [salaId, jwtToken, myUid, callPeer, handleIncomingCall, registerPeerMapping, setRemote]);

  const rejoinWebRtcSala = useCallback(() => {
    const sock = socketRef.current;
    const peer = peerRef.current;
    if (!sock?.connected || !peer?.id || !salaId) return;
    sock.emit(
      'sala:join',
      { salaId, peerId: peer.id },
      (ack: { ok: boolean; peers?: Array<{ peerId: string; uid: string }> }) => {
        if (!ack.ok) return;
        for (const p of ack.peers ?? []) {
          registerPeerMapping(p.peerId, p.uid);
          window.setTimeout(() => callPeer(p.peerId, p.uid), 300);
        }
      },
    );
  }, [salaId, registerPeerMapping, callPeer]);

  useEffect(() => {
    const resumeMedia = async () => {
      if (document.visibilityState !== 'visible') return;

      if (!isStreamLive(localStreamRef.current)) {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        try {
          const stream = await acquireUserMedia();
          if (stream) {
            localStreamRef.current = stream;
            setLocalStream(stream);
          }
        } catch {
          // Permisos o contexto seguro; se reintenta al activar cámara.
        }
      }

      for (const call of activeCallsRef.current.values()) {
        const pc = call.peerConnection;
        if (!pc) continue;
        const iceState = pc.iceConnectionState;
        if (iceState === 'failed' || iceState === 'disconnected') {
          void pc.restartIce?.();
        }
      }

      rejoinWebRtcSala();
      setRemoteStreams((prev) => (prev.size > 0 ? new Map(prev) : prev));
      if (localStreamRef.current) {
        setLocalStream(localStreamRef.current);
      }
    };

    const onResume = () => { void resumeMedia(); };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
    };
  }, [rejoinWebRtcSala]);

  const ensureLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current && isStreamLive(localStreamRef.current)) {
      return localStreamRef.current;
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    try {
      const stream = await acquireUserMedia();
      if (!stream) {
        setWebrtcError('No se pudo acceder al micrófono o cámara. Revisa los permisos del navegador.');
        return null;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      setWebrtcError(err instanceof Error ? err.message : 'No se pudo acceder a cámara o micrófono');
      return null;
    }
  }, []);

  const toggleAudio = useCallback(async () => {
    const stream = await ensureLocalStream();
    if (!stream) return;
    const newMuted = !audioMuted;
    stream.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
    setAudioMuted(newMuted);
    const sock = socketRef.current;
    if (sock && salaId) sock.emit('media:update', { salaId, audioMuted: newMuted, videoMuted });
  }, [audioMuted, videoMuted, salaId, ensureLocalStream]);

  const toggleVideo = useCallback(async () => {
    if (sharingScreen) return;
    const stream = await ensureLocalStream();
    if (!stream) return;
    const newMuted = !videoMuted;
    stream.getVideoTracks().forEach(t => { t.enabled = !newMuted; });
    setVideoMuted(newMuted);
    const sock = socketRef.current;
    if (sock && salaId) sock.emit('media:update', { salaId, audioMuted, videoMuted: newMuted });
  }, [videoMuted, audioMuted, sharingScreen, salaId, ensureLocalStream]);

  const toggleScreen = useCallback(async () => {
    if (sharingScreen) {
      await stopScreenShare(true);
      return;
    }

    const screenError = screenShareUnsupportedError() ?? mediaSecureContextError();
    if (screenError) {
      setWebrtcError(screenError);
      return;
    }

    if (countRemotePeers(uidToPeerIdRef.current, myUidRef.current) === 0) {
      setWebrtcError('Espera a que el otro participante conecte el video WebRTC.');
      return;
    }

    if (activeCallsRef.current.size === 0) {
      setWebrtcError('Aún no hay llamada de video activa. Espera unos segundos o recarga ambos navegadores.');
      return;
    }

    try {
      const captured = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
        audio: false,
        selfBrowserSurface: 'exclude',
      } as DisplayMediaStreamOptions);
      const screenTrack = captured.getVideoTracks()[0];
      if (!screenTrack) {
        captured.getTracks().forEach((t) => t.stop());
        setWebrtcError('No se pudo capturar la pantalla.');
        return;
      }

      const updated = await recallPeersWithVideo(screenTrack);
      if (updated === 0) {
        captured.getTracks().forEach((t) => t.stop());
        setWebrtcError('No se pudo enviar la pantalla al otro participante.');
        return;
      }

      screenStreamRef.current = captured;
      setScreenStream(captured);
      setSharingScreen(true);
      setVideoMuted(false);

      screenTrack.onended = () => {
        if (screenEndTimerRef.current) window.clearTimeout(screenEndTimerRef.current);
        // Evita cortar al cambiar de ventana si el track sigue vivo.
        screenEndTimerRef.current = window.setTimeout(() => {
          if (screenTrack.readyState === 'ended') {
            void stopScreenShare(true);
          }
        }, 600);
      };

      const sock = socketRef.current;
      if (sock && salaId) {
        sock.emit('screen:start', { salaId }, (ack: { ok?: boolean; error?: string }) => {
          if (ack && ack.ok === false) {
            setWebrtcError(ack.error ?? 'No se pudo iniciar compartir pantalla.');
          }
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setWebrtcError('Permiso denegado para compartir pantalla.');
        return;
      }
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setWebrtcError(err instanceof Error ? err.message : 'No se pudo compartir pantalla.');
    }
  }, [sharingScreen, salaId, recallPeersWithVideo, stopScreenShare]);

  return {
    localStream,
    screenStream,
    remoteStreams,
    audioMuted,
    videoMuted,
    sharingScreen,
    webrtcReady,
    webrtcError,
    toggleAudio,
    toggleVideo,
    toggleScreen,
  };
}
