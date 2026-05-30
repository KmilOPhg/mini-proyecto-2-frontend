import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { joinSala, joinSalaPorCodigo } from '../services/api';
import { isCodigoInvitacion, parseSalaJoinInput } from '../utils/sala';
import { useAuthStore } from '../store/authStore';

import { COMING_SOON_LABEL } from './ComingSoonButton';

interface Props {
  open: boolean;
  onClose: () => void;
  onJoined: (salaId: string) => void;
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function JoinRoomModal({ open, onClose, onJoined }: Props) {
  const jwtToken = useAuthStore(s => s.jwtToken);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [salaId, setSalaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [_joining, setJoining] = useState(false);

  useEffect(() => {
    if (open) {
      setSalaId('');
      setError(null);
      setJoining(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  async function handleJoin() {
    const parsed = parseSalaJoinInput(salaId);
    if (!parsed) { setError('Ingresa el ID de la sala.'); return; }
    if (!jwtToken) return;

    setJoining(true);
    setError(null);
    try {
      const sala = isCodigoInvitacion(parsed)
        ? await joinSalaPorCodigo(jwtToken, parsed)
        : await joinSala(jwtToken, parsed);
      toast.success(`Te uniste a "${sala.nombre}".`);
      onJoined(sala.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo unir a la sala.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-room-title"
    >
      <div
        className="w-full max-w-[440px] rounded-2xl flex flex-col"
        style={{
          background: '#1A2235',
          border: '1px solid rgba(148,163,184,0.12)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        }}
      >
        <div className="px-7 pt-7 pb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 id="join-room-title" className="m-0 text-[18px] font-bold" style={{ color: '#F8FAFC' }}>
                Unirse por ID
              </h2>
              <p className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                Ingresa el identificador de la sala para entrar.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg cursor-pointer border-0"
              style={{ background: 'rgba(148,163,184,0.08)', color: '#64748B' }}
              aria-label="Cerrar"
            >
              <XIcon />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
              ID de la sala
            </label>
            <input
              type="text"
              value={salaId}
              onChange={e => { setSalaId(e.target.value); setError(null); }}
              placeholder="Ej. CRF-7K3-92Q"
              disabled
              title={COMING_SOON_LABEL}
              aria-label={`ID de la sala — ${COMING_SOON_LABEL}`}
              className="w-full px-3.5 py-3 rounded-[10px] text-[13.5px] outline-none font-mono"
              style={{
                background: '#0F172A',
                color: '#F8FAFC',
                border: '1px solid rgba(148,163,184,0.18)',
                opacity: 0.45,
                cursor: 'not-allowed',
              }}
            />
            {error && (
              <p className="m-0 text-[12.5px]" style={{ color: '#F87171' }}>{error}</p>
            )}
            <p className="m-0 text-[12px]" style={{ color: '#475569' }}>
              Usa el código CRF que aparece en la sala (botón Copiar).
            </p>
          </div>
        </div>

        <div className="px-7 pb-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-medium cursor-pointer"
            style={{ background: 'rgba(148,163,184,0.08)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.16)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleJoin}
            disabled
            title={COMING_SOON_LABEL}
            aria-label={`Unirse — ${COMING_SOON_LABEL}`}
            className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-semibold text-white"
            style={{
              background: 'rgba(99,102,241,0.35)',
              border: '1px solid rgba(255,255,255,0.06)',
              opacity: 0.45,
              cursor: 'not-allowed',
            }}
          >
            Unirse
          </button>
        </div>
      </div>
    </div>
  );
}
