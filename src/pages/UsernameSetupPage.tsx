import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { completeGoogleUsername } from '../services/api';
import { useAuthStore } from '../store/authStore';
import UsernameField from '../components/UsernameField';

export default function UsernameSetupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);

  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!usernameAvailable) return;

    setLoading(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('No hay sesión activa. Vuelve a iniciar sesión con Google.');
      const idToken = await firebaseUser.getIdToken();
      const result = await completeGoogleUsername(idToken, username.trim());
      setSession(result.token, result.user);
      toast.success('¡Nombre de usuario configurado con éxito!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el nombre de usuario');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    await logout();
    toast.success('Sesión cerrada correctamente.');
    navigate('/login', { replace: true });
  }

  const canSubmit = !loading && usernameAvailable === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] flex items-center justify-center p-6">
      {/* Decorative blobs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 -right-20 w-[28rem] h-[28rem] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-gray-900 text-lg font-bold">CrossFlow</span>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.nombres}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                {user.nombres.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.nombres} {user.apellidos}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Elige tu nombre de usuario</h1>
        <p className="text-gray-500 text-sm mb-7">
          Este nombre te identificará en CrossFlow. Solo letras minúsculas, números y guion bajo (3–30 caracteres).
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <UsernameField
            value={username}
            onChange={setUsername}
            onStatusChange={setUsernameAvailable}
            disabled={loading}
            label="Nombre de usuario"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? 'Guardando…' : 'Continuar al dashboard'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
          >
            Cancelar y salir
          </button>
        </form>
      </div>
    </div>
  );
}
