import { IconMic, IconVideo } from './room/RoomIcons';
import { useModalA11y } from '../hooks/useModalA11y';
import type { MediaJoinPreferences } from '../hooks/useWebRTC';

interface Props {
  open: boolean;
  salaNombre: string;
  loading?: boolean;
  onChoose: (preferences: MediaJoinPreferences) => void;
}

export default function MediaJoinModal({ open, salaNombre, loading = false, onChoose }: Props) {
  const dialogRef = useModalA11y(open, {
    onClose: () => {},
    closeOnEscape: false,
    initialFocusSelector: '#media-join-both',
  });

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-join-title"
      aria-describedby="media-join-desc"
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
          <div className="flex items-start gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-none"
              style={{ background: 'rgba(99,102,241,0.18)', color: '#A5B4FC' }}
            >
              <IconVideo size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 id="media-join-title" className="m-0 text-[18px] font-bold" style={{ color: '#F8FAFC' }}>
                ¿Activar cámara y micrófono?
              </h2>
              <p id="media-join-desc" className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                Estás entrando a <strong style={{ color: '#CBD5E1' }}>{salaNombre}</strong>.
                Elige cómo quieres unirte. Puedes cambiarlo después desde los controles de la sala.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              id="media-join-both"
              type="button"
              disabled={loading}
              onClick={() => onChoose({ enableAudio: true, enableVideo: true })}
              className="w-full text-left px-4 py-3.5 rounded-[12px] cursor-pointer border transition-colors"
              style={{
                background: 'rgba(99,102,241,0.18)',
                border: '1px solid rgba(99,102,241,0.45)',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5" style={{ color: '#C7D2FE' }}>
                  <IconVideo size={15} strokeWidth={2.2} />
                  <IconMic size={15} strokeWidth={2.2} />
                </span>
                <p className="m-0 text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>
                  {loading ? 'Conectando…' : 'Activar cámara y micrófono'}
                </p>
              </div>
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: '#94A3B8' }}>
                Recomendado para participar con video y audio en la sala.
              </p>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => onChoose({ enableAudio: true, enableVideo: false })}
              className="w-full text-left px-4 py-3.5 rounded-[12px] cursor-pointer border transition-colors"
              style={{
                background: 'rgba(148,163,184,0.06)',
                border: '1px solid rgba(148,163,184,0.14)',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ color: '#94A3B8' }}>
                  <IconMic size={15} strokeWidth={2.2} />
                </span>
                <p className="m-0 text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>Solo micrófono</p>
              </div>
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: '#64748B' }}>
                Entras con audio, sin activar la cámara.
              </p>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => onChoose({ enableAudio: false, enableVideo: false })}
              className="w-full text-left px-4 py-3.5 rounded-[12px] cursor-pointer border transition-colors"
              style={{
                background: 'rgba(148,163,184,0.04)',
                border: '1px solid rgba(148,163,184,0.1)',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <p className="m-0 text-[14px] font-semibold" style={{ color: '#CBD5E1' }}>Entrar sin cámara ni micrófono</p>
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: '#64748B' }}>
                Podrás activarlos más tarde desde la barra de controles.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
