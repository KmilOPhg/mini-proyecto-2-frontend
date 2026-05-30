import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { toast } from 'sonner';
import { auth, googleProvider } from '../lib/firebase';
import { createSession } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { usePageTitle } from '../hooks/usePageTitle';
import { INSTITUTIONAL_EMAIL_HINT, isInstitutionalEmail } from '../utils/institutionalEmail';

export default function LoginPage() {
  usePageTitle('Iniciar sesión');
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const markNeedsUsername = useAuthStore((s) => s.markNeedsUsername);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function validate(): string | null {
    const emailTrimmed = email.trim();
    if (!emailTrimmed) return 'El correo electrónico es obligatorio.';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(emailTrimmed)) return 'Por favor, ingresa un correo electrónico válido.';
    if (!isInstitutionalEmail(emailTrimmed)) return INSTITUTIONAL_EMAIL_HINT;
    if (!password) return 'La contraseña es obligatoria.';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    return null;
  }

  async function handleEmailLogin(e: React.SyntheticEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }
    setFormError(null);

    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken(true);
      const result = await createSession(idToken);
      if (result.needsUsername) { 
        markNeedsUsername(result.user);
        toast.success('Sesión iniciada. Por favor configura tu nombre de usuario.');
        navigate('/username-setup', { replace: true });
      } else {
        setSession(result.token, result.user);
        toast.success('¡Bienvenido de nuevo!');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      toast.error(mapFirebaseClientError(msg));
      await auth.signOut().catch(() => undefined);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const googleEmail = credential.user.email ?? '';
      if (!isInstitutionalEmail(googleEmail)) {
        await auth.signOut();
        toast.error(INSTITUTIONAL_EMAIL_HINT);
        return;
      }
      const idToken = await credential.user.getIdToken(true);
      const result = await createSession(idToken);
      if (result.needsUsername) {
        markNeedsUsername(result.user);
        toast.success('Sesión iniciada con Google. Configura tu nombre de usuario.');
        navigate('/username-setup', { replace: true });
      } else {
        setSession(result.token, result.user);
        toast.success('¡Bienvenido de nuevo!');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error con Google';
      if (!msg.includes('popup-closed')) toast.error(msg);
      await auth.signOut().catch(() => undefined);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0F172A' }}>
      <main id="main" className="flex flex-col justify-center w-full lg:max-w-[520px] px-8 sm:px-14 py-12" style={{ background: '#0F172A' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#4F46E5' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white text-base font-semibold">CrossFlow</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-1.5">Bienvenido de vuelta</h1>
        <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>
          Accede a tus salas y continúa donde lo dejaste.
        </p>

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F8FAFC' }}
        >
          {googleLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continuar con Google
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span className="text-xs" style={{ color: '#475569' }}>o con correo</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Form */}
        {formError && (
          <p id="login-form-error" role="alert" className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ color: '#FCA5A5', background: 'rgba(127,29,29,0.25)' }}>
            {formError}
          </p>
        )}
        <form onSubmit={handleEmailLogin} noValidate className="space-y-4" aria-describedby={formError ? 'login-form-error' : undefined}>
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>
              Correo electrónico
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} aria-hidden="true">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
                placeholder="tu@universidad.edu"
                autoComplete="email"
                required
                aria-required="true"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition disabled:opacity-50 focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#F8FAFC',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.25)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-sm font-medium" style={{ color: '#CBD5E1' }}>
                Contraseña
              </label>
              <button
                type="button"
                className="text-xs font-medium transition hover:opacity-80"
                style={{ color: '#6366F1' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} aria-hidden="true">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                aria-required="true"
                disabled={loading}
                className="w-full pl-10 pr-11 py-3 rounded-xl text-sm transition disabled:opacity-50 focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#F8FAFC',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.25)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition hover:opacity-80"
                style={{ color: '#475569' }}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-indigo-600"
              style={{ accentColor: '#6366F1' }}
            />
            <span className="text-sm" style={{ color: '#94A3B8' }}>Mantener sesión iniciada</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            style={{ background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? 'Ingresando…' : 'Iniciar sesión →'}
          </button>
        </form>

        <p className="mt-7 text-sm text-center" style={{ color: '#64748B' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium transition hover:opacity-80" style={{ color: '#6366F1' }}>
            Crear cuenta
          </Link>
        </p>
      </main>

      {/* ── Right panel: marketing ── */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center px-16 py-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #1E293B 100%)' }}
      >
        {/* Blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.08)' }} />
        <div className="absolute -bottom-40 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(59,130,246,0.06)' }} />

        <div className="relative z-10 max-w-lg">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 text-xs font-medium" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Estudio colaborativo en tiempo real
          </div>

          {/* Heading */}
          <h2 className="text-5xl font-bold leading-tight mb-5 text-white">
            Salas accesibles para aprender, crear y avanzar juntos.
          </h2>
          <p className="text-base leading-relaxed mb-10" style={{ color: '#64748B' }}>
            Video HD, chat instantáneo, pizarra compartida y herramientas de accesibilidad WCAG 2.2 integradas en cada sesión.
          </p>
        </div>
      </div>
    </div>
  );
}

function mapFirebaseClientError(msg: string): string {
  if (msg.includes('user-not-found') || msg.includes('invalid-credential') || msg.includes('wrong-password'))
    return 'Correo o contraseña incorrectos.';
  if (msg.includes('too-many-requests'))
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  if (msg.includes('network-request-failed'))
    return 'Sin conexión. Verifica tu red e intenta de nuevo.';
  return msg;
}
