import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithCustomToken, signInWithPopup } from 'firebase/auth';
import { toast } from 'sonner';
import { auth, googleProvider } from '../lib/firebase';
import { registerStudent, createSession } from '../services/api';
import { useAuthStore } from '../store/authStore';
import UsernameField from '../components/UsernameField';
import { INSTITUTIONAL_EMAIL_HINT, isInstitutionalEmail } from '../utils/institutionalEmail';

const PASSWORD_RE = /^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const markNeedsUsername = useAuthStore((s) => s.markNeedsUsername);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    username: '',
    email: '',
    password: '',
    avatar: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function validateStep1(): string | null {
    if (!form.nombres.trim()) return 'Los nombres son obligatorios.';
    if (!form.apellidos.trim()) return 'Los apellidos son obligatorios.';
    if (!form.username.trim()) return 'El nombre de usuario es obligatorio.';
    if (usernameAvailable === null) return 'Verifica la disponibilidad del nombre de usuario.';
    if (usernameAvailable === false) return 'El nombre de usuario no está disponible.';
    if (form.avatar.trim() && !/^https?:\/\/.+/.test(form.avatar.trim()))
      return 'El avatar debe ser una URL válida (http/https).';
    return null;
  }

  function validateStep2(): string | null {
    if (!form.email.trim()) return 'El correo es obligatorio.';
    if (!isInstitutionalEmail(form.email.trim())) return INSTITUTIONAL_EMAIL_HINT;
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!PASSWORD_RE.test(form.password)) return 'La contraseña debe incluir al menos una letra y un número.';
    return null;
  }

  function handleContinue(e: React.SyntheticEvent) {
    e.preventDefault();
    const err = validateStep1();
    if (err) { toast.error(err); return; }
    setStep(2);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const err = validateStep2();
    if (err) { toast.error(err); return; }

    setLoading(true);
    try {
      const { customToken } = await registerStudent({
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.avatar.trim() ? { avatar: form.avatar.trim() } : {}),
      });

      const credential = await signInWithCustomToken(auth, customToken);
      const idToken = await credential.user.getIdToken();
      const result = await createSession(idToken);
      if (!result.needsUsername) {
        setSession(result.token, result.user);
        toast.success('¡Registro exitoso! Bienvenido a CrossFlow.');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
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
        toast.success('Iniciando con Google. Por favor, completa tu nombre de usuario.');
        navigate('/username-setup', { replace: true });
      } else {
        setSession(result.token, result.user);
        toast.success('¡Registro exitoso con Google!');
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

  const canProceed =
    Boolean(form.nombres.trim()) &&
    Boolean(form.apellidos.trim()) &&
    usernameAvailable === true;

  const canSubmit =
    !loading &&
    !googleLoading &&
    Boolean(form.email.trim()) &&
    form.password.length >= 8 &&
    PASSWORD_RE.test(form.password);

  /* ── Avatar preview initials ── */
  const initials = form.nombres.trim().charAt(0).toUpperCase() + form.apellidos.trim().charAt(0).toUpperCase() || '?';
  const avatarIsValidUrl = /^https?:\/\/.+/.test(form.avatar.trim());

  return (
    <div className="min-h-screen flex" style={{ background: '#0F172A' }}>
      {/* ── Left panel: form ── */}
      <div className="flex flex-col justify-center w-full lg:max-w-[520px] px-8 sm:px-14 py-12" style={{ background: '#0F172A' }}>
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
        <h1 className="text-3xl font-bold text-white mb-1.5">Crear tu cuenta</h1>
        <p className="text-sm mb-7" style={{ color: '#94A3B8' }}>
          Únete a CrossFlow y empieza a colaborar en segundos.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 1 ? '#6366F1' : 'rgba(99,102,241,0.3)',
                color: step === 1 ? '#fff' : '#818CF8',
              }}
            >
              {step > 1 ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : '1'}
            </span>
            <span className="text-sm font-medium" style={{ color: step === 1 ? '#F8FAFC' : '#64748B' }}>Perfil</span>
          </div>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 2 ? '#6366F1' : 'rgba(255,255,255,0.08)',
                color: step === 2 ? '#fff' : '#475569',
              }}
            >
              2
            </span>
            <span className="text-sm font-medium" style={{ color: step === 2 ? '#F8FAFC' : '#475569' }}>Credenciales</span>
          </div>
        </div>

        {/* ── STEP 1: Perfil ── */}
        {step === 1 && (
          <form onSubmit={handleContinue} noValidate className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-none">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff' }}
                >
                  {avatarIsValidUrl ? (
                    <img src={form.avatar.trim()} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials !== '?' ? initials : (
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    )
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-0.5" style={{ color: '#CBD5E1' }}>Foto de perfil</p>
                <p className="text-xs mb-2" style={{ color: '#475569' }}>URL de imagen · opcional</p>
                <input
                  type="url"
                  value={form.avatar}
                  onChange={set('avatar')}
                  placeholder="https://ejemplo.com/foto.png"
                  autoComplete="off"
                  disabled={loading}
                  className="w-full px-3 py-2 rounded-lg text-xs transition disabled:opacity-50 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${avatarIsValidUrl || !form.avatar.trim() ? 'rgba(255,255,255,0.12)' : '#F87171'}`,
                    color: '#F8FAFC',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.25)'; }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = avatarIsValidUrl || !form.avatar.trim() ? 'rgba(255,255,255,0.12)' : '#F87171';
                  }}
                />
              </div>
            </div>

            {/* Nombres + Apellidos */}
            <div className="grid grid-cols-2 gap-3">
              <DarkInput
                label="Nombre"
                value={form.nombres}
                onChange={set('nombres')}
                placeholder="Mariana"
                autoComplete="given-name"
                disabled={loading}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                }
              />
              <DarkInput
                label="Apellidos"
                value={form.apellidos}
                onChange={set('apellidos')}
                placeholder="Rojas"
                autoComplete="family-name"
                disabled={loading}
              />
            </div>

            {/* Username */}
            <UsernameField
              value={form.username}
              onChange={(val) => setForm((prev) => ({ ...prev, username: val }))}
              onStatusChange={setUsernameAvailable}
              disabled={loading}
              label="Usuario"
              dark
            />

            <button
              type="submit"
              disabled={!canProceed || loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              style={{ background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
            >
              Continuar →
            </button>
          </form>
        )}

        {/* ── STEP 2: Credenciales ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
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
              Registrarse con Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <span className="text-xs" style={{ color: '#475569' }}>o con correo</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Email */}
            <DarkInput
              label="Correo institucional"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="tu@universidad.edu.co"
              autoComplete="email"
              disabled={loading}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              }
            />

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Mín. 8 caracteres con letras y números"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm transition disabled:opacity-50 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${
                      form.password.length === 0
                        ? 'rgba(255,255,255,0.12)'
                        : form.password.length >= 8 && PASSWORD_RE.test(form.password)
                        ? '#4ADE80'
                        : '#F87171'
                    }`,
                    color: '#F8FAFC',
                  }}
                  onFocus={(e) => {
                    if (form.password.length === 0) {
                      e.currentTarget.style.borderColor = '#6366F1';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.25)';
                    }
                  }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
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
              {form.password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  <li className="flex items-center gap-1.5 text-xs" style={{ color: form.password.length >= 8 ? '#4ADE80' : '#F87171' }}>
                    {form.password.length >= 8 ? (
                      <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    Mínimo 8 caracteres
                  </li>
                  <li className="flex items-center gap-1.5 text-xs" style={{ color: PASSWORD_RE.test(form.password) ? '#4ADE80' : '#F87171' }}>
                    {PASSWORD_RE.test(form.password) ? (
                      <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    Al menos una letra y un número
                  </li>
                </ul>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              style={{ background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {loading ? 'Creando cuenta…' : 'Crear cuenta →'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-full py-2 text-sm transition disabled:opacity-50"
              style={{ color: '#64748B' }}
            >
              ← Volver al perfil
            </button>
          </form>
        )}

        <p className="mt-7 text-sm text-center" style={{ color: '#64748B' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium transition hover:opacity-80" style={{ color: '#6366F1' }}>
            Iniciar sesión
          </Link>
        </p>
      </div>

      {/* ── Right panel: marketing (same as login) ── */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center px-16 py-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #1E293B 100%)' }}
      >
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.08)' }} />
        <div className="absolute -bottom-40 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(59,130,246,0.06)' }} />

        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 text-xs font-medium" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Estudio colaborativo en tiempo real
          </div>

          <h2 className="text-5xl font-bold leading-tight mb-5 text-white">
            Salas accesibles para aprender, crear y avanzar juntos.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: '#64748B' }}>
            Video HD, chat instantáneo, pizarra compartida y herramientas de accesibilidad WCAG 2.2 integradas en cada sesión.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Shared dark input ── */
function DarkInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  icon,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          className="w-full py-3 rounded-xl text-sm transition disabled:opacity-50 focus:outline-none"
          style={{
            paddingLeft: icon ? '2.5rem' : '1rem',
            paddingRight: '1rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#F8FAFC',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.25)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>
    </div>
  );
}
