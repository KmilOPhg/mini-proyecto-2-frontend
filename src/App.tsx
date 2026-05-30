import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { initA11y } from './utils/a11y';

// Apply stored accessibility settings before first render
initA11y();
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UsernameSetupPage from './pages/UsernameSetupPage';
import DashboardPage from './pages/DashboardPage';
import RoomPage from './pages/RoomPage';
import RouteA11y from './components/RouteA11y';

function AuthInit() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => init(), [init]);
  return null;
}

function RootRedirect() {
  const jwtToken = useAuthStore((s) => s.jwtToken);
  const needsUsername = useAuthStore((s) => s.needsUsername);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-white"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Cargando aplicación"
      >
        <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="cf-sr-only">Cargando…</span>
      </div>
    );
  }

  if (jwtToken) return <Navigate to="/dashboard" replace />;
  if (needsUsername) return <Navigate to="/username-setup" replace />;
  return <Navigate to="/login" replace />;
}

function RequireSession({ children }: { children: React.ReactNode }) {
  const jwtToken = useAuthStore((s) => s.jwtToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return null;
  if (!jwtToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireNeedsUsername({ children }: { children: React.ReactNode }) {
  const needsUsername = useAuthStore((s) => s.needsUsername);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return null;
  if (!needsUsername) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const jwtToken = useAuthStore((s) => s.jwtToken);
  const needsUsername = useAuthStore((s) => s.needsUsername);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return null;
  if (jwtToken) return <Navigate to="/dashboard" replace />;
  if (needsUsername) return <Navigate to="/username-setup" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteA11y />
      <a href="#main" className="cf-skip-link">Saltar al contenido principal</a>
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{
          style: {
            background: '#1E293B',
            border: '1px solid rgba(148,163,184,0.14)',
            color: '#F8FAFC',
            borderRadius: '12px',
            fontSize: '13px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
        }}
      />
      <AuthInit />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/username-setup" element={<RequireNeedsUsername><UsernameSetupPage /></RequireNeedsUsername>} />
        <Route path="/dashboard" element={<RequireSession><DashboardPage /></RequireSession>} />
        <Route path="/salas/:code" element={<RequireSession><RoomPage /></RequireSession>} />
        <Route path="/r/:code" element={<RequireSession><RoomPage /></RequireSession>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
