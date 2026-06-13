import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { resolveSalaAccess, deleteSala } from '../services/api';
import type { MensajePublico, SalaPublica } from '../services/api';
import { useRoomChat } from '../hooks/useRoomChat';
import { useParticipantVolumes } from '../hooks/useParticipantVolumes';
import { useSpeakingDetection } from '../hooks/useSpeakingDetection';
import { useWebRTC, type MediaJoinPreferences } from '../hooks/useWebRTC';
import { useAuthStore } from '../store/authStore';
import {
  salaShareCode, salaRoomPathFromSala, salaShareUrl, isCodigoInvitacion,
  formatMessageTime, validateMensajeTexto,
  getInitials, participantGradientFromUid,
} from '../utils/sala';
import type { UsuarioEnLinea } from '../hooks/useRoomChat';
import { getUserDisplayName } from '../utils/userDisplay';
import { preloadRoomSounds, roomSounds } from '../utils/roomSounds';
import ComingSoonButton from '../components/ComingSoonButton';
import LeaveRoomModal from '../components/LeaveRoomModal';
import EditRoomModal from '../components/EditRoomModal';
import MediaJoinModal from '../components/MediaJoinModal';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  IconArrowLeft, IconClock, IconExpand, IconLayoutGrid, IconLink,
  IconMessageSquare, IconMic, IconMonitorUp, IconMoreHorizontal,
  IconPhoneHangup, IconPlus, IconSend, IconSettings, IconUsers, IconVideo, IconVolume,
  IconVolumeX, IconX,
} from '../components/room/RoomIcons';

// ── Icons ──────────────────────────────────────────────────────────────────────

const iconBtnClass = 'relative w-9 h-9 rounded-[10px] flex items-center justify-center border-0 transition-colors';
const panelToggleClass = 'w-10 h-10 rounded-[12px] flex items-center justify-center border-0 transition-colors';
const controlBtnClass = 'flex flex-col items-center justify-center gap-1 min-w-[48px] sm:min-w-[56px] py-1.5 px-0.5 sm:px-1 border-0 bg-transparent shrink-0';
const exitBtnClass = 'flex flex-col items-center justify-center gap-1 min-w-[48px] sm:min-w-[56px] py-1.5 px-1.5 sm:px-2 rounded-[14px] border-0 cursor-pointer shrink-0';

function IconBtn({ children, active, badge, onClick, label, comingSoon }: {
  children: React.ReactNode; active?: boolean; badge?: number;
  onClick?: () => void; label: string; comingSoon?: boolean;
}) {
  const style = {
    background: active ? 'rgba(99,102,241,0.18)' : 'rgba(148,163,184,0.08)',
    color: active ? '#818CF8' : '#94A3B8',
  };

  const badgeEl = badge != null && badge > 0 ? (
    <span
      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
      style={{ background: '#6366F1', color: '#fff' }}
    >
      {badge > 9 ? '9+' : badge}
    </span>
  ) : null;

  if (comingSoon) {
    return (
      <ComingSoonButton label={label} className={iconBtnClass} style={style}>
        {children}
        {badgeEl}
      </ComingSoonButton>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${iconBtnClass} cursor-pointer`}
      style={style}
    >
      {children}
      {badgeEl}
    </button>
  );
}

function ControlBtn({ label, children, comingSoon = true, onClick, active }: {
  label: string; children: React.ReactNode; comingSoon?: boolean;
  onClick?: () => void; active?: boolean;
}) {
  if (comingSoon) {
    return (
      <ComingSoonButton
        label={label}
        className={controlBtnClass}
        style={{ cursor: 'not-allowed', opacity: 0.85, color: '#CBD5E1' }}
      >
        {children}
        <span className="text-[11px] font-medium leading-none" style={{ color: '#94A3B8' }}>{label}</span>
      </ComingSoonButton>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${controlBtnClass} cursor-pointer`}
      style={{ color: active ? '#F87171' : '#CBD5E1' }}
    >
      {children}
      <span className="text-[11px] font-medium leading-none" style={{ color: active ? '#F87171' : '#94A3B8' }}>{label}</span>
    </button>
  );
}

function PanelToggle({ label, active, onClick, children, comingSoon }: {
  label: string; active?: boolean; onClick?: () => void; children: React.ReactNode; comingSoon?: boolean;
}) {
  const style = {
    background: active ? 'rgba(99,102,241,0.14)' : 'rgba(148,163,184,0.06)',
    border: `1px solid ${active ? 'rgba(99,102,241,0.28)' : 'rgba(148,163,184,0.12)'}`,
    color: active ? '#818CF8' : '#94A3B8',
  };
  if (comingSoon) {
    return (
      <ComingSoonButton label={label} className={panelToggleClass} style={style}>
        {children}
      </ComingSoonButton>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`${panelToggleClass} cursor-pointer`} style={style}>
      {children}
    </button>
  );
}

function ParticipantAvatar({ usuario, size = 72 }: { usuario: UsuarioEnLinea; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(usuario.nombre);
  const gradient = participantGradientFromUid(usuario.uid);
  const avatarUrl = usuario.avatar?.trim();

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setImgError(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{
          width: size,
          height: size,
          boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.12)',
        }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: gradient,
        boxShadow: 'inset -6px -6px 16px rgba(0,0,0,0.35), inset 3px 3px 10px rgba(255,255,255,0.12)',
      }}
    >
      <span
        className="font-bold select-none"
        style={{
          fontSize: size * 0.32,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '-0.03em',
        }}
      >
        {initials}
      </span>
    </div>
  );
}

type ParticipantGridItem = {
  uid: string;
  usuario: UsuarioEnLinea;
  isYou: boolean;
  isHost: boolean;
  stream: MediaStream | null;
  isScreenShare: boolean;
  audioMuted: boolean;
  videoMuted: boolean;
  streamVersion: number;
};

function getParticipantGridClasses(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  if (count === 4) return 'grid-cols-2';
  if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
}

function getThumbnailStripClasses(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  return 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6';
}

function VideoTile({
  stream,
  muted,
  volume = 1,
  objectFit = 'cover',
  hidden = false,
}: {
  stream: MediaStream;
  muted: boolean;
  volume?: number;
  objectFit?: 'cover' | 'contain';
  hidden?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = muted ? 0 : Math.min(1, Math.max(0, volume));
  }, [muted, volume]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const boundTracks = new Set<MediaStreamTrack>();

    const playLive = () => {
      if (document.visibilityState !== 'visible' || !stream.active) return;
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.volume = muted ? 0 : Math.min(1, Math.max(0, volume));
      if (el.paused || el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        void el.play().catch(() => {});
      }
    };

    const bindTrack = (track: MediaStreamTrack) => {
      if (boundTracks.has(track)) return;
      boundTracks.add(track);
      track.addEventListener('unmute', playLive);
      track.addEventListener('mute', playLive);
    };

    const onAddTrack = (event: MediaStreamTrackEvent) => {
      bindTrack(event.track);
      playLive();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        window.requestAnimationFrame(playLive);
      }
    };

    stream.getTracks().forEach(bindTrack);
    stream.addEventListener('addtrack', onAddTrack);
    stream.addEventListener('removetrack', playLive);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);

    playLive();

    return () => {
      stream.removeEventListener('addtrack', onAddTrack);
      stream.removeEventListener('removetrack', playLive);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
      for (const track of boundTracks) {
        track.removeEventListener('unmute', playLive);
        track.removeEventListener('mute', playLive);
      }
    };
  }, [stream, muted, volume]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      aria-hidden={hidden}
      className={`absolute inset-0 w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}${hidden ? ' opacity-0 pointer-events-none' : ''}`}
    />
  );
}

function ParticipantTile({
  usuario,
  isYou,
  isHost,
  compact = false,
  stream,
  videoMuted,
  audioMuted,
  isScreenShare = false,
  objectFit = 'cover',
  focused = false,
  isSpeaking = false,
  volume = 1,
  onToggleFocus,
}: {
  usuario: UsuarioEnLinea;
  isYou: boolean;
  isHost: boolean;
  compact?: boolean;
  stream?: MediaStream | null;
  videoMuted?: boolean;
  audioMuted?: boolean;
  isScreenShare?: boolean;
  objectFit?: 'cover' | 'contain';
  focused?: boolean;
  isSpeaking?: boolean;
  volume?: number;
  onToggleFocus?: () => void;
}) {
  const gradient = participantGradientFromUid(usuario.uid);
  const avatarSize = compact ? 44 : 64;
  const showVideo = !!stream && !videoMuted;
  const tileBackground = showVideo ? '#0B1220' : gradient;

  const tileStyle = {
    background: tileBackground,
    border: isSpeaking
      ? '2px solid rgba(35,165,89,0.95)'
      : focused && isScreenShare
        ? '2px solid rgba(52,211,153,0.9)'
        : isHost
          ? '2px solid rgba(129,140,248,0.85)'
          : '1px solid rgba(148,163,184,0.12)',
    boxShadow: isSpeaking
      ? '0 0 0 3px rgba(35,165,89,0.35), 0 0 24px rgba(35,165,89,0.45)'
      : focused && isScreenShare
        ? '0 0 28px rgba(52,211,153,0.35)'
        : isHost
          ? '0 0 28px rgba(99,102,241,0.35)'
          : 'none',
    transition: 'border 0.15s ease, box-shadow 0.15s ease',
  };

  const tileClass = [
    'relative w-full h-full rounded-[12px] sm:rounded-[14px] overflow-hidden flex items-end',
    compact ? 'p-2' : 'p-3 sm:p-3.5',
    isScreenShare && showVideo ? 'min-h-[140px] sm:min-h-0 aspect-video sm:aspect-auto' : 'min-h-[72px]',
    onToggleFocus ? 'cursor-pointer' : '',
  ].join(' ');

  const inner = (
    <>
      {/* Grid texture — only visible when no video */}
      {!showVideo && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {/* Video stream — oculto cuando la cámara está apagada, pero activo para audio remoto */}
      {stream && showVideo && (
        <VideoTile
          stream={stream}
          muted={isYou}
          volume={isYou ? 1 : volume}
          objectFit={objectFit}
        />
      )}
      {stream && !showVideo && !isYou && (
        <VideoTile
          stream={stream}
          muted={false}
          volume={volume}
          objectFit={objectFit}
          hidden
        />
      )}

      {/* Avatar fallback when no video */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <ParticipantAvatar usuario={usuario} size={avatarSize} />
        </div>
      )}

      {/* Screen share badge */}
      {isScreenShare && showVideo && (
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] pointer-events-none"
          style={{ background: 'rgba(16,185,129,0.85)', color: '#ECFDF5' }}
        >
          <IconMonitorUp size={11} strokeWidth={2.5} />
          <span className="text-[10px] font-semibold">Pantalla</span>
        </div>
      )}

      {/* Mute indicator */}
      {audioMuted && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.85)' }}
          title="Micrófono silenciado"
        >
          <IconMic size={11} strokeWidth={2.5} />
        </div>
      )}

      {/* Expand / collapse screen share */}
      {isScreenShare && onToggleFocus && (
        <div
          className="absolute bottom-2 right-2 w-6 h-6 sm:bottom-2.5 sm:right-2.5 sm:w-7 sm:h-7 rounded-[8px] flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#CBD5E1' }}
          title={focused ? 'Reducir pantalla' : 'Ampliar pantalla'}
        >
          <IconExpand size={13} strokeWidth={2} />
        </div>
      )}

      {/* Name label */}
      <div className="relative z-10 flex items-center gap-1.5 min-w-0 max-w-full">
        <span
          className={`font-medium px-1.5 sm:px-2 py-0.5 rounded-[6px] truncate max-w-full ${compact ? 'text-[10px] sm:text-[11px]' : 'text-[12px] sm:text-[12.5px]'}`}
          style={{ background: 'rgba(0,0,0,0.5)', color: '#F8FAFC' }}
        >
          {isYou ? 'Tú' : isHost ? 'Host' : usuario.nombre}
          {isHost && isYou && (
            <span className="ml-1.5 text-[10px] font-bold tracking-wide" style={{ color: '#A5B4FC' }}>
              HOST
            </span>
          )}
        </span>
      </div>
    </>
  );

  if (onToggleFocus) {
    return (
      <button
        type="button"
        aria-label={focused ? 'Reducir pantalla compartida' : 'Ampliar pantalla compartida'}
        onClick={onToggleFocus}
        className={`${tileClass} border-0 text-left`}
        style={tileStyle}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={tileClass} style={tileStyle}>
      {inner}
    </div>
  );
}

function renderParticipantTile(
  item: ParticipantGridItem,
  options: {
    compact?: boolean;
    focused?: boolean;
    isSpeaking?: boolean;
    volume?: number;
    onToggleFocus?: () => void;
  } = {},
) {
  const objectFit = 'contain';
  return (
    <ParticipantTile
      key={`${item.uid}-${item.streamVersion}`}
      usuario={item.usuario}
      isYou={item.isYou}
      isHost={item.isHost}
      compact={options.compact}
      stream={item.stream}
      audioMuted={item.audioMuted}
      videoMuted={item.videoMuted}
      isScreenShare={item.isScreenShare}
      objectFit={objectFit}
      focused={options.focused}
      isSpeaking={options.isSpeaking}
      volume={options.volume}
      onToggleFocus={options.onToggleFocus}
    />
  );
}

function RoomChatAside({
  className,
  onClose,
  mensajes,
  chatReady,
  chatError,
  myUid,
  draft,
  onDraftChange,
  onSend,
  sending,
  inputRef,
  messagesEndRef,
}: {
  className: string;
  onClose: () => void;
  mensajes: MensajePublico[];
  chatReady: boolean;
  chatError: string | null;
  myUid: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (e?: React.FormEvent) => void;
  sending: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <aside
      className={`flex flex-col min-h-0 ${className}`}
      style={{ background: '#0D1526', borderLeft: '1px solid rgba(148,163,184,0.1)' }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        className="flex items-center justify-between px-4 py-3.5 flex-none"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold">Chat</span>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(99,102,241,0.22)', color: '#A5B4FC' }}
          >
            {mensajes.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center cursor-pointer border-0"
          style={{ background: 'rgba(148,163,184,0.08)', color: '#64748B' }}
          aria-label="Cerrar chat"
        >
          <IconX size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensajes del chat">
        {chatError && (
          <p role="alert" className="m-0 text-center text-[12px] px-3 py-2 rounded-[10px]" style={{ color: '#F87171', background: 'rgba(127,29,29,0.2)' }}>
            {chatError}
          </p>
        )}
        {!chatReady && !chatError && (
          <p className="m-0 text-center text-[13px] py-6" style={{ color: '#64748B' }}>
            Conectando chat en tiempo real…
          </p>
        )}
        {mensajes.length === 0 && chatReady && (
          <p className="m-0 text-center text-[13px] py-8" style={{ color: '#475569' }}>
            Aún no hay mensajes. ¡Sé el primero en escribir!
          </p>
        )}
        {mensajes.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} isOwn={msg.uid === myUid} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={onSend}
        className="flex items-center gap-2 px-3 py-3 flex-none"
        style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}
      >
        <ComingSoonButton
          label="Adjuntar"
          className="w-8 h-8 rounded-full flex items-center justify-center border-0 flex-none"
          style={{ background: 'rgba(148,163,184,0.1)', color: '#64748B' }}
        >
          <IconPlus size={16} />
        </ComingSoonButton>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Escribe un mensaje..."
          aria-label="Escribe un mensaje"
          maxLength={2000}
          disabled={!chatReady}
          className="flex-1 px-3.5 py-2.5 rounded-full text-[13px] outline-none"
          style={{
            background: '#111827',
            color: '#F8FAFC',
            border: '1px solid rgba(148,163,184,0.15)',
          }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim() || !chatReady}
          aria-label="Enviar mensaje"
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-0 flex-none transition-opacity"
          style={{
            background: sending || !draft.trim() ? 'rgba(99,102,241,0.35)' : '#6366F1',
            color: '#fff',
            opacity: sending || !draft.trim() ? 0.6 : 1,
          }}
        >
          <IconSend size={15} />
        </button>
      </form>
    </aside>
  );
}

function ScreenShareFullscreenOverlay({
  item,
  onClose,
  chatOpen,
  onToggleChat,
  messageCount,
}: {
  item: ParticipantGridItem;
  onClose: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  messageCount: number;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (chatOpen) onToggleChat();
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, chatOpen, onToggleChat]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const sharerLabel = item.isYou ? 'Tu pantalla' : item.usuario.nombre;
  const controlsOffset = 'calc(5.5rem + env(safe-area-inset-bottom, 0px))';

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: '#000' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Pantalla compartida de ${sharerLabel}`}
    >
      <button
        type="button"
        className="absolute inset-x-0 top-0 z-0 border-0 cursor-pointer p-0"
        style={{ background: 'transparent', bottom: controlsOffset }}
        onClick={onClose}
        aria-label="Salir de pantalla completa"
      />

      <div
        className={`absolute top-0 left-0 z-10 pointer-events-none transition-[right] duration-200 ${chatOpen ? 'right-0 sm:right-[340px]' : 'right-0'}`}
        style={{ bottom: controlsOffset }}
      >
        {item.stream && <VideoTile stream={item.stream} muted objectFit="contain" />}
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5 cf-app-header-pt pb-3 pointer-events-none">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[10px] pointer-events-auto"
          style={{ background: 'rgba(0,0,0,0.72)', color: '#F8FAFC' }}
        >
          <IconMonitorUp size={16} strokeWidth={2} />
          <span className="text-[13px] sm:text-[14px] font-semibold truncate max-w-[50vw] sm:max-w-none">
            {sharerLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleChat();
            }}
            className="relative w-10 h-10 rounded-[10px] flex items-center justify-center cursor-pointer border-0 flex-none"
            style={{
              background: chatOpen ? 'rgba(99,102,241,0.85)' : 'rgba(0,0,0,0.72)',
              color: '#F8FAFC',
            }}
            aria-label={chatOpen ? 'Cerrar chat' : 'Abrir chat'}
          >
            <IconMessageSquare size={18} />
            {messageCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#6366F1', color: '#fff' }}
              >
                {messageCount > 9 ? '9+' : messageCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center cursor-pointer border-0 flex-none"
            style={{ background: 'rgba(0,0,0,0.72)', color: '#F8FAFC' }}
            aria-label="Salir de pantalla completa"
          >
            <IconX size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoStage({
  items,
  speakingUids,
  getVolume,
  onToggleScreenFocus,
}: {
  items: ParticipantGridItem[];
  speakingUids: ReadonlySet<string>;
  getVolume: (uid: string) => number;
  onToggleScreenFocus: (uid: string) => void;
}) {
  const screenSharers = items.filter((p) => p.isScreenShare && p.stream && !p.videoMuted);

  if (screenSharers.length >= 2) {
    const cameras = items.filter((p) => !p.isScreenShare || !p.stream || p.videoMuted);
    const stageGridClass = screenSharers.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

    return (
      <div className="flex flex-col h-full min-h-0 gap-2">
        <div className={`flex-1 min-h-0 grid gap-2 auto-rows-fr ${stageGridClass}`}>
          {screenSharers.map((item) => (
            <div key={`${item.uid}-${item.streamVersion}`} className="min-h-[160px] sm:min-h-0 h-full">
              {renderParticipantTile(item, {
                isSpeaking: speakingUids.has(item.uid),
                volume: getVolume(item.uid),
                onToggleFocus: () => onToggleScreenFocus(item.uid),
              })}
            </div>
          ))}
        </div>
        {cameras.length > 0 && (
          <div className={`grid gap-2 flex-none h-[72px] sm:h-[88px] min-h-[72px] ${getThumbnailStripClasses(cameras.length)}`}>
            {cameras.map((item) => (
              <div key={`${item.uid}-${item.streamVersion}`} className="min-w-0 h-full">
                {renderParticipantTile(item, {
                  compact: true,
                  isSpeaking: speakingUids.has(item.uid),
                  volume: getVolume(item.uid),
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`grid h-full min-h-0 w-full gap-2 sm:gap-2.5 auto-rows-fr ${getParticipantGridClasses(items.length)}`}>
      {items.map((item) => (
        <div key={`${item.uid}-${item.streamVersion}`} className="min-h-0 h-full min-w-0">
          {renderParticipantTile(item, {
            isSpeaking: speakingUids.has(item.uid),
            volume: getVolume(item.uid),
            onToggleFocus: item.isScreenShare && item.stream && !item.videoMuted
              ? () => onToggleScreenFocus(item.uid)
              : undefined,
          })}
        </div>
      ))}
    </div>
  );
}

function ParticipantSidebarRow({
  usuario, isYou, isHost, volume, onVolumeChange,
}: {
  usuario: UsuarioEnLinea;
  isYou: boolean;
  isHost: boolean;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
}) {
  const label = isYou ? 'Tú' : isHost ? 'Host' : usuario.nombre;
  const showVolume = !isYou && volume != null && onVolumeChange != null;
  const volumePercent = Math.round((volume ?? 1) * 100);
  const isSilent = showVolume && volumePercent === 0;

  return (
    <div
      className="flex flex-col gap-2 px-3 py-2.5 rounded-[10px]"
      style={{
        background: 'rgba(148,163,184,0.06)',
        border: isHost ? '1px solid rgba(129,140,248,0.35)' : '1px solid rgba(148,163,184,0.1)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <ParticipantAvatar usuario={usuario} size={36} />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-medium truncate" style={{ color: '#F8FAFC' }}>
            {label}
            {isHost && isYou && (
              <span className="ml-1.5 text-[10px] font-bold tracking-wide" style={{ color: '#A5B4FC' }}>
                HOST
              </span>
            )}
          </p>
          {isHost && !isYou && (
            <p className="m-0 mt-0.5 text-[11px] font-semibold tracking-wide" style={{ color: '#A5B4FC' }}>
              HOST
            </p>
          )}
        </div>
        {showVolume && (
          <span style={{ color: isSilent ? '#F87171' : '#64748B' }} aria-hidden="true">
            {isSilent ? <IconVolumeX size={14} /> : <IconVolume size={14} />}
          </span>
        )}
      </div>
      {showVolume && (
        <div className="flex items-center gap-2 pl-[48px]">
          <label className="cf-sr-only" htmlFor={`volume-${usuario.uid}`}>
            Volumen de {usuario.nombre}
          </label>
          <input
            id={`volume-${usuario.uid}`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={volumePercent}
            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
            className="flex-1 h-1.5 cursor-pointer accent-[#818CF8]"
            style={{ minWidth: 0 }}
          />
          <span
            className="text-[10px] font-medium tabular-nums w-9 text-right flex-none"
            style={{ color: isSilent ? '#F87171' : '#64748B' }}
          >
            {volumePercent}%
          </span>
        </div>
      )}
    </div>
  );
}

function ChatMessage({ msg, isOwn }: { msg: MensajePublico; isOwn: boolean }) {
  const avatarColor = participantGradientFromUid(msg.uid);
  const initials = getInitials(msg.username);

  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2.5 max-w-[88%] min-w-0 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-none mt-0.5"
          style={{ background: avatarColor, color: '#fff' }}
        >
          {initials}
        </div>
        <div className={`flex flex-col min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-[12.5px] font-semibold" style={{ color: isOwn ? '#A5B4FC' : '#E2E8F0' }}>
              {isOwn ? 'Tú' : msg.username}
            </span>
            <span className="text-[11px]" style={{ color: '#475569' }}>
              {formatMessageTime(msg.createdAt)}
            </span>
          </div>
          <div
            className="px-3 py-2 rounded-[12px] text-[13px] leading-relaxed max-w-full break-words"
            style={{
              background: isOwn ? 'rgba(99,102,241,0.15)' : '#1E293B',
              color: '#E2E8F0',
              border: isOwn ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(148,163,184,0.1)',
            }}
          >
            {msg.texto}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoomPage() {
  const { code: routeCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const jwtToken = useAuthStore(s => s.jwtToken);
  const user = useAuthStore(s => s.user);

  const [sala, setSala] = useState<SalaPublica | null>(null);
  const salaId = sala?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [elapsed, setElapsed] = useState('00:00');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showMediaJoinModal, setShowMediaJoinModal] = useState(false);
  const [mediaPreferences, setMediaPreferences] = useState<MediaJoinPreferences | null>(null);
  const [joiningMedia, setJoiningMedia] = useState(false);
  const [focusedScreenUid, setFocusedScreenUid] = useState<string | null>(null);

  const skipSalaTerminadaRef = useRef(false);
  const prevScreenSharerCountRef = useRef(0);
  const roomSoundsReadyRef = useRef(false);
  const prevParticipantUidsRef = useRef<string[]>([]);
  const prevAudioMutedRef = useRef(false);
  const prevVideoMutedRef = useRef(false);
  const prevRemoteMediaRef = useRef<Map<string, { audioMuted: boolean; videoMuted: boolean }>>(new Map());
  const prevScreenSharersRef = useRef<Set<string>>(new Set());
  const prevMensajesCountRef = useRef(0);
  const chatHistoryLoadedRef = useRef(false);

  usePageTitle(sala?.nombre ? `Sala: ${sala.nombre}` : 'Sala de estudio');

  const handleSalaTerminada = useCallback((mensaje: string) => {
    if (skipSalaTerminadaRef.current) return;
    toast.info(mensaje);
    navigate('/dashboard');
  }, [navigate]);

  const { mensajes, usuariosEnLinea, chatReady, chatError, sendMensaje } = useRoomChat(
    salaId,
    jwtToken ?? null,
    { onSalaTerminada: handleSalaTerminada },
  );

  const myUid = user?.id ?? '';

  const {
    localStream,
    screenStream,
    remoteStreams,
    audioMuted,
    videoMuted,
    sharingScreen,
    webrtcError,
    webrtcReady,
    toggleAudio,
    toggleVideo,
    toggleScreen,
  } = useWebRTC(salaId, jwtToken ?? null, myUid, mediaPreferences);

  useEffect(() => {
    if (webrtcError) toast.error(`WebRTC: ${webrtcError}`);
  }, [webrtcError]);

  useEffect(() => {
    setMediaPreferences(null);
    setShowMediaJoinModal(false);
    setJoiningMedia(false);
  }, [routeCode]);

  useEffect(() => {
    if (!loading && sala && !error && mediaPreferences === null && !joiningMedia) {
      setShowMediaJoinModal(true);
    }
  }, [loading, sala, error, mediaPreferences, joiningMedia]);

  useEffect(() => {
    if (!joiningMedia) return;
    if (webrtcReady) {
      setJoiningMedia(false);
      setShowMediaJoinModal(false);
      return;
    }
    if (webrtcError) {
      setJoiningMedia(false);
      setShowMediaJoinModal(false);
    }
  }, [joiningMedia, webrtcReady, webrtcError]);

  function handleMediaJoinChoice(preferences: MediaJoinPreferences) {
    setMediaPreferences(preferences);
    setJoiningMedia(true);
  }

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(Date.now());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [mensajes, scrollToBottom]);

  useEffect(() => {
    const t = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!routeCode || !jwtToken) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const salaData = await resolveSalaAccess(jwtToken, routeCode);
        if (!cancelled) setSala(salaData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la sala.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [routeCode, jwtToken]);

  useEffect(() => {
    if (!sala || !routeCode) return;
    const shareCode = salaShareCode(sala);
    const parsed = decodeURIComponent(routeCode).trim().toUpperCase();
    if (!isCodigoInvitacion(parsed) || parsed !== shareCode) {
      navigate(salaRoomPathFromSala(sala), { replace: true });
    }
  }, [sala, routeCode, navigate]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!salaId || sending || !chatReady) return;
    const validation = validateMensajeTexto(draft);
    if (validation) { toast.error(validation); return; }
    setSending(true);
    const texto = draft.trim();
    setDraft('');
    try {
      const res = await sendMensaje(texto);
      if (res.ok === false) { setDraft(texto); toast.error(res.error); }
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  const participantesOrdenados = useMemo(() => {
    if (!sala) return [];
    const list: UsuarioEnLinea[] = [...usuariosEnLinea];
    if (user && !list.some((u) => u.uid === user.id)) {
      list.push({
        uid: user.id,
        nombre: getUserDisplayName(user),
        avatar: user.avatar ?? null,
      });
    }
    for (const uid of remoteStreams.keys()) {
      if (!list.some((u) => u.uid === uid)) {
        const known = usuariosEnLinea.find((u) => u.uid === uid);
        list.push(known ?? { uid, nombre: 'Participante', avatar: null });
      }
    }
    return list.sort((a, b) => {
      if (a.uid === sala.creadorUid) return -1;
      if (b.uid === sala.creadorUid) return 1;
      if (a.uid === myUid) return -1;
      if (b.uid === myUid) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [usuariosEnLinea, remoteStreams, sala, myUid, user]);

  const gridItems = useMemo((): ParticipantGridItem[] => {
    if (!sala) return [];
    return participantesOrdenados.map((u) => {
      const isYou = u.uid === myUid;
      const remote = remoteStreams.get(u.uid);
      const isScreenShare = isYou
        ? sharingScreen
        : (remote?.sharingScreen ?? false);
      const stream = isYou
        ? (sharingScreen && screenStream ? screenStream : localStream)
        : (remote?.stream ?? null);
      return {
        uid: u.uid,
        usuario: u,
        isYou,
        isHost: u.uid === sala.creadorUid,
        stream,
        isScreenShare,
        audioMuted: isYou ? audioMuted : (remote?.audioMuted ?? false),
        videoMuted: isYou
          ? (sharingScreen ? false : videoMuted)
          : (remote?.sharingScreen ? false : (remote?.videoMuted ?? false)),
        streamVersion: remote?.streamVersion ?? 0,
      };
    });
  }, [
    participantesOrdenados,
    sala,
    myUid,
    remoteStreams,
    sharingScreen,
    screenStream,
    localStream,
    audioMuted,
    videoMuted,
  ]);

  const screenSharerUids = useMemo(
    () => gridItems
      .filter((p) => p.isScreenShare && p.stream && !p.videoMuted)
      .map((p) => p.uid),
    [gridItems],
  );

  const speakingSources = useMemo(
    () => gridItems.map((item) => ({
      uid: item.uid,
      stream: item.isYou ? localStream : item.stream,
      audioMuted: item.audioMuted,
    })),
    [gridItems, localStream],
  );

  const speakingUids = useSpeakingDetection(speakingSources);
  const { getVolume, setVolume } = useParticipantVolumes();

  useEffect(() => {
    roomSoundsReadyRef.current = false;
    prevParticipantUidsRef.current = [];
    prevAudioMutedRef.current = false;
    prevVideoMutedRef.current = false;
    prevRemoteMediaRef.current = new Map();
    prevScreenSharersRef.current = new Set();
    prevMensajesCountRef.current = 0;
    chatHistoryLoadedRef.current = false;
  }, [salaId]);

  useEffect(() => {
    if (!chatReady) return;
    preloadRoomSounds();
    const timer = window.setTimeout(() => { roomSoundsReadyRef.current = true; }, 800);
    return () => window.clearTimeout(timer);
  }, [chatReady]);

  useEffect(() => {
    const uids = usuariosEnLinea.map((u) => u.uid);
    const prev = prevParticipantUidsRef.current;
    if (!roomSoundsReadyRef.current) {
      prevParticipantUidsRef.current = uids;
      return;
    }
    const joined = uids.filter((id) => !prev.includes(id) && id !== myUid);
    const left = prev.filter((id) => !uids.includes(id) && id !== myUid);
    joined.forEach(() => roomSounds.userJoined());
    left.forEach(() => roomSounds.userLeft());
    prevParticipantUidsRef.current = uids;
  }, [usuariosEnLinea, myUid]);

  useEffect(() => {
    if (!roomSoundsReadyRef.current) {
      prevAudioMutedRef.current = audioMuted;
      prevVideoMutedRef.current = videoMuted;
      return;
    }
    if (audioMuted && !prevAudioMutedRef.current) roomSounds.mediaMuted();
    if (!audioMuted && prevAudioMutedRef.current) roomSounds.mediaUnmuted();
    if (videoMuted && !prevVideoMutedRef.current) roomSounds.mediaMuted();
    if (!videoMuted && prevVideoMutedRef.current) roomSounds.mediaUnmuted();
    prevAudioMutedRef.current = audioMuted;
    prevVideoMutedRef.current = videoMuted;
  }, [audioMuted, videoMuted]);

  useEffect(() => {
    if (!roomSoundsReadyRef.current) {
      const map = new Map<string, { audioMuted: boolean; videoMuted: boolean }>();
      remoteStreams.forEach((state, uid) => {
        map.set(uid, { audioMuted: state.audioMuted, videoMuted: state.videoMuted });
      });
      prevRemoteMediaRef.current = map;
      return;
    }
    remoteStreams.forEach((state, uid) => {
      const prev = prevRemoteMediaRef.current.get(uid);
      if (!prev) return;
      if (state.audioMuted && !prev.audioMuted) roomSounds.mediaMuted();
      if (!state.audioMuted && prev.audioMuted) roomSounds.mediaUnmuted();
      if (state.videoMuted && !prev.videoMuted) roomSounds.mediaMuted();
      if (!state.videoMuted && prev.videoMuted) roomSounds.mediaUnmuted();
    });
    const map = new Map<string, { audioMuted: boolean; videoMuted: boolean }>();
    remoteStreams.forEach((state, uid) => {
      map.set(uid, { audioMuted: state.audioMuted, videoMuted: state.videoMuted });
    });
    prevRemoteMediaRef.current = map;
  }, [remoteStreams]);

  useEffect(() => {
    const current = new Set(screenSharerUids);
    if (!roomSoundsReadyRef.current) {
      prevScreenSharersRef.current = current;
      return;
    }
    for (const uid of current) {
      if (!prevScreenSharersRef.current.has(uid)) {
        roomSounds.screenShare();
      }
    }
    prevScreenSharersRef.current = current;
  }, [screenSharerUids]);

  useEffect(() => {
    if (!chatReady) return;
    const count = mensajes.length;
    if (!chatHistoryLoadedRef.current) {
      chatHistoryLoadedRef.current = true;
      prevMensajesCountRef.current = count;
      return;
    }
    if (count > prevMensajesCountRef.current) {
      roomSounds.messageSent();
    }
    prevMensajesCountRef.current = count;
  }, [mensajes, chatReady]);

  useEffect(() => {
    const count = screenSharerUids.length;
    const prev = prevScreenSharerCountRef.current;
    prevScreenSharerCountRef.current = count;

    if (count === 0) {
      setFocusedScreenUid(null);
      return;
    }
    if (count === 1 && (prev === 0 || prev >= 2)) {
      setFocusedScreenUid(screenSharerUids[0]);
      return;
    }
    if (count >= 2 && prev < 2) {
      setFocusedScreenUid(null);
      return;
    }
    setFocusedScreenUid((current) =>
      current && screenSharerUids.includes(current) ? current : null,
    );
  }, [screenSharerUids]);

  const toggleScreenFocus = useCallback((uid: string) => {
    setFocusedScreenUid((current) => (current === uid ? null : uid));
  }, []);

  const focusedScreenItem = useMemo(
    () => (focusedScreenUid
      ? gridItems.find((p) => p.uid === focusedScreenUid && p.isScreenShare && p.stream && !p.videoMuted) ?? null
      : null),
    [focusedScreenUid, gridItems],
  );

  const hostNombre = useMemo(() => {
    const host = participantesOrdenados.find(u => u.uid === sala?.creadorUid);
    if (host) return host.nombre.split(' ')[0] + '.';
    return 'Anfitrión';
  }, [participantesOrdenados, sala]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#080E1A' }}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Cargando sala"
      >
        <svg className="w-8 h-8 animate-spin" style={{ color: '#818CF8' }} fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="cf-sr-only">Cargando sala…</span>
      </div>
    );
  }

  if (error || !sala) {
    return (
      <main id="main" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: '#080E1A', color: '#F8FAFC' }}>
        <p className="m-0" role="alert">{error ?? 'Sala no encontrada.'}</p>
        <button type="button" onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-[10px] text-sm font-medium cursor-pointer text-white" style={{ background: '#6366F1' }}>
          Volver al inicio
        </button>
      </main>
    );
  }

  const roomCode = salaShareCode(sala);
  const onlineCount = usuariosEnLinea.length || sala.participantes.length;
  const isHost = sala.creadorUid === myUid;

  function handleLeaveRoom() {
    setShowLeaveModal(false);
    toast.success('Saliste de la sala.');
    navigate('/dashboard');
  }

  async function handleEndSession() {
    if (!jwtToken || !salaId) return;
    skipSalaTerminadaRef.current = true;
    await deleteSala(jwtToken, salaId);
    setShowLeaveModal(false);
    toast.success('Sesión terminada para todos los participantes.');
    navigate('/dashboard');
  }

  function handleOpenSettings() {
    if (isHost) {
      setShowEditRoomModal(true);
      return;
    }
    toast.info('Solo el anfitrión puede editar la configuración de la sala.');
  }

  function handleRoomUpdated(updated: SalaPublica) {
    setSala(updated);
  }

  function toggleChat() {
    setChatOpen(prev => {
      const next = !prev;
      if (next) setParticipantsOpen(false);
      return next;
    });
  }

  function toggleParticipants() {
    setParticipantsOpen(prev => {
      const next = !prev;
      if (next) setChatOpen(false);
      return next;
    });
  }

  function closeRightPanel() {
    setChatOpen(false);
    setParticipantsOpen(false);
  }

  const rightPanelOpen = chatOpen || participantsOpen;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#080E1A', color: '#F8FAFC' }}>
      <main id="main" className="flex flex-col flex-1 min-h-0">
      <header
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 cf-app-header-pt pb-2.5 sm:pb-3 flex-none"
        style={{ background: '#080E1A', borderBottom: '1px solid rgba(148,163,184,0.1)' }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          aria-label="Volver"
          className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer border-0 flex-none"
          style={{ background: 'rgba(148,163,184,0.08)', color: '#94A3B8' }}
        >
          <IconArrowLeft size={18} strokeWidth={2} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="m-0 text-[15px] font-semibold truncate" style={{ letterSpacing: '-0.01em' }}>
              {sala.nombre}
            </h1>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest flex-none"
              style={{ background: 'rgba(127,29,29,0.55)', color: '#FCA5A5', border: '1px solid rgba(248,113,113,0.4)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#F87171' }} />
              EN VIVO
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3 mt-0.5 text-[11.5px]" style={{ color: '#64748B' }}>
            <span>ID: <span style={{ color: '#94A3B8' }}>{roomCode}</span></span>
            <span>Host: <span style={{ color: '#94A3B8' }}>{hostNombre}</span></span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums" style={{ color: '#818CF8' }}>
              <IconClock size={12} strokeWidth={2} />
              {elapsed}
            </span>
          </div>
          <div className="flex md:hidden items-center gap-2 mt-0.5 text-[11px]" style={{ color: '#64748B' }}>
            <span className="font-mono tabular-nums truncate" style={{ color: '#818CF8' }}>{elapsed}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{onlineCount} en línea</span>
          </div>
        </div>

        {/* Header utility icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-none">
          <span className="hidden sm:contents">
            <IconBtn label="Cambiar diseño" comingSoon>
              <IconLayoutGrid size={16} />
            </IconBtn>
            <IconBtn
              label="Copiar enlace de la sala"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(salaShareUrl(sala));
                  toast.success('Enlace copiado.');
                } catch {
                  toast.error('No se pudo copiar el enlace.');
                }
              }}
            >
              <IconLink size={16} />
            </IconBtn>
            <IconBtn
              label="Participantes"
              badge={onlineCount}
              active={participantsOpen}
              onClick={toggleParticipants}
            >
              <IconUsers size={16} />
            </IconBtn>
          </span>
          <span className="sm:hidden">
            <IconBtn
              label="Participantes"
              badge={onlineCount}
              active={participantsOpen}
              onClick={toggleParticipants}
            >
              <IconUsers size={16} />
            </IconBtn>
          </span>
          <IconBtn label="Chat" active={chatOpen} badge={mensajes.length} onClick={toggleChat}>
            <IconMessageSquare size={16} />
          </IconBtn>
          <IconBtn label="Configuración" onClick={handleOpenSettings}>
            <IconSettings size={16} />
          </IconBtn>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 min-h-0">

        {/* Video + chat (above bottom bar) */}
        <div className="flex flex-1 min-h-0 relative">
          <main className="flex-1 min-w-0 min-h-0 overflow-hidden p-2 sm:p-3">
            {!chatReady && participantesOrdenados.length === 0 ? (
              <div className="h-full flex items-center justify-center rounded-[16px] py-16 sm:py-20" style={{ background: 'rgba(148,163,184,0.04)', border: '1px dashed rgba(148,163,184,0.15)' }}>
                <p className="m-0 text-[13px]" style={{ color: '#64748B' }}>Conectando participantes…</p>
              </div>
            ) : participantesOrdenados.length === 0 ? (
              <div className="h-full flex items-center justify-center rounded-[16px] py-16 sm:py-20" style={{ background: 'rgba(148,163,184,0.04)', border: '1px dashed rgba(148,163,184,0.15)' }}>
                <p className="m-0 text-[13px]" style={{ color: '#64748B' }}>Esperando participantes…</p>
              </div>
            ) : (
              <VideoStage
                items={gridItems}
                speakingUids={speakingUids}
                getVolume={getVolume}
                onToggleScreenFocus={toggleScreenFocus}
              />
            )}
          </main>

          {/* ── Right panel: chat or participants (mutually exclusive) ── */}
          {rightPanelOpen && !focusedScreenItem && (
            <>
              <button
                type="button"
                className="lg:hidden fixed inset-0 z-30 border-0 cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.55)' }}
                aria-label="Cerrar panel"
                onClick={closeRightPanel}
              />
              {participantsOpen ? (
                <aside
                  className="fixed inset-y-0 right-0 z-40 w-full max-w-[min(100vw,340px)] flex flex-col min-h-0 lg:static lg:z-auto lg:w-[340px] lg:max-w-none lg:flex-none"
                  style={{ background: '#0D1526', borderLeft: '1px solid rgba(148,163,184,0.1)' }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3.5 flex-none"
                    style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold">Participantes</span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(99,102,241,0.22)', color: '#A5B4FC' }}
                      >
                        {participantesOrdenados.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={closeRightPanel}
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center cursor-pointer border-0"
                      style={{ background: 'rgba(148,163,184,0.08)', color: '#64748B' }}
                      aria-label="Cerrar panel de participantes"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                    {participantesOrdenados.length === 0 ? (
                      <p className="m-0 text-center text-[13px] py-6" style={{ color: '#64748B' }}>
                        Nadie conectado aún.
                      </p>
                    ) : (
                      participantesOrdenados.map(u => (
                        <ParticipantSidebarRow
                          key={u.uid}
                          usuario={u}
                          isYou={u.uid === myUid}
                          isHost={u.uid === sala.creadorUid}
                          volume={u.uid === myUid ? undefined : getVolume(u.uid)}
                          onVolumeChange={u.uid === myUid ? undefined : (value) => setVolume(u.uid, value)}
                        />
                      ))
                    )}
                  </div>
                </aside>
              ) : (
                <RoomChatAside
                  className="fixed inset-y-0 right-0 z-40 w-full max-w-[min(100vw,340px)] lg:static lg:z-auto lg:w-[340px] lg:max-w-none lg:flex-none"
                  onClose={closeRightPanel}
                  mensajes={mensajes}
                  chatReady={chatReady}
                  chatError={chatError}
                  myUid={myUid}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={handleSend}
                  sending={sending}
                  inputRef={inputRef}
                  messagesEndRef={messagesEndRef}
                />
              )}
            </>
          )}
        </div>

        {/* Bottom bar — full width under video and chat */}
        <footer
          className={`flex flex-col items-center gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] flex-none sm:items-center px-3 sm:px-5 py-2.5 sm:py-3 pb-safe ${focusedScreenItem ? 'fixed bottom-0 left-0 right-0 z-[105]' : ''}`}
          style={{
            background: focusedScreenItem ? 'rgba(8,14,26,0.96)' : '#080E1A',
            borderTop: '1px solid rgba(148,163,184,0.08)',
            backdropFilter: focusedScreenItem ? 'blur(8px)' : undefined,
          }}
        >
          <div className="hidden sm:flex items-center gap-2.5 min-w-0 justify-self-start w-full">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full flex-none"
              style={{
                background: 'rgba(148,163,184,0.06)',
                border: '1px solid rgba(148,163,184,0.12)',
                color: '#94A3B8',
              }}
            >
              <IconUsers size={14} />
              <span className="text-[12px] font-medium tabular-nums">{onlineCount}</span>
            </div>
            <div className="w-px h-4 flex-none" style={{ background: 'rgba(148,163,184,0.18)' }} aria-hidden="true" />
            <span className="text-[12px] truncate" style={{ color: '#64748B' }}>
              ID · {roomCode}
            </span>
            <button
              type="button"
              onClick={async () => {
                try { await navigator.clipboard.writeText(salaShareUrl(sala)); toast.success('Enlace copiado.'); }
                catch { toast.error('No se pudo copiar.'); }
              }}
              className="cursor-pointer border-0 bg-transparent text-[12px] font-medium p-0 flex-none"
              style={{ color: '#818CF8' }}
            >
              Copiar
            </button>
          </div>

          <div
            className="flex items-center justify-center gap-0.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-[20px] w-auto max-w-full mx-auto sm:mx-0 sm:justify-self-center overflow-x-auto"
            style={{
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(148,163,184,0.14)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            <ControlBtn label={audioMuted ? 'Activar Mic' : 'Silenciar'} comingSoon={false} onClick={toggleAudio} active={audioMuted}>
              <IconMic size={20} strokeWidth={1.75} />
            </ControlBtn>
            <ControlBtn label={videoMuted ? 'Activar Cam' : 'Cámara'} comingSoon={false} onClick={toggleVideo} active={videoMuted}>
              <IconVideo size={20} strokeWidth={1.75} />
            </ControlBtn>
            <ControlBtn label={sharingScreen ? 'Detener' : 'Pantalla'} comingSoon={false} onClick={() => { void toggleScreen(); }} active={sharingScreen}>
              <IconMonitorUp size={20} strokeWidth={1.75} />
            </ControlBtn>
            <ControlBtn label="Más">
              <IconMoreHorizontal size={20} />
            </ControlBtn>
            <div className="w-px h-9 mx-1.5 flex-none" style={{ background: 'rgba(148,163,184,0.18)' }} aria-hidden="true" />
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              aria-label="Salir de la sala"
              className={exitBtnClass}
              style={{
                background: '#EF4444',
                color: '#fff',
                boxShadow: '0 0 22px rgba(239,68,68,0.38)',
              }}
            >
              <span style={{ transform: 'rotate(135deg)', display: 'inline-flex' }}>
                <IconPhoneHangup size={18} strokeWidth={2} />
              </span>
              <span className="text-[11px] font-semibold leading-none">Salir</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 justify-self-end">
            <PanelToggle
              label="Panel de participantes"
              active={participantsOpen}
              onClick={toggleParticipants}
            >
              <IconUsers size={17} />
            </PanelToggle>
            <PanelToggle label="Chat" active={chatOpen} onClick={toggleChat}>
              <IconMessageSquare size={17} />
            </PanelToggle>
          </div>
        </footer>
      </div>
      </main>

      <LeaveRoomModal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        salaNombre={sala.nombre}
        isHost={isHost}
        onLeaveRoom={handleLeaveRoom}
        onEndSession={handleEndSession}
      />

      <MediaJoinModal
        open={showMediaJoinModal}
        salaNombre={sala.nombre}
        loading={joiningMedia}
        onChoose={handleMediaJoinChoice}
      />

      {isHost && (
        <EditRoomModal
          open={showEditRoomModal}
          onClose={() => setShowEditRoomModal(false)}
          sala={sala}
          onUpdated={handleRoomUpdated}
        />
      )}

      {focusedScreenItem && (
        <>
          <ScreenShareFullscreenOverlay
            item={focusedScreenItem}
            onClose={() => setFocusedScreenUid(null)}
            chatOpen={chatOpen}
            onToggleChat={toggleChat}
            messageCount={mensajes.length}
          />
          {chatOpen && (
            <RoomChatAside
              className="fixed inset-y-0 right-0 z-[110] w-full max-w-[min(100vw,340px)]"
              onClose={toggleChat}
              mensajes={mensajes}
              chatReady={chatReady}
              chatError={chatError}
              myUid={myUid}
              draft={draft}
              onDraftChange={setDraft}
              onSend={handleSend}
              sending={sending}
              inputRef={inputRef}
              messagesEndRef={messagesEndRef}
            />
          )}
        </>
      )}
    </div>
  );
}
