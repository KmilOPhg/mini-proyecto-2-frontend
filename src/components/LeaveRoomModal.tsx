import { useState, useEffect } from 'react';
import { IconPhoneHangup, IconX } from './room/RoomIcons';
import { useModalA11y } from '../hooks/useModalA11y';

interface Props {
  open: boolean;
  onClose: () => void;
  salaNombre: string;
  isHost: boolean;
  onLeaveRoom: () => void;
  onEndSession: () => Promise<void>;
}

export default function LeaveRoomModal({
  open, onClose, salaNombre, isHost, onLeaveRoom, onEndSession,
}: Props) {
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useModalA11y(open, { onClose, closeOnEscape: !ending });

  useEffect(() => {
    if (open) {
      setEnding(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleEndSession() {
    setEnding(true);
    setError(null);
    try {
      await onEndSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo terminar la sesión.');
      setEnding(false);
    }
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === dialogRef.current && !ending) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-room-title"
      aria-describedby="leave-room-desc"
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
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-none"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}
              >
                <span style={{ transform: 'rotate(135deg)', display: 'inline-flex' }}>
                  <IconPhoneHangup size={18} strokeWidth={2} />
                </span>
              </div>
              <div>
                <h2 id="leave-room-title" className="m-0 text-[18px] font-bold" style={{ color: '#F8FAFC' }}>
                  {isHost ? '¿Cómo deseas salir?' : '¿Salir de la sala?'}
                </h2>
                <p id="leave-room-desc" className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                  {isHost
                    ? `Eres el anfitrión de "${salaNombre}". Elige si sales solo o terminas la sesión para todos.`
                    : `Vas a abandonar "${salaNombre}". Podrás volver a unirte con el ID de la sala.`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={ending}
              className="p-1.5 rounded-lg cursor-pointer border-0 flex-none"
              style={{ background: 'rgba(148,163,184,0.08)', color: '#64748B', opacity: ending ? 0.5 : 1 }}
              aria-label="Cerrar"
            >
              <IconX size={15} />
            </button>
          </div>

          {error && (
            <p role="alert" className="m-0 mb-3 text-[12.5px] px-3 py-2 rounded-[10px]" style={{ color: '#F87171', background: 'rgba(127,29,29,0.2)' }}>
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={ending}
              onClick={onLeaveRoom}
              className="w-full text-left px-4 py-3.5 rounded-[12px] cursor-pointer border transition-colors"
              style={{
                background: 'rgba(148,163,184,0.06)',
                border: '1px solid rgba(148,163,184,0.14)',
                opacity: ending ? 0.6 : 1,
              }}
            >
              <p className="m-0 text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>Salir de la sala</p>
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: '#64748B' }}>
                {isHost
                  ? 'Vuelves al inicio y la sesión sigue activa para los demás participantes.'
                  : 'Te desconectas y vuelves al inicio.'}
              </p>
            </button>

            {isHost && (
              <button
                type="button"
                disabled={ending}
                onClick={handleEndSession}
                className="w-full text-left px-4 py-3.5 rounded-[12px] cursor-pointer border transition-colors"
                style={{
                  background: 'rgba(127,29,29,0.2)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  opacity: ending ? 0.6 : 1,
                }}
              >
                <p className="m-0 text-[14px] font-semibold" style={{ color: '#FCA5A5' }}>
                  {ending ? 'Terminando sesión…' : 'Terminar sesión'}
                </p>
                <p className="m-0 mt-1 text-[12.5px]" style={{ color: '#F87171' }}>
                  Finaliza la sala para todos.
                </p>
              </button>
            )}
          </div>
        </div>

        <div className="px-7 pb-7 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={ending}
            className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-medium cursor-pointer"
            style={{
              background: 'rgba(148,163,184,0.08)',
              color: '#94A3B8',
              border: '1px solid rgba(148,163,184,0.16)',
              opacity: ending ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
