import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import type { Socket } from 'socket.io-client';
import { connectWebRtcSocket, disconnectWebRtcSocket, WEBRTC_URL } from '../lib/webrtcSocket';

export type RemotePeerState = {
  stream: MediaStream;
  audioMuted: boolean;
  videoMuted: boolean;
  sharingScreen: boolean;
};

export type UseWebRTCReturn = {
  localStream: MediaStream | null;
  remoteStreams: Map<string, RemotePeerState>;
  audioMuted: boolean;
  videoMuted: boolean;
  sharingScreen: boolean;
  webrtcReady: boolean;
  webrtcError: string | null;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreen: () => Promise<void>;
};

type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

async function fetchIceServers(): Promise<IceServerConfig[]> {
  try {
    const res = await fetch(`${WEBRTC_URL}/ice-servers`);
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
): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
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
  const activeCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  // uid → peerId mapping from sala:join ack
  const peerIdToUidRef = useRef<Map<string, string>>(new Map());
  const uidToPeerIdRef = useRef<Map<string, string>>(new Map());

  const setRemote = useCallback((uid: string, updater: (prev: RemotePeerState | undefined) => RemotePeerState | null) => {
    setRemoteStreams(prev => {
      const next = new Map(prev);
      const result = updater(prev.get(uid));
      if (result === null) {
        next.delete(uid);
      } else {
        next.set(uid, result);
      }
      return next;
    });
  }, []);

  const handleIncomingCall = useCallback((call: MediaConnection, uid: string) => {
    const local = localStreamRef.current;
    call.answer(local ?? undefined);

    call.on('stream', (remoteStream: MediaStream) => {
      setRemote(uid, () => ({
        stream: remoteStream,
        audioMuted: false,
        videoMuted: false,
        sharingScreen: false,
      }));
    });

    call.on('close', () => {
      setRemote(uid, () => null);
      activeCallsRef.current.delete(uid);
    });

    activeCallsRef.current.set(uid, call);
  }, [setRemote]);

  const callPeer = useCallback((peerId: string, uid: string) => {
    const peer = peerRef.current;
    const local = localStreamRef.current;
    if (!peer) return;

    const call = peer.call(peerId, local ?? new MediaStream(), {
      metadata: { uid },
    });

    call.on('stream', (remoteStream: MediaStream) => {
      setRemote(uid, () => ({
        stream: remoteStream,
        audioMuted: false,
        videoMuted: false,
        sharingScreen: false,
      }));
    });

    call.on('close', () => {
      setRemote(uid, () => null);
      activeCallsRef.current.delete(uid);
    });

    activeCallsRef.current.set(uid, call);
  }, [setRemote]);

  useEffect(() => {
    if (!salaId || !jwtToken) return;

    let destroyed = false;

    async function init() {
      const iceServers = await fetchIceServers();

      // Get user media
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        // Fallback: audio only
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        } catch {
          stream = null;
        }
      }

      if (destroyed) {
        stream?.getTracks().forEach(t => t.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create PeerJS instance
      const peer = new Peer({
        host: new URL(WEBRTC_URL).hostname,
        port: Number(new URL(WEBRTC_URL).port) || 3002,
        path: '/peerjs',
        config: { iceServers },
        secure: WEBRTC_URL.startsWith('https'),
      });

      peerRef.current = peer;

      peer.on('error', (err: Error) => {
        if (!destroyed) setWebrtcError(err.message);
      });

      peer.on('open', async (peerId: string) => {
        if (destroyed) { peer.destroy(); return; }

        try {
          const sock = await connectWebRtcSocket(jwtToken);
          if (destroyed) { peer.destroy(); return; }

          socketRef.current = sock;

          // Join room → get existing peers
          sock.emit(
            'sala:join',
            { salaId, peerId },
            (ack: { ok: boolean; peers?: Array<{ peerId: string; uid: string; nombre: string; audioMuted: boolean; videoMuted: boolean; sharingScreen: boolean }>; error?: string }) => {
              if (!ack.ok) {
                setWebrtcError(ack.error ?? 'No se pudo unir a la sala WebRTC');
                return;
              }
              setWebrtcReady(true);

              // Call existing peers
              for (const p of (ack.peers ?? [])) {
                peerIdToUidRef.current.set(p.peerId, p.uid);
                uidToPeerIdRef.current.set(p.uid, p.peerId);
                callPeer(p.peerId, p.uid);
              }
            }
          );

          // New peer joined → we call them
          sock.on('peer:joined', (data: { peerId: string; uid: string; nombre: string }) => {
            peerIdToUidRef.current.set(data.peerId, data.uid);
            uidToPeerIdRef.current.set(data.uid, data.peerId);
            callPeer(data.peerId, data.uid);
          });

          // Peer left → clean up
          sock.on('peer:left', (data: { peerId: string; uid: string }) => {
            const call = activeCallsRef.current.get(data.uid);
            call?.close();
            activeCallsRef.current.delete(data.uid);
            peerIdToUidRef.current.delete(data.peerId);
            uidToPeerIdRef.current.delete(data.uid);
            setRemote(data.uid, () => null);
          });

          // Remote media state changed
          sock.on('media:state-changed', (data: { uid: string; audioMuted: boolean; videoMuted: boolean }) => {
            setRemote(data.uid, prev => {
              if (!prev) return null;
              return { ...prev, audioMuted: data.audioMuted, videoMuted: data.videoMuted };
            });
          });

          // Remote screen share events
          sock.on('screen:started', (data: { uid: string }) => {
            setRemote(data.uid, prev => {
              if (!prev) return null;
              return { ...prev, sharingScreen: true };
            });
          });

          sock.on('screen:stopped', (data: { uid: string }) => {
            setRemote(data.uid, prev => {
              if (!prev) return null;
              return { ...prev, sharingScreen: false };
            });
          });

        } catch (err) {
          if (!destroyed) setWebrtcError(err instanceof Error ? err.message : 'Error de conexión WebRTC');
        }
      });

      // Answer incoming calls
      peer.on('call', (call: MediaConnection) => {
        const uid = (call.metadata as { uid?: string })?.uid ?? call.peer;
        handleIncomingCall(call, uid);
      });
    }

    init();

    return () => {
      destroyed = true;

      const sock = socketRef.current;
      if (sock) {
        if (salaId) sock.emit('sala:leave', { salaId });
        disconnectWebRtcSocket();
        socketRef.current = null;
      }

      for (const call of activeCallsRef.current.values()) {
        call.close();
      }
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
      setRemoteStreams(new Map());
      setWebrtcReady(false);
      setAudioMuted(false);
      setVideoMuted(false);
      setSharingScreen(false);
    };
  }, [salaId, jwtToken, callPeer, handleIncomingCall, setRemote]);

  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    const newMuted = !audioMuted;
    audioTracks.forEach(t => { t.enabled = !newMuted; });
    setAudioMuted(newMuted);
    const sock = socketRef.current;
    if (sock && salaId) {
      sock.emit('media:update', { salaId, audioMuted: newMuted, videoMuted });
    }
  }, [audioMuted, videoMuted, salaId]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream || sharingScreen) return;
    const videoTracks = stream.getVideoTracks();
    const newMuted = !videoMuted;
    videoTracks.forEach(t => { t.enabled = !newMuted; });
    setVideoMuted(newMuted);
    const sock = socketRef.current;
    if (sock && salaId) {
      sock.emit('media:update', { salaId, audioMuted, videoMuted: newMuted });
    }
  }, [videoMuted, audioMuted, sharingScreen, salaId]);

  const toggleScreen = useCallback(async () => {
    if (sharingScreen) {
      // Stop screen share — restore camera track
      const screenStream = screenStreamRef.current;
      screenStream?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;

      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) {
        for (const call of activeCallsRef.current.values()) {
          const sender = call.peerConnection
            ?.getSenders()
            .find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(cameraTrack);
        }
      }

      setSharingScreen(false);
      const sock = socketRef.current;
      if (sock && salaId) sock.emit('screen:stop', { salaId });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        for (const call of activeCallsRef.current.values()) {
          const sender = call.peerConnection
            ?.getSenders()
            .find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(screenTrack);
        }

        // When user stops via browser UI
        screenTrack.onended = () => {
          setSharingScreen(false);
          screenStreamRef.current = null;
          const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
          if (cameraTrack) {
            for (const call of activeCallsRef.current.values()) {
              const sender = call.peerConnection
                ?.getSenders()
                .find(s => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(cameraTrack);
            }
          }
          const sock = socketRef.current;
          if (sock && salaId) sock.emit('screen:stop', { salaId });
        };

        setSharingScreen(true);
        const sock = socketRef.current;
        if (sock && salaId) sock.emit('screen:start', { salaId });
      } catch {
        // User cancelled or permission denied — no-op
      }
    }
  }, [sharingScreen, salaId]);

  return {
    localStream,
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
