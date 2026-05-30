import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getSala, joinSala } from '../services/api';
import type { MensajePublico, SalaPublica } from '../services/api';
import { useRoomChat } from '../hooks/useRoomChat';
import { useAuthStore } from '../store/authStore';
import {
  salaShareCode, formatMessageTime, validateMensajeTexto,
  getInitials, participantGradientFromUid,
} from '../utils/sala';
import type { UsuarioEnLinea } from '../hooks/useRoomChat';
import ComingSoonButton from '../components/ComingSoonButton';

// ── Icons ──────────────────────────────────────────────────────────────────────

const iconBtnClass = 'relative w-9 h-9 rounded-[10px] flex items-center justify-center border-0 transition-colors';
const floatingBtnClass = 'w-10 h-10 rounded-full flex items-center justify-center border-0';

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

function SphereAvatar({ uid, size = 72 }: { uid: string; size?: number }) {
  const grad = participantGradientFromUid(uid);
  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: grad,
        boxShadow: 'inset -8px -8px 20px rgba(0,0,0,0.35), inset 4px 4px 12px rgba(255,255,255,0.12)',
      }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 45%, transparent 70%)',
        }}
      />
    </div>
  );
}

function ParticipantTile({
  usuario, isYou, isHost,
}: {
  usuario: UsuarioEnLinea;
  isYou: boolean;
  isHost: boolean;
}) {
  const initials = getInitials(usuario.nombre);
  const gradient = participantGradientFromUid(usuario.uid);

  return (
    <div
      className="relative rounded-[16px] overflow-hidden flex items-end p-3.5 aspect-video"
      style={{
        background: gradient,
        border: isHost
          ? '2px solid rgba(129,140,248,0.85)'
          : '1px solid rgba(148,163,184,0.12)',
        boxShadow: isHost ? '0 0 28px rgba(99,102,241,0.35)' : 'none',
      }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Avatar sphere or initials */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isYou || isHost ? (
          <SphereAvatar uid={usuario.uid} size={80} />
        ) : (
          <span className="text-[42px] font-bold select-none" style={{ color: 'rgba(255,255,255,0.28)', letterSpacing: '-0.04em' }}>
            {initials}
          </span>
        )}
      </div>

      {/* Pop-out icon */}
      <ComingSoonButton
        label="Ampliar"
        className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-[8px] flex items-center justify-center border-0"
        style={{ background: 'rgba(0,0,0,0.45)', color: '#CBD5E1' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </ComingSoonButton>

      {/* Name label */}
      <div className="relative z-10 flex items-center gap-1.5">
        <span
          className="text-[12.5px] font-medium px-2 py-0.5 rounded-[6px]"
          style={{ background: 'rgba(0,0,0,0.5)', color: '#F8FAFC' }}
        >
          {usuario.nombre}
          {isHost && (
            <span className="ml-1.5 text-[10px] font-bold tracking-wide" style={{ color: '#A5B4FC' }}>
              HOST
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function ChatMessage({ msg, isOwn }: { msg: MensajePublico; isOwn: boolean }) {
  const avatarColor = participantGradientFromUid(msg.uid);
  const initials = getInitials(msg.username);

  return (
    <div className="flex gap-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-none mt-0.5"
        style={{ background: avatarColor, color: '#fff' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[12.5px] font-semibold" style={{ color: isOwn ? '#A5B4FC' : '#E2E8F0' }}>
            {msg.username}
          </span>
          <span className="text-[11px]" style={{ color: '#475569' }}>
            {formatMessageTime(msg.createdAt)}
          </span>
        </div>
        <div
          className="px-3 py-2 rounded-[12px] text-[13px] leading-relaxed inline-block max-w-full"
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
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jwtToken = useAuthStore(s => s.jwtToken);
  const user = useAuthStore(s => s.user);

  const [sala, setSala] = useState<SalaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [elapsed, setElapsed] = useState('00:00');

  const { mensajes, usuariosEnLinea, chatReady, chatError, sendMensaje } = useRoomChat(id, jwtToken ?? null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(Date.now());

  const myUid = user?.id ?? '';

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
    if (!id || !jwtToken) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let salaData: SalaPublica;
        try {
          salaData = await getSala(jwtToken, id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('acceso')) salaData = await joinSala(jwtToken, id);
          else throw err;
        }
        if (!cancelled) setSala(salaData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la sala.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, jwtToken]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!id || sending || !chatReady) return;
    const validation = validateMensajeTexto(draft);
    if (validation) { toast.error(validation); return; }
    setSending(true);
    const texto = draft.trim();
    setDraft('');
    try {
      const res = await sendMensaje(texto);
      if (!res.ok) { setDraft(texto); toast.error(res.error); }
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  const participantesOrdenados = useMemo(() => {
    if (!sala) return [];
    return [...usuariosEnLinea].sort((a, b) => {
      if (a.uid === sala.creadorUid) return -1;
      if (b.uid === sala.creadorUid) return 1;
      if (a.uid === myUid) return -1;
      if (b.uid === myUid) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [usuariosEnLinea, sala, myUid]);

  const hostNombre = useMemo(() => {
    const host = participantesOrdenados.find(u => u.uid === sala?.creadorUid);
    if (host) return host.nombre.split(' ')[0] + '.';
    return 'Anfitrión';
  }, [participantesOrdenados, sala]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080E1A' }}>
        <svg className="w-8 h-8 animate-spin" style={{ color: '#818CF8' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error || !sala) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: '#080E1A', color: '#F8FAFC' }}>
        <p className="m-0">{error ?? 'Sala no encontrada.'}</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-[10px] text-sm font-medium cursor-pointer text-white" style={{ background: '#6366F1' }}>
          Volver al inicio
        </button>
      </div>
    );
  }

  const roomCode = salaShareCode(sala);
  const onlineCount = usuariosEnLinea.length || sala.participantes.length;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#080E1A', color: '#F8FAFC' }}>

      {/* ── Header ── */}
      <header
        className="flex items-center gap-3 px-5 py-3 flex-none"
        style={{ background: 'rgba(8,14,26,0.95)', borderBottom: '1px solid rgba(148,163,184,0.1)' }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          aria-label="Volver"
          className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer border-0 flex-none"
          style={{ background: 'rgba(148,163,184,0.08)', color: '#94A3B8' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
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
          <div className="flex items-center gap-3 mt-0.5 text-[11.5px]" style={{ color: '#64748B' }}>
            <span>ID: <span style={{ color: '#94A3B8' }}>{roomCode}</span></span>
            <span>Anfitrión: <span style={{ color: '#94A3B8' }}>{hostNombre}</span></span>
            <span className="font-mono tabular-nums" style={{ color: '#818CF8' }}>{elapsed}</span>
          </div>
        </div>

        {/* Header utility icons */}
        <div className="flex items-center gap-1 flex-none">
          <IconBtn label="Cambiar diseño" comingSoon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </IconBtn>
          <IconBtn label="Pantalla completa" comingSoon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </IconBtn>
          <IconBtn label="Participantes" badge={onlineCount} comingSoon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </IconBtn>
          <IconBtn label="Chat" active={chatOpen} badge={mensajes.length} onClick={() => setChatOpen(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </IconBtn>
          <IconBtn label="Configuración" comingSoon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </IconBtn>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Participant grid + floating controls */}
        <main className="flex-1 min-w-0 relative flex flex-col p-4 pb-24">
          <div
            className="flex-1 grid gap-3 content-start"
            style={{
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridAutoRows: 'minmax(140px, 1fr)',
            }}
          >
            {!chatReady && participantesOrdenados.length === 0 ? (
              <div className="col-span-3 flex items-center justify-center rounded-[16px] py-20" style={{ background: 'rgba(148,163,184,0.04)', border: '1px dashed rgba(148,163,184,0.15)' }}>
                <p className="m-0 text-[13px]" style={{ color: '#64748B' }}>Conectando participantes…</p>
              </div>
            ) : participantesOrdenados.length === 0 ? (
              <div className="col-span-3 flex items-center justify-center rounded-[16px] py-20" style={{ background: 'rgba(148,163,184,0.04)', border: '1px dashed rgba(148,163,184,0.15)' }}>
                <p className="m-0 text-[13px]" style={{ color: '#64748B' }}>Esperando participantes…</p>
              </div>
            ) : (
              participantesOrdenados.map(u => (
                <ParticipantTile
                  key={u.uid}
                  usuario={u}
                  isYou={u.uid === myUid}
                  isHost={u.uid === sala.creadorUid}
                />
              ))
            )}
          </div>

          {/* Bottom-left info */}
          <div className="absolute bottom-5 left-5 flex items-center gap-3 text-[12px]" style={{ color: '#64748B' }}>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
              {onlineCount}
            </span>
            <span>ID · {roomCode}</span>
            <button
              type="button"
              onClick={async () => {
                try { await navigator.clipboard.writeText(roomCode); toast.success('ID copiado.'); }
                catch { toast.error('No se pudo copiar.'); }
              }}
              className="cursor-pointer border-0 bg-transparent text-[12px] font-medium p-0"
              style={{ color: '#818CF8' }}
            >
              Copiar
            </button>
          </div>

          {/* Floating control bar */}
          <div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{
              background: 'rgba(15,23,42,0.92)',
              border: '1px solid rgba(148,163,184,0.14)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {[
              { label: 'Micrófono', icon: <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /> },
              { label: 'Cámara', icon: <><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></> },
              { label: 'Pantalla', icon: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></> },
            ].map(({ label, icon }) => (
              <ComingSoonButton
                key={label}
                label={label}
                className={floatingBtnClass}
                style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {icon}
                </svg>
              </ComingSoonButton>
            ))}
            <ComingSoonButton
              label="Más opciones"
              className={floatingBtnClass}
              style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
              </svg>
            </ComingSoonButton>
            <div className="w-px h-6 mx-1" style={{ background: 'rgba(148,163,184,0.15)' }} aria-hidden="true" />
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="h-10 px-5 rounded-full text-[13px] font-semibold cursor-pointer border-0 flex items-center gap-2"
              style={{ background: '#DC2626', color: '#fff' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <path d="M22 2L11 13" />
              </svg>
              Salir
            </button>
          </div>
        </main>

        {/* ── Chat sidebar ── */}
        {chatOpen && (
          <aside
            className="w-[340px] flex flex-col flex-none"
            style={{ background: '#0D1526', borderLeft: '1px solid rgba(148,163,184,0.1)' }}
          >
            {/* Chat header */}
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
                onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center cursor-pointer border-0"
                style={{ background: 'rgba(148,163,184,0.08)', color: '#64748B' }}
                aria-label="Cerrar chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {chatError && (
                <p className="m-0 text-center text-[12px] px-3 py-2 rounded-[10px]" style={{ color: '#F87171', background: 'rgba(127,29,29,0.2)' }}>
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
              {mensajes.map(msg => (
                <ChatMessage key={msg.id} msg={msg} isOwn={msg.uid === myUid} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 px-3 py-3 flex-none"
              style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}
            >
              <ComingSoonButton
                label="Adjuntar"
                className="w-8 h-8 rounded-full flex items-center justify-center border-0 flex-none"
                style={{ background: 'rgba(148,163,184,0.1)', color: '#64748B' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </ComingSoonButton>
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Escribe un mensaje…"
                maxLength={2000}
                disabled={!chatReady}
                autoFocus
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
