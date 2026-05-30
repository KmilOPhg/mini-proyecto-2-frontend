import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getSala, joinSala } from '../services/api';
import type { SalaPublica } from '../services/api';
import { useRoomChat } from '../hooks/useRoomChat';
import { useAuthStore } from '../store/authStore';
import {
  salaShareCode, formatMessageTime, validateMensajeTexto,
} from '../utils/sala';
import type { MensajePublico } from '../services/api';

// ── Static mock participants (UI only) ───────────────────────────────────────
const MOCK_PARTICIPANTS = [
  { name: 'Tú', isYou: true, isHost: false, gradient: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)', initials: null as string | null, muted: true, hand: false, spotlight: false },
  { name: 'Anfitrión HOST', isYou: false, isHost: true, gradient: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)', initials: null, muted: false, hand: false, spotlight: true },
  { name: 'Participante 1', isYou: false, isHost: false, gradient: '#1E3A5F', initials: 'P1', muted: false, hand: false, spotlight: false },
  { name: 'Participante 2', isYou: false, isHost: false, gradient: 'linear-gradient(135deg, #059669 0%, #042F2E 100%)', initials: null, muted: true, hand: false, spotlight: false },
  { name: 'Participante 3', isYou: false, isHost: false, gradient: '#78350F', initials: 'P3', muted: false, hand: true, spotlight: false },
  { name: 'Participante 4', isYou: false, isHost: false, gradient: '#450A0A', initials: 'P4', muted: true, hand: false, spotlight: false },
];

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function ChatBubble({ msg, isOwn }: { msg: MensajePublico; isOwn: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && (
        <span className="text-[11px] font-medium px-1" style={{ color: '#64748B' }}>
          {msg.username} · {formatMessageTime(msg.createdAt)}
        </span>
      )}
      <div
        className="max-w-[92%] px-3 py-2 rounded-[12px] text-[13px] leading-relaxed"
        style={{
          background: isOwn ? 'rgba(99,102,241,0.22)' : 'rgba(148,163,184,0.08)',
          color: '#F8FAFC',
          border: isOwn ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(148,163,184,0.12)',
          borderBottomRightRadius: isOwn ? 4 : 12,
          borderBottomLeftRadius: isOwn ? 12 : 4,
        }}
      >
        {msg.texto}
      </div>
      {isOwn && (
        <span className="text-[10px] px-1" style={{ color: '#475569' }}>
          {formatMessageTime(msg.createdAt)}
        </span>
      )}
    </div>
  );
}

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

  const { mensajes, chatReady, chatError, sendMensaje } = useRoomChat(id, jwtToken ?? null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());

  const myUid = user?.id ?? '';
  const displayName = user?.username
    ?? [user?.nombres, user?.apellidos].filter(Boolean).join(' ')
    ?? user?.email
    ?? 'Tú';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, scrollToBottom]);

  useEffect(() => {
    const t = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!id || !jwtToken) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        let salaData: SalaPublica;
        try {
          salaData = await getSala(jwtToken!, id!);
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('acceso')) {
            salaData = await joinSala(jwtToken!, id!);
          } else throw err;
        }

        if (cancelled) return;
        setSala(salaData);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la sala.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [id, jwtToken]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!id || sending || !chatReady) return;

    const validation = validateMensajeTexto(draft);
    if (validation) {
      toast.error(validation);
      return;
    }

    setSending(true);
    const texto = draft.trim();
    setDraft('');
    try {
      const res = await sendMensaje(texto);
      if (!res.ok) {
        setDraft(texto);
        toast.error(res.error);
      }
    } finally {
      setSending(false);
    }
  }

  function handleLeave() {
    navigate('/dashboard');
  }

  async function handleCopyId() {
    if (!sala) return;
    const code = salaShareCode(sala);
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Código copiado al portapapeles.');
    } catch {
      toast.error('No se pudo copiar el código.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1220' }}>
        <svg className="w-8 h-8 animate-spin" style={{ color: '#818CF8' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error || !sala) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: '#0B1220', color: '#F8FAFC' }}>
        <p className="m-0 text-center">{error ?? 'Sala no encontrada.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-[10px] text-sm font-medium cursor-pointer text-white"
          style={{ background: '#6366F1' }}
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const roomCode = salaShareCode(sala);
  const hostLabel = sala.esCreador ? `${displayName.split(' ')[0] ?? 'Tú'} (tú)` : 'Anfitrión';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0B1220', color: '#F8FAFC' }}>
      {/* Top bar */}
      <header
        className="flex items-center gap-4 px-5 py-3 flex-none"
        style={{ background: 'rgba(15,23,42,0.85)', borderBottom: '1px solid rgba(148,163,184,0.12)' }}
      >
        <button
          onClick={handleLeave}
          aria-label="Volver"
          className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer border-0"
          style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }}
        >
          <BackIcon />
        </button>

        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="m-0 text-[15px] font-semibold truncate">{sala.nombre}</h1>
          <span
            className="flex-none inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
            style={{ background: 'rgba(127,29,29,0.5)', color: '#FECACA', border: '1px solid rgba(248,113,113,0.35)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F87171' }} />
            EN VIVO
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[12px]" style={{ color: '#64748B' }}>
          <span>ID: <strong style={{ color: '#94A3B8' }}>{roomCode}</strong></span>
          <span>Anfitrión: <strong style={{ color: '#94A3B8' }}>{hostLabel}</strong></span>
          <span className="font-mono tabular-nums" style={{ color: '#818CF8' }}>{elapsed}</span>
        </div>

        <button
          onClick={() => setChatOpen(v => !v)}
          className="md:hidden w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer border-0 relative"
          style={{ background: chatOpen ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.1)', color: chatOpen ? '#818CF8' : '#94A3B8' }}
          aria-label="Chat"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {mensajes.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: '#6366F1', color: '#fff' }}>
              {mensajes.length > 9 ? '9+' : mensajes.length}
            </span>
          )}
        </button>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Video grid (UI only) */}
        <main className="flex-1 p-4 min-w-0 flex flex-col">
          <div
            className="flex-1 grid gap-3"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' }}
          >
            {MOCK_PARTICIPANTS.map((p, i) => (
              <div
                key={i}
                className="relative rounded-[14px] overflow-hidden flex items-end p-3"
                style={{
                  background: p.gradient,
                  border: p.spotlight ? '2px solid rgba(99,102,241,0.7)' : '1px solid rgba(148,163,184,0.1)',
                  boxShadow: p.spotlight ? '0 0 24px rgba(99,102,241,0.25)' : 'none',
                  minHeight: 120,
                }}
              >
                {p.initials ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.initials}</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <div className="w-16 h-16 rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), rgba(255,255,255,0.05))' }} />
                  </div>
                )}
                {p.hand && (
                  <span className="absolute top-2 right-2 text-lg" aria-hidden="true">✋</span>
                )}
                {p.muted && (
                  <span className="absolute bottom-2 left-2 opacity-70" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.36-1.86" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                      <path d="M12 19v4M8 23h8" />
                    </svg>
                  </span>
                )}
                <span className="relative z-10 text-[12px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(0,0,0,0.45)', color: '#F8FAFC' }}>
                  {p.isYou ? 'Tú' : p.name}
                  {p.isHost && <span className="ml-1 text-[10px]" style={{ color: '#818CF8' }}>HOST</span>}
                </span>
              </div>
            ))}
          </div>
        </main>

        {/* Chat sidebar (functional) */}
        {chatOpen && (
          <aside
            className="w-full md:w-[320px] lg:w-[360px] flex flex-col flex-none border-l"
            style={{ background: '#111827', borderColor: 'rgba(148,163,184,0.12)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 flex-none"
              style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold">Chat</span>
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}
                >
                  {mensajes.length}
                </span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="md:hidden p-1 rounded cursor-pointer border-0"
                style={{ color: '#64748B', background: 'transparent' }}
                aria-label="Cerrar chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {chatError && (
                <p className="m-0 text-center text-[12px] px-2 py-2 rounded-lg" style={{ color: '#F87171', background: 'rgba(127,29,29,0.25)' }}>
                  {chatError}
                </p>
              )}
              {!chatReady && !chatError && (
                <p className="m-0 text-center text-[13px] py-4" style={{ color: '#64748B' }}>
                  Conectando chat en tiempo real…
                </p>
              )}
              {mensajes.length === 0 && chatReady ? (
                <p className="m-0 text-center text-[13px] py-8" style={{ color: '#475569' }}>
                  Aún no hay mensajes. ¡Sé el primero en escribir!
                </p>
              ) : (
                mensajes.map(msg => (
                  <ChatBubble key={msg.id} msg={msg} isOwn={msg.uid === myUid} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 px-3 py-3 flex-none"
              style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}
            >
              <input
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Escribe un mensaje…"
                maxLength={2000}
                disabled={sending || !chatReady}
                className="flex-1 px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                style={{
                  background: '#0F172A',
                  color: '#F8FAFC',
                  border: '1px solid rgba(148,163,184,0.18)',
                }}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim() || !chatReady}
                aria-label="Enviar mensaje"
                className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-0 flex-none"
                style={{
                  background: sending || !draft.trim() ? 'rgba(99,102,241,0.4)' : '#6366F1',
                  color: '#fff',
                }}
              >
                <SendIcon />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Bottom controls */}
      <footer
        className="flex items-center justify-between gap-4 px-5 py-3 flex-none"
        style={{ background: 'rgba(15,23,42,0.9)', borderTop: '1px solid rgba(148,163,184,0.12)' }}
      >
        <div className="flex items-center gap-3 text-[12px]" style={{ color: '#64748B' }}>
          <span className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
            {sala.participantes.length}
          </span>
          <span>ID · {roomCode}</span>
          <button
            type="button"
            onClick={handleCopyId}
            className="cursor-pointer border-0 bg-transparent text-[12px] font-medium p-0"
            style={{ color: '#818CF8' }}
          >
            Copiar
          </button>
        </div>

        <div className="flex items-center gap-2">
          {['Mic', 'Cámara', 'Pantalla'].map(label => (
            <button
              key={label}
              type="button"
              disabled
              title="Próximamente"
              className="w-10 h-10 rounded-full flex items-center justify-center cursor-not-allowed opacity-50"
              style={{ background: 'rgba(148,163,184,0.12)', color: '#94A3B8' }}
              aria-label={label}
            >
              <span className="text-[10px]">{label[0]}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleLeave}
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

        <button
          type="button"
          onClick={() => setChatOpen(v => !v)}
          className="hidden md:flex w-9 h-9 rounded-[10px] items-center justify-center cursor-pointer border-0"
          style={{ background: chatOpen ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.1)', color: chatOpen ? '#818CF8' : '#94A3B8' }}
          aria-label="Alternar chat"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
