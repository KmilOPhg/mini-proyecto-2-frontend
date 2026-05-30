import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { updateMyProfile, deleteMyAccount } from '../services/api';
import type { ProfileUpdateInput } from '../services/api';
import { useAuthStore } from '../store/authStore';
import UsernameField from './UsernameField';
import { applyA11ySettings, LS_SR, LS_HC, LS_FS } from '../utils/a11y';
import type { A11yFontSize } from '../utils/a11y';

type ModalTab = 'perfil' | 'cuenta' | 'accesibilidad' | 'peligro';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Lily',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Max',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Salem',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Pepper',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Milo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Coco',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Ruby',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Kira',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Nova',
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Small components ──────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative flex-none cursor-pointer border-0 rounded-full transition-colors overflow-hidden"
      style={{
        width: 44, height: 24,
        background: value ? '#6366F1' : '#374151',
        padding: 0,
      }}
    >
      <span
        className="absolute rounded-full transition-all duration-200"
        style={{
          width: 20, height: 20,
          top: 2,
          left: value ? 22 : 2,
          background: '#F8FAFC',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  );
}

function A11yFontSizeControl({ value, onChange }: { value: A11yFontSize; onChange: (v: A11yFontSize) => void }) {
  const sizes: { key: A11yFontSize; label: string }[] = [
    { key: 'sm', label: 'A−' },
    { key: 'md', label: 'A' },
    { key: 'lg', label: 'A+' },
    { key: 'xl', label: 'A++' },
  ];
  return (
    <div
      className="flex rounded-[8px] overflow-hidden"
      style={{ border: '1px solid rgba(148,163,184,0.2)' }}
    >
      {sizes.map(s => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          className="px-3.5 py-1.5 text-[13px] font-medium cursor-pointer border-0 transition-colors"
          style={{
            background: value === s.key ? '#6366F1' : 'transparent',
            color: value === s.key ? '#fff' : '#94A3B8',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M9 12h12M18 9l3 3-3 3" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4.5-6 8-6s7 2 8 6" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function getInitials(nombres: string | null, apellidos: string | null) {
  const n = nombres?.trim() ?? '';
  const a = apellidos?.trim() ?? '';
  return ((n[0] ?? '') + (a[0] ?? '')).toUpperCase() || '??';
}

const TABS: { key: ModalTab; label: string; danger?: boolean }[] = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'cuenta', label: 'Cuenta' },
  { key: 'accesibilidad', label: 'Accesibilidad' },
  { key: 'peligro', label: 'Zona de peligro', danger: true },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfileEditModal({ open, onClose }: Props) {
  const user = useAuthStore(s => s.user);
  const jwtToken = useAuthStore(s => s.jwtToken);
  const updateUser = useAuthStore(s => s.updateUser);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const [tab, setTab] = useState<ModalTab>('perfil');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Perfil
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarAction, setAvatarAction] = useState<'none' | 'change' | 'remove'>('none');
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'nombres' | 'apellidos', string>>>({});

  // Cuenta — cambio de contraseña
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  // Accesibilidad (localStorage)
  const [screenReader, setScreenReader] = useState(() =>
    localStorage.getItem(LS_SR) !== 'false'
  );
  const [highContrast, setHighContrast] = useState(() =>
    localStorage.getItem(LS_HC) === 'true'
  );
  const [fontSize, setFontSize] = useState<A11yFontSize>(() =>
    (localStorage.getItem(LS_FS) as A11yFontSize) ?? 'md'
  );

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && open) {
      setNombres(user.nombres ?? '');
      setApellidos(user.apellidos ?? '');
      setUsername(user.username ?? '');
      setAvatarUrl(user.avatar ?? '');
      setAvatarImgError(false);
      setShowAvatarPicker(false);
      setAvatarAction('none');
      setConfirmDelete(false);
      setTab('perfil');
      setSaving(false);
      setDeleting(false);
      setFieldErrors({});
      setUsernameAvailable(null);
      setShowPwForm(false);
      setNewPw('');
      setConfirmPw('');
      setPwError(null);
      setSavingPw(false);
    }
  }, [user, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !user) return null;
  const u = user; // const alias — narrows out null for closures

  const isGoogleUser =
    auth.currentUser?.providerData.some(p => p.providerId === 'google.com') ?? false;

  const currentAvatarPreview =
    avatarAction === 'remove' ? null
    : avatarAction === 'change' ? (avatarUrl.trim() || null)
    : (u.avatar ?? null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (tab === 'accesibilidad') {
      localStorage.setItem(LS_SR, String(screenReader));
      localStorage.setItem(LS_HC, String(highContrast));
      localStorage.setItem(LS_FS, fontSize);
      applyA11ySettings({ screenReader, highContrast, fontSize });
      toast.success('Preferencias de accesibilidad guardadas.');
      return;
    }

    if (tab === 'cuenta') {
      if (!isGoogleUser && showPwForm) await handlePasswordChange();
      else onClose();
      return;
    }

    if (tab === 'peligro') {
      onClose();
      return;
    }

    // Perfil
    if (!jwtToken) return;

    const usernameChanged = username.trim().toLowerCase() !== (u.username ?? '').trim().toLowerCase();
    if (usernameChanged && usernameAvailable !== true) {
      toast.info(
        usernameAvailable === null
          ? 'Esperando verificación del usuario…'
          : 'Este nombre de usuario ya está en uso.'
      );
      return;
    }

    if (!validatePerfilFields()) return;

    const payload: ProfileUpdateInput = {};
    const trimNombres = nombres.trim();
    const trimApellidos = apellidos.trim();
    const trimUsername = username.trim();

    if (trimNombres !== (u.nombres ?? '').trim()) payload.nombres = trimNombres;
    if (trimApellidos !== (u.apellidos ?? '').trim()) payload.apellidos = trimApellidos;
    if (trimUsername !== (u.username ?? '').trim()) payload.username = trimUsername;

    if (avatarAction === 'remove') {
      payload.avatar = null;
    } else if (avatarAction === 'change') {
      const newUrl = avatarUrl.trim();
      if (newUrl !== (u.avatar ?? '').trim()) payload.avatar = newUrl || null;
    }

    if (Object.keys(payload).length === 0) {
      toast.info('No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile(jwtToken, payload);
      updateUser(updated);
      toast.success('Perfil actualizado correctamente.');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los cambios.';
      // Map backend messages to the corresponding field
      const backendFieldMap: Record<string, 'username' | 'nombres' | 'apellidos'> = {
        'Este nombre de usuario ya está en uso.': 'username',
      };
      const field = backendFieldMap[msg];
      if (field) setFieldErrors({ [field]: msg });
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function validatePerfilFields(): boolean {
    const errors: typeof fieldErrors = {};
    const n = nombres.trim();
    const a = apellidos.trim();

    if (n.length > 120)
      errors.nombres = 'El nombre no puede superar los 120 caracteres.';
    if (a.length > 120)
      errors.apellidos = 'Los apellidos no pueden superar los 120 caracteres.';
    // username validation is handled by UsernameField in real time

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validatePassword(pw: string, confirm: string): string | null {
    if (!pw) return 'La contraseña es obligatoria.';
    if (pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/.test(pw))
      return 'La contraseña debe incluir al menos una letra y un número.';
    if (pw !== confirm) return 'Las contraseñas no coinciden.';
    return null;
  }

  async function handlePasswordChange() {
    const error = validatePassword(newPw, confirmPw);
    if (error) { setPwError(error); return; }

    const currentUser = auth.currentUser;
    if (!currentUser) { setPwError('No hay sesión activa. Vuelve a iniciar sesión.'); return; }

    setSavingPw(true);
    setPwError(null);
    try {
      await updatePassword(currentUser, newPw);
      toast.success('Contraseña actualizada correctamente.');
      setShowPwForm(false);
      setNewPw('');
      setConfirmPw('');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/requires-recent-login') {
        setPwError('Por seguridad, cierra sesión y vuelve a iniciar sesión antes de cambiar la contraseña.');
      } else if (code === 'auth/weak-password') {
        setPwError('La contraseña debe tener al menos 8 caracteres.');
      } else if (code === 'auth/operation-not-allowed') {
        setPwError('Tu cuenta no admite contraseña directa. Usa el proveedor con el que iniciaste sesión.');
      } else {
        setPwError('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
      }
    } finally {
      setSavingPw(false);
    }
  }

  async function handleLogout() {
    await logout();
    toast.success('Sesión cerrada correctamente.');
    navigate('/login', { replace: true });
  }

  async function handleDeleteAccount() {
    if (!jwtToken) return;
    setDeleting(true);
    try {
      await deleteMyAccount(jwtToken);
      await logout();
      toast.success('Cuenta eliminada correctamente.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la cuenta.');
      setDeleting(false);
    }
  }

  const initials = getInitials(u.nombres, u.apellidos);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: '#1A2235',
          border: '1px solid rgba(148,163,184,0.12)',
          maxHeight: '90vh',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-7 pt-7 pb-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2
                id="profile-modal-title"
                className="m-0 text-[17px] font-semibold"
                style={{ color: '#F8FAFC', letterSpacing: '-0.015em' }}
              >
                Perfil y preferencias
              </h2>
              <p className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                Gestiona tu identidad, accesibilidad y privacidad.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg cursor-pointer border-0 flex-none"
              style={{ background: 'rgba(148,163,184,0.08)', color: '#64748B' }}
              aria-label="Cerrar"
            >
              <XIcon />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex" style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
            {TABS.map(t => {
              const active = tab === t.key;
              const color = t.danger
                ? (active ? '#EF4444' : '#F87171')
                : (active ? '#F8FAFC' : '#64748B');
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="px-4 py-2.5 text-[13px] font-medium cursor-pointer border-0 transition-colors"
                  style={{
                    background: 'transparent',
                    color,
                    borderBottom: `2px solid ${active ? (t.danger ? '#EF4444' : '#6366F1') : 'transparent'}`,
                    marginBottom: -1,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* ──────── Perfil ──────── */}
          {tab === 'perfil' && (
            <div className="flex flex-col gap-6">
              {/* Avatar */}
              <div className="flex items-center gap-5">
                {/* Avatar preview */}
                <div className="relative flex-none">
                  <div
                    className="w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)' }}
                  >
                    {currentAvatarPreview && !avatarImgError ? (
                      <img
                        src={currentAvatarPreview}
                        alt="Avatar"
                        className="w-full h-full object-cover bg-[#1A2235]"
                        onError={() => setAvatarImgError(true)}
                      />
                    ) : (
                      <span className="text-xl font-bold text-white">{initials}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowAvatarPicker(v => !v)}
                    className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center cursor-pointer border-2"
                    style={{ background: '#6366F1', borderColor: '#1A2235' }}
                    aria-label="Elegir avatar"
                  >
                    <CameraIcon />
                  </button>
                </div>

                {/* Avatar info + actions */}
                <div className="flex-1 min-w-0">
                  <p className="mb-1 text-[13.5px] font-medium" style={{ color: '#F8FAFC' }}>
                    Foto de perfil
                  </p>
                  <p className="mb-3 text-[12px]" style={{ color: '#64748B' }}>
                    Elige un avatar predeterminado
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAvatarPicker(v => !v)}
                      className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium cursor-pointer"
                      style={{ background: 'rgba(148,163,184,0.1)', color: '#F8FAFC', border: '1px solid rgba(148,163,184,0.2)' }}
                    >
                      {showAvatarPicker ? 'Cerrar' : 'Cambiar'}
                    </button>
                    <button
                      onClick={() => {
                        setAvatarAction('remove');
                        setAvatarUrl('');
                        setAvatarImgError(false);
                        setShowAvatarPicker(false);
                      }}
                      className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium cursor-pointer"
                      style={{ background: 'transparent', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.14)' }}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>

              {/* Avatar grid picker */}
              {showAvatarPicker && (
                <div
                  className="rounded-xl p-3"
                  style={{ background: '#0F172A', border: '1px solid rgba(148,163,184,0.12)' }}
                >
                  <p className="mb-2.5 text-[12px] font-medium" style={{ color: '#64748B' }}>
                    Selecciona un avatar
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((url) => {
                      const isSelected = avatarUrl === url && avatarAction === 'change';
                      return (
                        <button
                          key={url}
                          onClick={() => {
                            setAvatarUrl(url);
                            setAvatarAction('change');
                            setAvatarImgError(false);
                          }}
                          className="relative rounded-full cursor-pointer border-0 p-0 transition-transform hover:scale-110"
                          style={{
                            width: 52, height: 52,
                            background: 'rgba(148,163,184,0.08)',
                            outline: isSelected ? '2.5px solid #6366F1' : '2.5px solid transparent',
                            outlineOffset: 2,
                          }}
                          aria-label={`Avatar ${url.split('seed=')[1]}`}
                          aria-pressed={isSelected}
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                            style={{ background: '#1A2235' }}
                          />
                          {isSelected && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ background: '#6366F1', border: '2px solid #0F172A' }}
                            >
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Divider />

              {/* Nombres / Apellidos */}
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <InputField label="Nombre completo" icon={<UserIcon />} error={fieldErrors.nombres}>
                  <input
                    type="text"
                    value={nombres}
                    onChange={e => {
                      setNombres(e.target.value);
                      setFieldErrors(prev => ({ ...prev, nombres: undefined }));
                    }}
                    placeholder="Tus nombres"
                    className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[13.5px] outline-none"
                    style={{
                      ...inputStyle,
                      border: fieldErrors.nombres
                        ? '1px solid rgba(239,68,68,0.5)'
                        : '1px solid rgba(148,163,184,0.18)',
                    }}
                  />
                </InputField>
                <InputField label="Apellidos" icon={<UserIcon />} error={fieldErrors.apellidos}>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={e => {
                      setApellidos(e.target.value);
                      setFieldErrors(prev => ({ ...prev, apellidos: undefined }));
                    }}
                    placeholder="Tus apellidos"
                    className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[13.5px] outline-none"
                    style={{
                      ...inputStyle,
                      border: fieldErrors.apellidos
                        ? '1px solid rgba(239,68,68,0.5)'
                        : '1px solid rgba(148,163,184,0.18)',
                    }}
                  />
                </InputField>
              </div>

              {/* Username — real-time availability check */}
              <UsernameField
                dark
                label="Usuario"
                value={username}
                onChange={setUsername}
                onStatusChange={setUsernameAvailable}
                excludeUsername={u.username ?? undefined}
              />
            </div>
          )}

          {/* ──────── Cuenta ──────── */}
          {tab === 'cuenta' && (
            <div className="flex flex-col">
              {/* Correo electrónico — solo lectura */}
              <AccountRow
                title="Correo electrónico"
                description={
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>{u.email}</span>
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)' }}
                    >
                      verificado
                    </span>
                  </span>
                }
              />
              <Divider />

              {/* Contraseña */}
              <div className="py-4 flex flex-col gap-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="m-0 text-[13.5px] font-semibold" style={{ color: '#F8FAFC' }}>Contraseña</p>
                    <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: '#64748B' }}>
                      {isGoogleUser
                        ? 'Tu cuenta usa Google — gestiona la contraseña desde tu cuenta de Google.'
                        : showPwForm
                          ? 'Ingresa y confirma tu nueva contraseña.'
                          : 'Última actualización desconocida.'}
                    </p>
                  </div>
                  {!isGoogleUser && (
                    <button
                      onClick={() => { setShowPwForm(v => !v); setPwError(null); setNewPw(''); setConfirmPw(''); }}
                      className="flex-none px-3.5 py-1.5 rounded-[9px] text-[13px] font-medium cursor-pointer"
                      style={{ background: 'rgba(148,163,184,0.1)', color: '#F8FAFC', border: '1px solid rgba(148,163,184,0.2)' }}
                    >
                      {showPwForm ? 'Cancelar' : 'Cambiar'}
                    </button>
                  )}
                  {isGoogleUser && (
                    <span
                      className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12.5px]"
                      style={{ background: 'rgba(148,163,184,0.06)', color: '#475569', border: '1px solid rgba(148,163,184,0.12)' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Cuenta Google
                    </span>
                  )}
                </div>

                {showPwForm && (
                  <div className="mt-4 flex flex-col gap-3">
                    {/* Nueva contraseña */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12.5px]" style={{ color: '#94A3B8' }}>Nueva contraseña</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={e => { setNewPw(e.target.value); setPwError(null); }}
                        placeholder="Mínimo 8 caracteres"
                        autoFocus
                        className="w-full px-3 py-2.5 rounded-[10px] text-[13.5px] outline-none"
                        style={{
                          ...inputStyle,
                          border: pwError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(148,163,184,0.18)',
                        }}
                      />
                    </div>

                    {/* Confirmar contraseña */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12.5px]" style={{ color: '#94A3B8' }}>Confirmar contraseña</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={e => { setConfirmPw(e.target.value); setPwError(null); }}
                        placeholder="Repite la nueva contraseña"
                        className="w-full px-3 py-2.5 rounded-[10px] text-[13.5px] outline-none"
                        style={{
                          ...inputStyle,
                          border: pwError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(148,163,184,0.18)',
                        }}
                      />
                    </div>

                    {/* Error message */}
                    {pwError && (
                      <p className="flex items-start gap-1.5 text-[12.5px] m-0" style={{ color: '#F87171' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none mt-px" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                        </svg>
                        {pwError}
                      </p>
                    )}

                    {/* Requisitos */}
                    <ul className="m-0 pl-0 list-none flex flex-col gap-1">
                      {[
                        { ok: newPw.length >= 8, text: 'Mínimo 8 caracteres' },
                        { ok: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(newPw) && /\d/.test(newPw), text: 'Al menos una letra y un número' },
                        { ok: newPw.length > 0 && newPw === confirmPw, text: 'Las contraseñas coinciden' },
                      ].map(r => (
                        <li key={r.text} className="flex items-center gap-1.5 text-[12px]" style={{ color: r.ok ? '#4ADE80' : '#475569' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            {r.ok ? <path d="M20 6L9 17l-5-5"/> : <path d="M18 6L6 18M6 6l12 12"/>}
                          </svg>
                          {r.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Divider />

              {/* Cerrar sesión */}
              <AccountRow
                title="Cerrar sesión"
                description="Sal de tu cuenta en este dispositivo."
                action={
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] text-[13px] font-medium cursor-pointer"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      color: '#F87171',
                      border: '1px solid rgba(239,68,68,0.28)',
                    }}
                  >
                    <LogoutIcon />
                    Cerrar sesión
                  </button>
                }
              />
            </div>
          )}

          {/* ──────── Accesibilidad ──────── */}
          {tab === 'accesibilidad' && (
            <div className="flex flex-col">
              <AccountRow
                title="Lector de pantalla optimizado"
                description="Activado por defecto · Anuncios extendidos, descripciones largas y atajos extra. La base WCAG 2.2 siempre está activa."
                action={<Toggle value={screenReader} onChange={setScreenReader} />}
              />
              <Divider />
              <AccountRow
                title="Alto contraste WCAG AAA"
                description="Aumenta la diferencia de contraste de superficies y texto."
                action={<Toggle value={highContrast} onChange={setHighContrast} />}
              />
              <Divider />
              <AccountRow
                title="Tamaño de texto"
                description="Escala global de la aplicación."
                action={<A11yFontSizeControl value={fontSize} onChange={setFontSize} />}
              />
            </div>
          )}

          {/* ──────── Zona de peligro ──────── */}
          {tab === 'peligro' && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.04)' }}
            >
              {/* Card header */}
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
                <h3 className="m-0 mb-1 text-[13.5px] font-semibold" style={{ color: '#FCA5A5' }}>
                  Zona de peligro
                </h3>
                <p className="m-0 text-[12.5px]" style={{ color: '#F87171' }}>
                  Estas acciones afectan permanentemente tu cuenta. Procede con cuidado.
                </p>
              </div>

              {/* Eliminar cuenta row */}
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="m-0 text-[13.5px] font-semibold" style={{ color: '#F8FAFC' }}>
                    Eliminar cuenta
                  </p>
                  <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: '#64748B' }}>
                    Esta acción es irreversible. Tus salas y grabaciones se eliminarán.
                  </p>
                </div>

                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex-none inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] text-[13px] font-medium cursor-pointer whitespace-nowrap"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.28)' }}
                  >
                    <TrashIcon />
                    Eliminar cuenta
                  </button>
                ) : (
                  <div className="flex-none flex flex-col gap-2 items-end">
                    <p className="m-0 text-[12px] font-medium text-right" style={{ color: '#FCA5A5' }}>
                      ¿Seguro? No se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium cursor-pointer"
                        style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.2)' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        className="px-3 py-1.5 rounded-[8px] text-[13px] font-semibold cursor-pointer"
                        style={{ background: deleting ? 'rgba(220,38,38,0.5)' : '#DC2626', color: 'white' }}
                      >
                        {deleting ? 'Eliminando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="px-7 py-4 flex justify-end gap-3 flex-none"
          style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[10px] text-[13.5px] font-medium cursor-pointer"
            style={{ background: 'rgba(148,163,184,0.08)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.16)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || savingPw}
            className="px-5 py-2 rounded-[10px] text-[13.5px] font-semibold cursor-pointer text-white"
            style={{
              background: (saving || savingPw)
                ? 'rgba(99,102,241,0.5)'
                : 'linear-gradient(180deg, #7477F5 0%, #5458E8 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: (saving || savingPw) ? 'none' : '0 1px 0 rgba(255,255,255,0.14) inset, 0 4px 14px rgba(99,102,241,0.3)',
            }}
          >
            {savingPw ? 'Actualizando...' : saving ? 'Guardando...' : (tab === 'cuenta' && showPwForm) ? 'Actualizar contraseña' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared layout helpers ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#0F172A',
  color: '#F8FAFC',
  border: '1px solid rgba(148,163,184,0.18)',
};

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(148,163,184,0.1)', margin: 0 }} />;
}

function AccountRow({
  title,
  description,
  action,
}: {
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="m-0 text-[13.5px] font-semibold" style={{ color: '#F8FAFC' }}>{title}</p>
        <div className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: '#64748B' }}>{description}</div>
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}

function InputField({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px]" style={{ color: error ? '#F87171' : '#94A3B8' }}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: error ? '#F87171' : '#475569' }}>
          {icon}
        </span>
        {children}
      </div>
      {error && <FieldError msg={error} />}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="flex items-start gap-1.5 m-0 text-[12px] leading-snug" style={{ color: '#F87171' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none mt-[1px]" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      {msg}
    </p>
  );
}
