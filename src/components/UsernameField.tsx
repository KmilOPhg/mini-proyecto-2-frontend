import { useState, useEffect } from 'react';
import { checkUsernameAvailable } from '../services/api';

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

type Props = {
  value: string;
  onChange: (val: string) => void;
  onStatusChange?: (available: boolean | null) => void;
  disabled?: boolean;
  label?: string;
  dark?: boolean;
  excludeUsername?: string; // skip availability check when value matches (user's own username)
};

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export default function UsernameField({
  value,
  onChange,
  onStatusChange,
  disabled,
  label = 'Nombre de usuario',
  dark = false,
  excludeUsername,
}: Props) {
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [normalized, setNormalized] = useState('');
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    const trimmed = value.trim().toLowerCase();

    if (!trimmed) {
      setStatus('idle');
      onStatusChange?.(null);
      return;
    }

    // Own username — no need to check availability
    if (excludeUsername && trimmed === excludeUsername.trim().toLowerCase()) {
      setStatus('idle');
      onStatusChange?.(true);
      return;
    }

    if (!USERNAME_RE.test(trimmed)) {
      setStatus('invalid');
      onStatusChange?.(false);
      return;
    }

    setStatus('checking');
    onStatusChange?.(null);

    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(trimmed);
        setNormalized(result.username);
        if (result.available) {
          setStatus('available');
          onStatusChange?.(true);
        } else {
          setStatus('taken');
          onStatusChange?.(false);
        }
      } catch (err) {
        setApiMessage(err instanceof Error ? err.message : 'Error al verificar');
        setStatus('error');
        onStatusChange?.(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, excludeUsername]);

  const isError = status === 'taken' || status === 'invalid' || status === 'error';

  const borderStyle = dark
    ? {
        available: { borderColor: '#4ADE80' },
        error: { borderColor: '#F87171' },
        default: { borderColor: 'rgba(255,255,255,0.12)' },
      }[status === 'available' ? 'available' : isError ? 'error' : 'default']
    : undefined;

  const borderClass = dark
    ? ''
    : status === 'available'
    ? 'border-green-400 focus:ring-green-400'
    : isError
    ? 'border-red-400 focus:ring-red-400'
    : 'border-gray-200 focus:ring-indigo-500';

  const hint =
    status === 'idle'
      ? ''
      : status === 'checking'
      ? 'Verificando disponibilidad…'
      : status === 'available'
      ? `✓ "@${normalized}" está disponible`
      : status === 'taken'
      ? `✗ "@${normalized}" ya está en uso`
      : status === 'invalid'
      ? 'Solo letras minúsculas, números y _ (3-30 caracteres)'
      : apiMessage || 'Error al verificar disponibilidad';

  const hintColor = dark
    ? status === 'available'
      ? '#4ADE80'
      : isError
      ? '#F87171'
      : '#64748B'
    : status === 'available'
    ? 'text-green-600'
    : isError
    ? 'text-red-500'
    : 'text-gray-400';

  if (dark) {
    return (
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>
          {label}
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium select-none pointer-events-none" style={{ color: '#475569' }}>
            @
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="tu_usuario"
            autoComplete="username"
            className="w-full pl-8 pr-10 py-3 rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid',
              color: '#F8FAFC',
              ...borderStyle,
            }}
            onFocus={(e) => {
              if (status !== 'available' && !isError) {
                e.currentTarget.style.borderColor = '#6366F1';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.25)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              if (status !== 'available' && !isError) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }
            }}
          />
          {status === 'checking' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: '#64748B' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </span>
          )}
        </div>
        {hint && <p className="text-xs mt-1.5" style={{ color: hintColor as string }}>{hint}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 select-none pointer-events-none">
          @
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="tu_usuario"
          autoComplete="username"
          className={`w-full pl-8 pr-10 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition disabled:bg-gray-50 disabled:cursor-not-allowed ${borderClass}`}
        />
        {status === 'checking' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
      </div>
      {hint && <p className={`text-xs mt-1.5 ${hintColor as string}`}>{hint}</p>}
    </div>
  );
}
