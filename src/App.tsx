import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UsernameSetupPage from './pages/UsernameSetupPage';
import DashboardPage from './pages/DashboardPage';

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
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
      <AuthInit />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/username-setup" element={<RequireNeedsUsername><UsernameSetupPage /></RequireNeedsUsername>} />
        <Route path="/dashboard" element={<RequireSession><DashboardPage /></RequireSession>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
