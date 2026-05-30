import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { updateSala } from '../services/api';
import type { SalaPublica } from '../services/api';
import { salaShareCode } from '../utils/sala';
import { useAuthStore } from '../store/authStore';
import { useModalA11y } from '../hooks/useModalA11y';

interface Props {
  open: boolean;
  onClose: () => void;
  sala: Pick<SalaPublica, 'id' | 'nombre' | 'codigoInvitacion'>;
  onUpdated: (sala: SalaPublica) => void;
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

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export default function EditRoomModal({ open, onClose, sala, onUpdated }: Props) {
  const jwtToken = useAuthStore(s => s.jwtToken);
  const dialogRef = useModalA11y(open, {
    onClose,
    initialFocusSelector: '#edit-room-nombre',
  });

  const [nombre, setNombre] = useState(sala.nombre);
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const roomCode = salaShareCode(sala);

  useEffect(() => {
    if (open) {
      setNombre(sala.nombre);
      setNombreError(null);
      setSaving(false);
      setCopied(false);
    }
  }, [open, sala.nombre]);

  if (!open) return null;

  function validateNombre(): boolean {
    const v = nombre.trim();
    if (!v) { setNombreError('El nombre es obligatorio.'); return false; }
    if (v.length < 3) { setNombreError('El nombre debe tener al menos 3 caracteres.'); return false; }
    if (v.length > 80) { setNombreError('El nombre no puede superar los 80 caracteres.'); return false; }
    setNombreError(null);
    return true;
  }

  async function handleSave() {
    if (!validateNombre() || !jwtToken) return;
    if (nombre.trim() === sala.nombre.trim()) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSala(jwtToken, sala.id, nombre.trim());
      toast.success('Sala actualizada correctamente.');
      onUpdated(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar la sala.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el ID.');
    }
  }

  const nombreLen = nombre.length;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === dialogRef.current && !saving) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-room-title"
      aria-describedby="edit-room-desc"
      tabIndex={-1}
    >
      <div
        className="w-full max-w-[500px] rounded-2xl flex flex-col max-h-[min(92vh,100svh)] overflow-y-auto"
        style={{
          background: '#1A2235',
          border: '1px solid rgba(148,163,184,0.12)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        }}
      >
        <div className="px-5 sm:px-7 pt-5 sm:pt-7 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="edit-room-title" className="m-0 text-[18px] font-bold" style={{ color: '#F8FAFC', letterSpacing: '-0.02em' }}>
                Configuración de la sala
              </h2>
              <p id="edit-room-desc" className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                Edita el nombre de la sala. Solo el anfitrión puede guardar cambios.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-1.5 rounded-lg cursor-pointer border-0 flex-none"
              style={{ background: 'rgba(148,163,184,0.08)', color: '#64748B', opacity: saving ? 0.5 : 1 }}
              aria-label="Cerrar"
            >
              <XIcon />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-7 pb-5 sm:pb-7 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-room-nombre" className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
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
                id="edit-room-nombre"
                type="text"
                value={nombre}
                onChange={e => {
                  setNombre(e.target.value);
                  if (nombreError) setNombreError(null);
                }}
                onKeyDown={e => { if (e.key === 'Enter') void handleSave(); }}
                placeholder="Ej. Cálculo III · Sesión jueves"
                maxLength={80}
                autoFocus
                disabled={saving}
                aria-invalid={nombreError ? true : undefined}
                aria-describedby={nombreError ? 'edit-room-nombre-error' : undefined}
                required
                className="w-full pl-10 pr-14 py-3 rounded-[10px] text-[13.5px] outline-none disabled:opacity-60"
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
              <p id="edit-room-nombre-error" role="alert" className="m-0 text-[12.5px]" style={{ color: '#F87171' }}>
                {nombreError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="m-0 text-[13px] font-medium" style={{ color: '#94A3B8' }}>
              ID de la sala
            </p>
            <div
              className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 px-3 sm:px-4 py-3 rounded-[10px]"
              style={{
                background: '#0F172A',
                border: '1px solid rgba(148,163,184,0.18)',
              }}
            >
              <span className="flex-1 font-mono text-[15px] font-semibold tracking-widest break-all" style={{ color: '#F8FAFC' }}>
                {roomCode}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold cursor-pointer border-0 transition-colors"
                style={{
                  background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(99,102,241,0.18)',
                  color: copied ? '#4ADE80' : '#818CF8',
                }}
              >
                <CopyIcon />
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="m-0 text-[12px]" style={{ color: '#475569' }}>
              El ID no se puede modificar después de crear la sala.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-medium cursor-pointer"
              style={{
                background: 'rgba(148,163,184,0.08)',
                color: '#94A3B8',
                border: '1px solid rgba(148,163,184,0.16)',
                opacity: saving ? 0.5 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-[13.5px] font-semibold cursor-pointer text-white"
              style={{
                background: saving
                  ? 'rgba(99,102,241,0.5)'
                  : 'linear-gradient(180deg, #7477F5 0%, #5458E8 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: saving ? 'none' : '0 1px 0 rgba(255,255,255,0.14) inset, 0 4px 14px rgba(99,102,241,0.3)',
              }}
            >
              {saving && (
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
