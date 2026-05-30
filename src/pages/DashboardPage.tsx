import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { listMisSalas } from '../services/api';
import type { SalaPublica } from '../services/api';
import { salaToRoomCard, salaRoomPathFromSala, COLOR_GRADIENTS, getInitials, type RoomCardData } from '../utils/sala';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProfileEditModal from '../components/ProfileEditModal';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';

// ─── Icons ────────────────────────────────────────────────────────────────────
function LogoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="cfLg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="url(#cfLg)" />
      <path d="M8 9.5L12 13.5L16 9.5M8 14.5L12 18.5L16 14.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.95" />
      <circle cx="12" cy="6.5" r="1.4" fill="#fff" opacity="0.95" />
    </svg>
  );
}

const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const RoomsIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="8" height="6" rx="1.5" /><rect x="13" y="5" width="8" height="6" rx="1.5" />
    <rect x="3" y="13" width="8" height="6" rx="1.5" /><rect x="13" y="13" width="8" height="6" rx="1.5" />
  </svg>
);
const ListIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6l4 1l-3 12l-4-1z" />
  </svg>
);
const UserIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4.5-6 8-6s7 2 8 6" />
  </svg>
);
const LogoutIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M9 12h12M18 9l3 3l-3 3" />
  </svg>
);
// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, onOpenProfile, user, onLogout, roomCount }: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onOpenProfile: () => void;
  user: { nombres: string | null; apellidos: string | null; username: string | null; avatar: string | null } | null;
  onLogout: () => void;
  roomCount: number;
}) {
  return (
    <aside
      aria-label="Navegación principal"
      style={{ background: '#111827', borderRight: '1px solid rgba(148,163,184,0.14)' }}
      className="hidden lg:flex sticky top-0 h-screen w-[240px] flex-col gap-3.5 px-3 py-[18px] shrink-0"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pb-3">
        <LogoIcon />
        <span style={{
          fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em',
          background: 'linear-gradient(180deg, #F8FAFC 0%, #CBD5E1 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          CrossFlow
        </span>
      </div>

      {/* Nav */}
      <nav aria-label="Secciones" className="flex-1">
        <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
          {([
            ['rooms', 'Salas', <RoomsIcon />, roomCount > 0 ? roomCount : null],
            ['profile', 'Perfil', <UserIcon />, null],
          ] as const).map(([key, label, icon, badge]) => {
            const active = activeTab === key;
            return (
              <li key={key}>
                <button
                  onClick={() => key === 'profile' ? onOpenProfile() : setActiveTab(key as string)}
                  aria-current={active ? 'page' : undefined}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] border-0 text-sm font-medium text-left cursor-pointer transition-colors"
                  style={{
                    background: active ? 'rgba(99,102,241,0.14)' : 'transparent',
                    color: active ? '#F8FAFC' : '#94A3B8',
                    boxShadow: active ? 'inset 0 0 0 1px rgba(99,102,241,0.22)' : 'none',
                  }}
                >
                  <span style={{ color: active ? '#818CF8' : 'currentColor' }}>{icon}</span>
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span style={{
                      fontSize: 10, padding: '2px 6px',
                      background: 'rgba(99,102,241,0.25)', color: '#C7D2FE',
                      borderRadius: 999, fontWeight: 600,
                    }}>
                      {badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <Footer user={user} onOpenProfile={onOpenProfile} onLogout={onLogout} />
    </aside>
  );
}

// ─── Mobile bottom nav ─────────────────────────────────────────────────────────
function MobileBottomNav({
  activeTab,
  setActiveTab,
  onOpenProfile,
  onLogout,
  roomCount,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  roomCount: number;
}) {
  const items = [
    { key: 'rooms', label: 'Salas', icon: <RoomsIcon size={20} />, badge: roomCount > 0 ? roomCount : null, action: () => setActiveTab('rooms') },
    { key: 'profile', label: 'Perfil', icon: <UserIcon size={20} />, badge: null, action: onOpenProfile },
    { key: 'logout', label: 'Salir', icon: <LogoutIcon size={20} />, badge: null, action: onLogout },
  ] as const;

  return (
    <nav
      aria-label="Navegación móvil"
      className="lg:hidden fixed bottom-0 inset-x-0 z-20 flex items-stretch pb-safe"
      style={{
        background: 'rgba(17,24,39,0.96)',
        borderTop: '1px solid rgba(148,163,184,0.14)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {items.map(({ key, label, icon, badge, action }) => {
        const active = key !== 'logout' && activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={action}
            aria-current={active ? 'page' : undefined}
            aria-label={key === 'logout' ? 'Cerrar sesión' : label}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] border-0 cursor-pointer transition-colors"
            style={{
              color: key === 'logout' ? '#94A3B8' : active ? '#818CF8' : '#64748B',
              background: 'transparent',
            }}
          >
            <span className="relative">
              {icon}
              {badge != null && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: '#6366F1', color: '#fff' }}
                >
                  {badge}
                </span>
              )}
            </span>
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}



const ENTER_ROOM_BTN_CLASS =
  'h-8 px-3 rounded-[9px] font-medium text-white cursor-pointer border-0 transition-opacity hover:opacity-90';

const ENTER_ROOM_BTN_STYLE = {
  background: 'linear-gradient(180deg, #6F73F4 0%, #5458E8 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.16) inset, 0 4px 14px rgba(99,102,241,0.32)',
} as const;

// ─── Room Card ────────────────────────────────────────────────────────────────
function RoomCard({ r, view, onEnter }: { r: RoomCardData; view: 'grid' | 'list'; onEnter: (code: string) => void }) {
  const grad = COLOR_GRADIENTS[r.color];

  if (view === 'list') {
    return (
      <article
        className="flex flex-col gap-3 sm:grid sm:items-center sm:gap-4 rounded-[12px] px-3.5 py-3 sm:py-2.5 pl-2.5 transition-colors"
        style={{
          gridTemplateColumns: '56px 1fr auto auto',
          background: '#1E293B',
          border: '1px solid rgba(148,163,184,0.14)',
        }}
      >
        <div className="flex items-center gap-3 sm:contents min-w-0">
          <div className="relative w-14 h-14 rounded-[10px] overflow-hidden flex-none" style={{ background: grad }}>
            <span className="absolute right-2 bottom-1 text-[22px] font-bold" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '-0.04em' }}>
              {r.subject.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="m-0 text-sm font-medium truncate" style={{ color: '#F8FAFC' }}>{r.title}</h3>
              <LiveChip status={r.status} time={r.time} />
            </div>
            <p className="mt-0.5 text-[12.5px] line-clamp-2 sm:truncate" style={{ color: '#64748B' }}>
              {r.subject} · {r.host} · {r.onlineCount} en la sala
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 sm:contents">
          <div className="flex gap-1.5">
            <Tag label={r.code} />
          </div>
          <button
            type="button"
            onClick={() => onEnter(r.code)}
            aria-label={`Entrar a ${r.title}`}
            className={`${ENTER_ROOM_BTN_CLASS} text-sm w-full sm:w-auto`}
            style={ENTER_ROOM_BTN_STYLE}
          >
            Entrar
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-[16px] transition-all duration-200 group cursor-pointer"
      style={{ background: '#1E293B', border: '1px solid rgba(148,163,184,0.14)' }}
    >
      {/* Header with color */}
      <header className="relative flex items-start justify-between p-3.5" style={{ aspectRatio: '16/7', background: grad }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />
        {/* Subject letter */}
        <span className="absolute right-4 bottom-3 text-[42px] font-bold" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {r.subject.slice(0, 2).toUpperCase()}
        </span>
        <div className="relative z-10">
          <LiveChip status={r.status} time={r.time} />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-col gap-1.5 px-[18px] pt-4 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#818CF8' }}>
          {r.subject}
        </span>
        <h3 className="m-0 text-[15.5px] font-semibold leading-snug" style={{ color: '#F8FAFC', letterSpacing: '-0.01em' }}>
          {r.title}
        </h3>
        <p className="m-0 text-sm leading-relaxed line-clamp-2" style={{ color: '#94A3B8' }}>
          {r.desc}
        </p>
      </div>

      {/* Footer */}
      <footer className="grid items-center gap-3 px-[18px] pt-3 pb-4" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
        <div className="flex">
          {Array.from({ length: Math.min(r.onlineCount, 3) }).map((_, i) => (
            <span key={i} className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2" style={{ background: '#6366F1', borderColor: '#1E293B', marginLeft: i > 0 ? -8 : 0 }}>
              {getInitials(r.host)}
            </span>
          ))}
          {r.onlineCount > 3 && (
            <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold border-2" style={{ background: 'rgba(148,163,184,0.15)', color: '#94A3B8', borderColor: '#1E293B', marginLeft: -8 }}>
              +{r.onlineCount - 3}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: '#64748B' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{r.onlineCount} en la sala</span>
        </div>
        <button
          type="button"
          onClick={() => onEnter(r.code)}
          aria-label={`Entrar a ${r.title}`}
          className={`${ENTER_ROOM_BTN_CLASS} text-[13px]`}
          style={ENTER_ROOM_BTN_STYLE}
        >
          Entrar
        </button>
      </footer>
    </article>
  );
}

// ─── New Room Card ────────────────────────────────────────────────────────────
function NewRoomCard({ view, onClick }: { view: 'grid' | 'list'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start justify-center gap-3 p-6 rounded-[16px] text-left cursor-pointer transition-colors group"
      style={{
        flexDirection: view === 'list' ? 'row' : 'column',
        background: 'rgba(148,163,184,0.04)',
        border: '1.5px dashed rgba(148,163,184,0.28)',
        color: '#94A3B8',
        minHeight: view === 'list' ? 60 : 240,
      }}
    >
      <span className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.18)', color: '#818CF8' }}>
        <PlusIcon size={22} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-medium" style={{ color: '#F8FAFC' }}>Crear nueva sala</span>
        <span className="text-[12.5px]" style={{ color: '#64748B' }}>Video, chat y pizarra en segundos</span>
      </span>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function LiveChip({ status, time }: { status: string; time: string }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-[9px] py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(127,29,29,0.5)', color: '#FECACA', border: '1px solid rgba(248,113,113,0.4)', backdropFilter: 'blur(8px)' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: '#F87171', boxShadow: '0 0 0 2px rgba(248,113,113,0.25)', animation: 'pulse 2s ease-in-out infinite' }} />
        En vivo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-[9px] py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(15,23,42,0.65)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.14)', backdropFilter: 'blur(8px)' }}>
      {time}
    </span>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-[6px] text-[11px]" style={{ background: 'rgba(148,163,184,0.08)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.14)' }}>
      {label}
    </span>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const jwtToken = useAuthStore(s => s.jwtToken);
  const logout = useAuthStore(s => s.logout);

  const [salas, setSalas] = useState<SalaPublica[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('rooms');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);

  const hostName = user?.username
    ?? [user?.nombres, user?.apellidos].filter(Boolean).join(' ')
    ?? 'Tú';

  const rooms = useMemo(
    () => salas.map(s => salaToRoomCard(s, hostName.split(' ')[0] ?? hostName)),
    [salas, hostName],
  );

  const fetchSalas = useCallback(async (silent = false) => {
    if (!jwtToken) return;
    if (!silent) setLoadingRooms(true);
    try {
      const data = await listMisSalas(jwtToken);
      setSalas(data.items);
    } catch (err) {
      if (!silent) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar las salas.');
      }
    } finally {
      if (!silent) setLoadingRooms(false);
    }
  }, [jwtToken]);

  useEffect(() => {
    fetchSalas();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchSalas(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchSalas]);

  const filtered = useMemo(() =>
    rooms.filter(r =>
      (filter === 'all' || r.status === filter) &&
      (q === '' || (r.title + r.subject + r.host + r.code).toLowerCase().includes(q.toLowerCase()))
    ), [rooms, q, filter]
  );

  const liveCount = rooms.filter(r => r.status === 'live').length;

  function handleEnterRoom(code: string) {
    navigate(`/salas/${encodeURIComponent(code.trim().toUpperCase())}`);
  }

  function handleRoomCreated(sala: SalaPublica) {
    setSalas(prev => [sala, ...prev.filter(s => s.id !== sala.id)]);
    navigate(salaRoomPathFromSala(sala));
  }

  async function handleLogout() {
    await logout();
    toast.success('Sesión cerrada correctamente.');
    navigate('/login', { replace: true });
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 2px rgba(248,113,113,0.25); }
          50% { box-shadow: 0 0 0 5px rgba(248,113,113,0.05); }
        }
      `}</style>
      <div className="flex flex-col lg:grid lg:grid-cols-[240px_1fr] min-h-svh" style={{ background: '#0F172A' }}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenProfile={() => setShowProfileModal(true)}
          user={user}
          onLogout={handleLogout}
          roomCount={salas.length}
        />

        <main id="main" className="min-w-0 flex flex-col pb-[72px] lg:pb-0" style={{ color: '#F8FAFC' }}>
          <Header
            q={q}
            setQ={setQ}
            user={user}
            roomCount={salas.length}
            onOpenProfile={() => setShowProfileModal(true)}
            onCreateRoom={() => setShowCreateRoomModal(true)}
            onJoinById={() => setShowJoinRoomModal(true)}
          />

          <div className="p-4 sm:p-6 lg:p-7 flex flex-col gap-6 sm:gap-8 w-full max-w-[1480px] mx-auto">
            <section aria-labelledby="rooms-h">
              {/* Section header */}
              <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
                <div className="min-w-0">
                  <h2 id="rooms-h" className="m-0 text-lg font-semibold" style={{ letterSpacing: '-0.01em', color: '#F8FAFC' }}>
                    Salas colaborativas
                  </h2>
                  <p className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                    {filtered.length} disponibles · {liveCount} en vivo
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                  {/* Filter tabs */}
                  <div
                    role="tablist"
                    aria-label="Filtrar salas"
                    className="inline-flex p-[3px] gap-0.5 rounded-[10px]"
                    style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.14)' }}
                  >
                    {([['all', 'Todas'], ['live', 'En vivo'], ['scheduled', 'Programadas']] as const).map(([v, l]) => (
                      <button
                        key={v}
                        role="tab"
                        aria-selected={filter === v}
                        tabIndex={filter === v ? 0 : -1}
                        onClick={() => setFilter(v)}
                        className="px-3 py-1.5 rounded-[7px] text-[13px] font-medium cursor-pointer border-0 transition-colors"
                        style={{
                          background: filter === v ? 'rgba(99,102,241,0.18)' : 'transparent',
                          color: filter === v ? '#818CF8' : '#94A3B8',
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* View toggle */}
                  <div
                    role="tablist"
                    aria-label="Vista"
                    className="inline-flex p-[3px] gap-0.5 rounded-[10px]"
                    style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.14)' }}
                  >
                    <button
                      role="tab" aria-selected={view === 'grid'} aria-label="Cuadrícula"
                      tabIndex={view === 'grid' ? 0 : -1}
                      onClick={() => setView('grid')}
                      className="p-1.5 rounded-[7px] cursor-pointer border-0 transition-colors"
                      style={{ background: view === 'grid' ? 'rgba(99,102,241,0.18)' : 'transparent', color: view === 'grid' ? '#818CF8' : '#94A3B8' }}
                    >
                      <RoomsIcon size={14} />
                    </button>
                    <button
                      role="tab" aria-selected={view === 'list'} aria-label="Lista"
                      tabIndex={view === 'list' ? 0 : -1}
                      onClick={() => setView('list')}
                      className="p-1.5 rounded-[7px] cursor-pointer border-0 transition-colors"
                      style={{ background: view === 'list' ? 'rgba(99,102,241,0.18)' : 'transparent', color: view === 'list' ? '#818CF8' : '#94A3B8' }}
                    >
                      <ListIcon />
                    </button>
                  </div>
                </div>
              </header>

              {/* Room cards */}
              {loadingRooms ? (
                <div className="flex items-center justify-center py-16">
                  <svg className="w-7 h-7 animate-spin" style={{ color: '#818CF8' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : (
                <div
                  className={view === 'grid' ? 'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]' : 'flex flex-col gap-2'}
                >
                  {filtered.map(r => <RoomCard key={r.id} r={r} view={view} onEnter={handleEnterRoom} />)}
                  <NewRoomCard view={view} onClick={() => setShowCreateRoomModal(true)} />
                </div>
              )}
            </section>
          </div>
        </main>

        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenProfile={() => {
            setActiveTab('profile');
            setShowProfileModal(true);
          }}
          onLogout={handleLogout}
          roomCount={salas.length}
        />
      </div>

      <ProfileEditModal
        open={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setActiveTab('rooms');
        }}
      />

      <CreateRoomModal
        open={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        onCreated={handleRoomCreated}
      />

      <JoinRoomModal
        open={showJoinRoomModal}
        onClose={() => setShowJoinRoomModal(false)}
        onJoined={(sala) => navigate(salaRoomPathFromSala(sala))}
      />
    </>
  );
}
