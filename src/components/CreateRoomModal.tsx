import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createSala } from '../services/api';
import type { SalaPublica } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { COMING_SOON_LABEL } from './ComingSoonButton';
import { useModalA11y } from '../hooks/useModalA11y';

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 1 | 2;
type Privacy = 'publica' | 'enlace';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (sala: SalaPublica) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────
const MATERIAS = [
  'Matemáticas', 'Cálculo', 'Álgebra Lineal', 'Estadística',
  'Física', 'Química', 'Biología', 'Ingeniería de Software',
  'Programación', 'Bases de Datos', 'Redes', 'Sistemas Operativos',
  'Economía', 'Contabilidad', 'Derecho', 'Medicina',
  'Psicología', 'Historia', 'Literatura', 'Inglés', 'Otra',
];

const FIELD_DISABLED_STYLE = { opacity: 0.45, cursor: 'not-allowed' } as const;

const AFORO_MIN = 2;
const AFORO_MAX = 50;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CRF-${part(3)}-${part(3)}`;
}

// ── Icons ────────────────────────────────────────────────────────────────────
function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function RoomIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="8" height="6" rx="1.5" />
      <rect x="13" y="5" width="8" height="6" rx="1.5" />
      <rect x="3" y="13" width="8" height="6" rx="1.5" />
      <rect x="13" y="13" width="8" height="6" rx="1.5" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1 as Step, label: 'Detalles' },
    { n: 2 as Step, label: 'Privacidad' },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center gap-0">
            {i > 0 && (
              <div
                className="w-8 h-px mx-1"
                style={{ background: done ? '#22C55E' : 'rgba(148,163,184,0.25)' }}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-none transition-colors"
                style={{
                  background: done ? '#22C55E' : active ? '#6366F1' : 'rgba(148,163,184,0.15)',
                  color: done || active ? '#fff' : '#64748B',
                }}
              >
                {done ? <CheckIcon /> : s.n}
              </div>
              <span
                className="text-[13px] font-medium"
                style={{ color: active ? '#F8FAFC' : done ? '#64748B' : '#64748B' }}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Privacy option card ───────────────────────────────────────────────────────
function PrivacyCard({
  value: _value, label, description, icon, selected, onSelect, disabled = false,
}: {
  value: Privacy; label: string; description: string;
  icon: React.ReactNode; selected: boolean; onSelect: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      title={disabled ? COMING_SOON_LABEL : undefined}
      aria-label={disabled ? `${label} — ${COMING_SOON_LABEL}` : label}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[12px] text-left border transition-all"
      style={{
        background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(148,163,184,0.04)',
        border: selected ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(148,163,184,0.14)',
        ...(disabled ? FIELD_DISABLED_STYLE : { cursor: 'pointer' }),
      }}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none"
        style={{
          background: selected ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.1)',
          color: selected ? '#818CF8' : '#64748B',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[13.5px] font-semibold" style={{ color: '#F8FAFC' }}>{label}</p>
        <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: '#64748B' }}>{description}</p>
      </div>
      <div
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none transition-colors"
        style={{
          borderColor: selected ? '#6366F1' : 'rgba(148,163,184,0.35)',
          background: selected ? '#6366F1' : 'transparent',
        }}
      >
        {selected && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CreateRoomModal({ open, onClose, onCreated }: Props) {
  const jwtToken = useAuthStore(s => s.jwtToken);
  const dialogRef = useModalA11y(open, {
    onClose,
    initialFocusSelector: '#create-room-nombre',
  });

  // Step
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Detalles
  const [nombre, setNombre] = useState('');
  const [materia, setMateria] = useState(MATERIAS[0]);
  const [aforo, setAforo] = useState(8);
  const [descripcion, setDescripcion] = useState('');
  const [nombreError, setNombreError] = useState<string | null>(null);

  // Step 2 — Privacidad
  const [privacy, setPrivacy] = useState<Privacy>('enlace');
  const [roomCode, setRoomCode] = useState(generateRoomCode);
  const [copied, setCopied] = useState(false);

  // Submit
  const [creating, setCreating] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setNombre('');
      setMateria(MATERIAS[0]);
      setAforo(8);
      setDescripcion('');
      setNombreError(null);
      setPrivacy('enlace');
      setRoomCode(generateRoomCode());
      setCopied(false);
      setCreating(false);
    }
  }, [open]);

  if (!open) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function validateNombre(): boolean {
    const v = nombre.trim();
    if (!v) { setNombreError('El nombre es obligatorio.'); return false; }
    if (v.length < 3) { setNombreError('El nombre debe tener al menos 3 caracteres.'); return false; }
    if (v.length > 80) { setNombreError('El nombre no puede superar los 80 caracteres.'); return false; }
    setNombreError(null);
    return true;
  }

  function handleContinuar() {
    if (!validateNombre()) return;
    setStep(2);
  }

  async function handleCreate() {
    if (!jwtToken) return;
    setCreating(true);
    try {
      const sala = await createSala(jwtToken, {
        nombre: nombre.trim(),
        codigoInvitacion: roomCode,
        aforoMaximo: aforo,
        privacidad: privacy,
        materia: materia !== 'Otra' ? materia : undefined,
        descripcion: descripcion.trim() || undefined,
      });
      toast.success('¡Sala creada correctamente!');
      onCreated?.(sala);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la sala.');
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el código.');
    }
  }

  const nombreLen = nombre.length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === dialogRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-room-title"
      aria-describedby="create-room-desc"
      tabIndex={-1}
    >
      <div
        className="w-full max-w-[500px] rounded-2xl flex flex-col"
        style={{
          background: '#1A2235',
          border: '1px solid rgba(148,163,184,0.12)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        }}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2
                id="create-room-title"
                className="m-0 text-[18px] font-bold"
                style={{ color: '#F8FAFC', letterSpacing: '-0.02em' }}
              >
                Crear nueva sala
              </h2>
              <p id="create-room-desc" className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                Configura tu sala colaborativa en pocos pasos.
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
          <StepIndicator current={step} />
        </div>

        {/* ── Step 1: Detalles ── */}
        {step === 1 && (
          <div className="px-7 pb-7 flex flex-col gap-5">
            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-room-nombre" className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
                Nombre de la sala
              </label>
              <div className="relative">
                <span
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: nombreError ? '#F87171' : '#475569' }}
                  aria-hidden="true"
                >
                  <RoomIcon />
                </span>
                <input
                  id="create-room-nombre"
                  type="text"
                  value={nombre}
                  onChange={e => {
                    setNombre(e.target.value);
                    if (nombreError) setNombreError(null);
                  }}
                  placeholder="Ej. Cálculo III · Sesión jueves"
                  maxLength={80}
                  autoFocus
                  aria-invalid={nombreError ? true : undefined}
                  aria-describedby={nombreError ? 'create-room-nombre-error' : undefined}
                  required
                  className="w-full pl-10 pr-14 py-3 rounded-[10px] text-[13.5px] outline-none"
                  style={{
                    background: '#0F172A',
                    color: '#F8FAFC',
                    border: nombreError
                      ? '1px solid rgba(239,68,68,0.5)'
                      : '1px solid rgba(148,163,184,0.18)',
                  }}
                />
                <span
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none"
                  style={{ color: nombreLen > 72 ? '#F87171' : '#475569' }}
                >
                  {nombreLen}/80
                </span>
              </div>
              {nombreError && (
                <p id="create-room-nombre-error" role="alert" className="flex items-center gap-1.5 m-0 text-[12.5px]" style={{ color: '#F87171' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                  {nombreError}
                </p>
              )}
            </div>

            {/* Materia + Aforo */}
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr auto' }}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
                  Materia
                </label>
                <div className="relative">
                  <select
                    value={materia}
                    onChange={e => setMateria(e.target.value)}
                    disabled
                    title={COMING_SOON_LABEL}
                    aria-label={`Materia — ${COMING_SOON_LABEL}`}
                    className="w-full px-3.5 py-3 rounded-[10px] text-[13.5px] outline-none appearance-none"
                    style={{
                      background: '#0F172A',
                      color: '#F8FAFC',
                      border: '1px solid rgba(148,163,184,0.18)',
                      ...FIELD_DISABLED_STYLE,
                    }}
                  >
                    {MATERIAS.map(m => (
                      <option key={m} value={m} style={{ background: '#0F172A' }}>{m}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
                  Aforo máximo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }}>
                    <UsersIcon />
                  </span>
                  <input
                    type="number"
                    value={aforo}
                    min={AFORO_MIN}
                    max={AFORO_MAX}
                    onChange={e => {
                      const v = Math.max(AFORO_MIN, Math.min(AFORO_MAX, Number(e.target.value) || AFORO_MIN));
                      setAforo(v);
                    }}
                    disabled
                    title={COMING_SOON_LABEL}
                    aria-label={`Aforo máximo — ${COMING_SOON_LABEL}`}
                    className="w-24 pl-9 pr-3 py-3 rounded-[10px] text-[13.5px] outline-none"
                    style={{
                      background: '#0F172A',
                      color: '#F8FAFC',
                      border: '1px solid rgba(148,163,184,0.18)',
                      ...FIELD_DISABLED_STYLE,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="¿Qué van a trabajar en esta sesión?"
                rows={4}
                maxLength={300}
                disabled
                title={COMING_SOON_LABEL}
                aria-label={`Descripción — ${COMING_SOON_LABEL}`}
                className="w-full px-3.5 py-3 rounded-[10px] text-[13.5px] outline-none resize-y"
                style={{
                  background: '#0F172A',
                  color: '#F8FAFC',
                  border: '1px solid rgba(148,163,184,0.18)',
                  minHeight: 96,
                  fontFamily: 'inherit',
                  ...FIELD_DISABLED_STYLE,
                }}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-3 pt-1">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-medium cursor-pointer"
                style={{
                  background: 'rgba(148,163,184,0.08)',
                  color: '#94A3B8',
                  border: '1px solid rgba(148,163,184,0.16)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleContinuar}
                className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-semibold cursor-pointer text-white"
                style={{
                  background: 'linear-gradient(180deg, #7477F5 0%, #5458E8 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.14) inset, 0 4px 14px rgba(99,102,241,0.3)',
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Privacidad ── */}
        {step === 2 && (
          <div className="px-7 pb-7 flex flex-col gap-5">
            {/* Options */}
            <div className="flex flex-col gap-2.5">
              <PrivacyCard
                value="publica"
                label="Pública"
                description="Visible para todos."
                icon={<GlobeIcon />}
                selected={privacy === 'publica'}
                onSelect={() => setPrivacy('publica')}
                disabled
              />
              <PrivacyCard
                value="enlace"
                label="Por enlace"
                description="Solo quienes tienen el código CRF pueden unirse."
                icon={<LinkIcon />}
                selected={privacy === 'enlace'}
                onSelect={() => setPrivacy('enlace')}
                disabled
              />
            </div>

            {/* Room code */}
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[13px] font-medium" style={{ color: '#94A3B8' }}>
                ID generado
              </p>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-[10px]"
                style={{
                  background: '#0F172A',
                  border: '1px solid rgba(148,163,184,0.18)',
                }}
              >
                <span className="flex-1 font-mono text-[15px] font-semibold tracking-widest" style={{ color: '#F8FAFC' }}>
                  <span style={{ color: '#475569' }}>CRF-</span>
                  <span>{roomCode.slice(4)}</span>
                </span>
                <button
                  onClick={() => setRoomCode(generateRoomCode())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium cursor-pointer border-0 transition-colors"
                  style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }}
                  title="Regenerar código"
                >
                  <RefreshIcon />
                  Regenerar
                </button>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold cursor-pointer border-0 transition-colors"
                  style={{
                    background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(99,102,241,0.18)',
                    color: copied ? '#4ADE80' : '#818CF8',
                  }}
                  title="Copiar código"
                >
                  <CopyIcon />
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="m-0 text-[12px]" style={{ color: '#475569' }}>
                Comparte este ID para invitar por código.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-3 pt-1">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-medium cursor-pointer"
                style={{
                  background: 'rgba(148,163,184,0.08)',
                  color: '#94A3B8',
                  border: '1px solid rgba(148,163,184,0.16)',
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13.5px] font-semibold cursor-pointer text-white"
                style={{
                  background: creating
                    ? 'rgba(99,102,241,0.5)'
                    : 'linear-gradient(180deg, #7477F5 0%, #5458E8 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: creating ? 'none' : '0 1px 0 rgba(255,255,255,0.14) inset, 0 4px 14px rgba(99,102,241,0.3)',
                }}
              >
                {creating ? (
                  <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <PlusIcon />
                )}
                {creating ? 'Creando…' : 'Crear sala'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
