import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithCustomToken, signInWithPopup } from 'firebase/auth';
import { toast } from 'sonner';
import { auth, googleProvider } from '../lib/firebase';
import { registerStudent, createSession } from '../services/api';
import { useAuthStore } from '../store/authStore';
import AuthLayout from '../components/AuthLayout';
import UsernameField from '../components/UsernameField';
import GoogleButton from '../components/GoogleButton';

const PASSWORD_RE = /^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const markNeedsUsername = useAuthStore((s) => s.markNeedsUsername);

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

  function validate(): string | null {
    if (!form.nombres.trim()) return 'Los nombres son obligatorios.';
    if (!form.apellidos.trim()) return 'Los apellidos son obligatorios.';
    if (!form.username.trim()) return 'El nombre de usuario es obligatorio.';
    if (usernameAvailable === null) return 'Verifica la disponibilidad del nombre de usuario.';
    if (usernameAvailable === false) return 'El nombre de usuario no está disponible.';
    if (!form.email.trim()) return 'El correo es obligatorio.';
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!PASSWORD_RE.test(form.password)) return 'La contraseña debe incluir al menos una letra y un número.';
    if (form.avatar.trim() && !/^https?:\/\/.+/.test(form.avatar.trim()))
      return 'El avatar debe ser una URL válida (http/https).';
    return null;
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { toast.error(validationError); return; }

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
      const idToken = await credential.user.getIdToken();
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
    } finally {
      setGoogleLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    !googleLoading &&
    Boolean(form.nombres.trim()) &&
    Boolean(form.apellidos.trim()) &&
    Boolean(form.email.trim()) &&
    form.password.length >= 8 &&
    usernameAvailable === true;

  return (
    <AuthLayout
      panelTitle="Crea tu cuenta y empieza hoy"
      panelSubtitle="Únete a CrossFlow y lleva tu aprendizaje al siguiente nivel."
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Crear cuenta</h1>
        <p className="text-gray-500 text-sm mb-7">Completa tus datos para registrarte.</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Nombres + Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombres</label>
              <input
                type="text"
                value={form.nombres}
                onChange={set('nombres')}
                placeholder="Juan"
                autoComplete="given-name"
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellidos</label>
              <input
                type="text"
                value={form.apellidos}
                onChange={set('apellidos')}
                placeholder="Pérez"
                autoComplete="family-name"
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Username */}
          <UsernameField
            value={form.username}
            onChange={(val) => setForm((prev) => ({ ...prev, username: val }))}
            onStatusChange={setUsernameAvailable}
            disabled={loading}
          />

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo institucional
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="correo@universidad.edu.co"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:bg-gray-50"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Mín. 8 caracteres con letras y números"
                autoComplete="new-password"
                required
                disabled={loading}
                className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:bg-gray-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Avatar (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Avatar{' '}
              <span className="text-gray-400 font-normal">(URL de imagen, opcional)</span>
            </label>
            <input
              type="url"
              value={form.avatar}
              onChange={set('avatar')}
              placeholder="https://ejemplo.com/foto.png"
              autoComplete="off"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:bg-gray-50"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">O</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <GoogleButton
          onClick={handleGoogle}
          loading={googleLoading}
          disabled={loading}
          label="Registrarse con Google"
        />

        <p className="mt-7 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
