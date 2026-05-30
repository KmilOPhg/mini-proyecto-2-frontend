import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getSala, joinSala, deleteSala } from '../services/api';
import type { MensajePublico, SalaPublica } from '../services/api';
import { useRoomChat } from '../hooks/useRoomChat';
import { useAuthStore } from '../store/authStore';
import {
  salaShareCode, formatMessageTime, validateMensajeTexto,
  getInitials, participantGradientFromUid,
} from '../utils/sala';
import type { UsuarioEnLinea } from '../hooks/useRoomChat';
import ComingSoonButton from '../components/ComingSoonButton';
import LeaveRoomModal from '../components/LeaveRoomModal';
import {
  IconArrowLeft, IconClock, IconExpand, IconLayoutGrid, IconLink,
  IconMessageSquare, IconMic, IconMonitorUp, IconMoreHorizontal,
  IconPhoneHangup, IconPlus, IconSend, IconSettings, IconUsers, IconVideo, IconX,
} from '../components/room/RoomIcons';

// ── Icons ──────────────────────────────────────────────────────────────────────

const iconBtnClass = 'relative w-9 h-9 rounded-[10px] flex items-center justify-center border-0 transition-colors';
const panelToggleClass = 'w-10 h-10 rounded-[12px] flex items-center justify-center border-0 transition-colors';
const controlBtnClass = 'flex flex-col items-center justify-center gap-1 min-w-[56px] py-1.5 px-1 border-0 bg-transparent';
const exitBtnClass = 'flex flex-col items-center justify-center gap-1 min-w-[56px] py-1.5 px-2 rounded-[14px] border-0 cursor-pointer';

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

function ControlBtn({ label, children, comingSoon = true }: {
  label: string; children: React.ReactNode; comingSoon?: boolean;
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
  return null;
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
        <IconExpand size={13} strokeWidth={2} />
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
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const skipSalaTerminadaRef = useRef(false);

  const handleSalaTerminada = useCallback((mensaje: string) => {
    if (skipSalaTerminadaRef.current) return;
    toast.info(mensaje);
    navigate('/dashboard');
  }, [navigate]);

  const { mensajes, usuariosEnLinea, chatReady, chatError, sendMensaje } = useRoomChat(
    id,
    jwtToken ?? null,
    { onSalaTerminada: handleSalaTerminada },
  );

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
  const isHost = sala.creadorUid === myUid;

  function handleLeaveRoom() {
    setShowLeaveModal(false);
    toast.success('Saliste de la sala.');
    navigate('/dashboard');
  }

  async function handleEndSession() {
    if (!jwtToken || !id) return;
    skipSalaTerminadaRef.current = true;
    await deleteSala(jwtToken, id);
    setShowLeaveModal(false);
    toast.success('Sesión terminada para todos los participantes.');
    navigate('/dashboard');
  }

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
          <div className="flex items-center gap-3 mt-0.5 text-[11.5px]" style={{ color: '#64748B' }}>
            <span>ID: <span style={{ color: '#94A3B8' }}>{roomCode}</span></span>
            <span>Anfitrión: <span style={{ color: '#94A3B8' }}>{hostNombre}</span></span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums" style={{ color: '#818CF8' }}>
              <IconClock size={12} strokeWidth={2} />
              {elapsed}
            </span>
          </div>
        </div>

        {/* Header utility icons */}
        <div className="flex items-center gap-1 flex-none">
          <IconBtn label="Cambiar diseño" comingSoon>
            <IconLayoutGrid size={16} />
          </IconBtn>
          <IconBtn label="Copiar enlace" comingSoon>
            <IconLink size={16} />
          </IconBtn>
          <IconBtn label="Participantes" badge={onlineCount} comingSoon>
            <IconUsers size={16} />
          </IconBtn>
          <IconBtn label="Chat" active={chatOpen} badge={mensajes.length} onClick={() => setChatOpen(v => !v)}>
            <IconMessageSquare size={16} />
          </IconBtn>
          <IconBtn label="Configuración" comingSoon>
            <IconSettings size={16} />
          </IconBtn>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 min-h-0">

        {/* Video + chat (above bottom bar) */}
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-w-0 min-h-0 overflow-hidden p-4">
            <div
              className="h-full grid gap-3 content-start"
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
          </main>

          {/* ── Chat sidebar ── */}
          {chatOpen && (
            <aside
              className="w-[340px] flex flex-col flex-none min-h-0"
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
                <IconX size={14} />
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
                <IconPlus size={16} />
              </ComingSoonButton>
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Escribe un mensaje..."
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
                <IconSend size={15} />
              </button>
            </form>
          </aside>
        )}
        </div>

        {/* Bottom bar — full width under video and chat */}
        <footer
          className="grid flex-none items-center px-5 py-3"
          style={{
            gridTemplateColumns: '1fr auto 1fr',
            background: '#080E1A',
            borderTop: '1px solid rgba(148,163,184,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0 justify-self-start">
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
                try { await navigator.clipboard.writeText(roomCode); toast.success('ID copiado.'); }
                catch { toast.error('No se pudo copiar.'); }
              }}
              className="cursor-pointer border-0 bg-transparent text-[12px] font-medium p-0 flex-none"
              style={{ color: '#818CF8' }}
            >
              Copiar
            </button>
          </div>

          <div
            className="flex items-center gap-0.5 px-2 py-1.5 rounded-[20px] justify-self-center"
            style={{
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(148,163,184,0.14)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            <ControlBtn label="Mic">
              <IconMic size={20} strokeWidth={1.75} />
            </ControlBtn>
            <ControlBtn label="Cámara">
              <IconVideo size={20} strokeWidth={1.75} />
            </ControlBtn>
            <ControlBtn label="Pantalla">
              <IconMonitorUp size={20} strokeWidth={1.75} />
            </ControlBtn>
            <ControlBtn label="Más">
              <IconMoreHorizontal size={20} />
            </ControlBtn>
            <div className="w-px h-9 mx-1.5" style={{ background: 'rgba(148,163,184,0.18)' }} aria-hidden="true" />
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

          <div className="flex items-center gap-2 justify-self-end">
            <PanelToggle label="Panel de participantes" comingSoon>
              <IconUsers size={17} />
            </PanelToggle>
            <PanelToggle label="Chat" active={chatOpen} onClick={() => setChatOpen(v => !v)}>
              <IconMessageSquare size={17} />
            </PanelToggle>
          </div>
        </footer>
      </div>

      <LeaveRoomModal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        salaNombre={sala.nombre}
        isHost={isHost}
        onLeaveRoom={handleLeaveRoom}
        onEndSession={handleEndSession}
      />
    </div>
  );
}
