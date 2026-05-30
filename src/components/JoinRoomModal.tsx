import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { joinSala, joinSalaPorCodigo } from '../services/api';
import { isCodigoInvitacion, parseSalaJoinInput } from '../utils/sala';
import { useAuthStore } from '../store/authStore';
import { useModalA11y } from '../hooks/useModalA11y';

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
  const dialogRef = useModalA11y(open, { onClose });
  const [salaId, setSalaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (open) {
      setSalaId('');
      setError(null);
      setJoining(false);
    }
  }, [open]);

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
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === dialogRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-room-title"
      aria-describedby="join-room-desc"
      tabIndex={-1}
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
              <p id="join-room-desc" className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
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
            <label htmlFor="join-room-id" className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>
              ID de la sala
            </label>
            <input
              id="join-room-id"
              type="text"
              value={salaId}
              onChange={e => { setSalaId(e.target.value); setError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') void handleJoin(); }}
              placeholder="Ej. CRF-7K3-92Q"
              disabled={joining}
              autoFocus
              aria-label="ID de la sala"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'join-room-error' : undefined}
              className="w-full px-3.5 py-3 rounded-[10px] text-[13.5px] outline-none font-mono disabled:opacity-50"
              style={{
                background: '#0F172A',
                color: '#F8FAFC',
                border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.18)'}`,
              }}
            />
            {error && (
              <p id="join-room-error" role="alert" className="m-0 text-[12.5px]" style={{ color: '#F87171' }}>{error}</p>
            )}
            <p className="m-0 text-[12px]" style={{ color: '#475569' }}>
              Usa el código CRF que aparece en la sala (botón Copiar).
            </p>
          </div>
        </div>

        <div className="px-7 pb-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={joining}
            className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'rgba(148,163,184,0.08)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.16)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={joining || !salaId.trim()}
            aria-label="Unirse a la sala"
            className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(180deg, #6F73F4 0%, #5458E8 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.16) inset, 0 4px 14px rgba(99,102,241,0.32)',
            }}
          >
            {joining ? 'Uniéndose…' : 'Unirse'}
          </button>
        </div>
      </div>
    </div>
  );
}
