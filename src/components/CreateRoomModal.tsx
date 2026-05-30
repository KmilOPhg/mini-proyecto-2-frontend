import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createSala } from '../services/api';
import type { SalaPublica } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useModalA11y } from '../hooks/useModalA11y';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (sala: SalaPublica) => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CRF-${part(3)}-${part(3)}`;
}

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

export default function CreateRoomModal({ open, onClose, onCreated }: Props) {
  const jwtToken = useAuthStore(s => s.jwtToken);
  const dialogRef = useModalA11y(open, {
    onClose,
    initialFocusSelector: '#create-room-nombre',
  });

  const [nombre, setNombre] = useState('');
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState(generateRoomCode);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre('');
      setNombreError(null);
      setRoomCode(generateRoomCode());
      setCopied(false);
      setCreating(false);
    }
  }, [open]);

  if (!open) return null;

  function validateNombre(): boolean {
    const v = nombre.trim();
    if (!v) { setNombreError('El nombre es obligatorio.'); return false; }
    if (v.length < 3) { setNombreError('El nombre debe tener al menos 3 caracteres.'); return false; }
    if (v.length > 80) { setNombreError('El nombre no puede superar los 80 caracteres.'); return false; }
    setNombreError(null);
    return true;
  }

  async function handleCreate() {
    if (!validateNombre() || !jwtToken) return;
    setCreating(true);
    try {
      const sala = await createSala(jwtToken, {
        nombre: nombre.trim(),
        codigoInvitacion: roomCode,
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
        <div className="px-7 pt-7 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="create-room-title"
                className="m-0 text-[18px] font-bold"
                style={{ color: '#F8FAFC', letterSpacing: '-0.02em' }}
              >
                Crear nueva sala
              </h2>
              <p id="create-room-desc" className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                Elige un nombre y comparte el ID para invitar a otros.
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
        </div>

        <div className="px-7 pb-7 flex flex-col gap-5">
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
                type="button"
                onClick={() => setRoomCode(generateRoomCode())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium cursor-pointer border-0 transition-colors"
                style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }}
                title="Regenerar código"
              >
                <RefreshIcon />
                Regenerar
              </button>
              <button
                type="button"
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

          <div className="flex justify-between gap-3 pt-1">
            <button
              type="button"
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
              type="button"
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
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
      </div>
    </div>
  );
}
