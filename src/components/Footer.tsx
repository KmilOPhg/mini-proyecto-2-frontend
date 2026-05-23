import type { StudentUser } from '../services/api';

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M9 12h12M18 9l3 3l-3 3" />
  </svg>
);

interface FooterProps {
  user: Pick<StudentUser, 'nombres' | 'avatar'> | null;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Footer({ user, setActiveTab, onLogout }: FooterProps) {
  const initials = user ? user.nombres.slice(0, 2).toUpperCase() : 'CF';

  return (
    <div className="flex gap-2 items-stretch pt-3" style={{ borderTop: '1px solid rgba(148,163,184,0.14)' }}>
      <button
        aria-label="Abrir perfil"
        onClick={() => setActiveTab('profile')}
        className="flex-1 min-w-0 grid items-center gap-2.5 px-2.5 py-2 rounded-[12px] cursor-pointer text-left transition-colors"
        style={{
          gridTemplateColumns: 'auto 1fr',
          background: 'rgba(15,23,42,0.5)',
          border: '1px solid rgba(148,163,184,0.14)',
          color: '#F8FAFC',
        }}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-8 h-8 rounded-[10px] object-cover" />
        ) : (
          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white text-xs font-semibold"
            style={{ background: 'linear-gradient(135deg, #6366F1, #38BDF8)' }}>
            {initials}
          </span>
        )}
        <span className="flex flex-col min-w-0">
          <span className="text-[13px] font-medium truncate">{user?.nombres ?? 'Estudiante'}</span>
          <span className="text-[11px] flex items-center gap-1.5" style={{ color: '#64748B' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#4ADE80', boxShadow: '0 0 0 2px rgba(74,222,128,0.2)' }} />
            En línea
          </span>
        </span>
      </button>

      <button
        onClick={onLogout}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="flex-none w-10 flex items-center justify-center rounded-[12px] cursor-pointer transition-colors"
        style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.14)', color: '#94A3B8' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.14)';
          (e.currentTarget as HTMLElement).style.color = '#FCA5A5';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.36)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(148,163,184,0.06)';
          (e.currentTarget as HTMLElement).style.color = '#94A3B8';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(148,163,184,0.14)';
        }}
      >
        <LogoutIcon />
      </button>
    </div>
  );
}
