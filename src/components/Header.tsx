import type { StudentUser } from '../services/api';
import { COMING_SOON_LABEL } from './ComingSoonButton';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14M20 20l-3.5-3.5" />
  </svg>
);

const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const HandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 11V5a1.5 1.5 0 1 1 3 0v5M12 10V4a1.5 1.5 0 1 1 3 0v7M15 11V6a1.5 1.5 0 1 1 3 0v9a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.5-4l-1.5-4a1.5 1.5 0 0 1 2.5-1.5L9 14" />
  </svg>
);

interface HeaderProps {
  q: string;
  setQ: (v: string) => void;
  user: Pick<StudentUser, 'nombres' | 'apellidos' | 'avatar'> | null;
  roomCount: number;
  onOpenProfile: () => void;
  onCreateRoom: () => void;
  onJoinById: () => void;
}

export default function Header({ q, setQ, user, roomCount, onOpenProfile, onCreateRoom, onJoinById: _onJoinById }: HeaderProps) {
  const n = user?.nombres?.trim() ?? '';
  const a = user?.apellidos?.trim() ?? '';
  const initials = ((n[0] ?? '') + (a[0] ?? '')).toUpperCase() || 'CF';

  return (
    <header
      className="sticky top-0 z-10 grid items-center gap-6 px-7 py-[18px]"
      style={{
        gridTemplateColumns: '1fr minmax(280px,480px) auto',
        background: 'rgba(15,23,42,0.72)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        borderBottom: '1px solid rgba(148,163,184,0.14)',
      }}
    >
      <div>
        <h1 className="m-0 text-xl font-semibold" style={{ letterSpacing: '-0.015em', color: '#F8FAFC' }}>
          Hola, {user?.nombres?.split(' ')[0] ?? user?.apellidos?.split(' ')[0] ?? 'Estudiante'} 👋
        </h1>
        <p className="mt-0.5 text-[13px]" style={{ color: '#94A3B8' }}>
          Tienes{' '}
          <strong style={{ color: '#F8FAFC', fontWeight: 600 }}>
            {roomCount} {roomCount === 1 ? 'sala' : 'salas'}
          </strong>{' '}
          creada{roomCount === 1 ? '' : 's'}.
        </p>
      </div>

      {/* Search */}
      <div
        role="search"
        className="flex items-center gap-2.5 px-3 h-10 rounded-[10px] transition-all"
        style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.14)' }}
      >
        <span style={{ color: '#64748B' }}><SearchIcon /></span>
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar salas, contactos o materiales…"
          aria-label="Buscar"
          className="flex-1 bg-transparent border-0 outline-none text-sm"
          style={{ color: '#F8FAFC', fontFamily: 'inherit' }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          title={COMING_SOON_LABEL}
          aria-label={`Unirse por ID — ${COMING_SOON_LABEL}`}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] text-sm font-medium transition-colors"
          style={{
            background: 'rgba(148,163,184,0.06)',
            border: '1px solid rgba(148,163,184,0.14)',
            color: '#F8FAFC',
            opacity: 0.45,
            cursor: 'not-allowed',
          }}
        >
          <HandIcon /> <span>Unirse por ID</span>
        </button>
        <button
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] text-sm font-medium text-white cursor-pointer"
          onClick={onCreateRoom}
          style={{
            background: 'linear-gradient(180deg, #6F73F4 0%, #5458E8 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.16) inset, 0 4px 14px rgba(99,102,241,0.32)',
          }}
        >
          <PlusIcon /> <span>Crear sala</span>
        </button>

        <div className="w-px h-[22px] mx-1" style={{ background: 'rgba(148,163,184,0.14)' }} aria-hidden="true" />

        <button
          aria-label="Perfil"
          onClick={onOpenProfile}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-xs font-semibold cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #38BDF8)',
            border: '1px solid rgba(148,163,184,0.14)',
          }}
        >
          {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-[10px] object-cover" /> : initials}
        </button>
      </div>
    </header>
  );
}
