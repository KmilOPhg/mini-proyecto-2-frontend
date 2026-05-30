import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const PRESET_AVATARS = [
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

function CameraIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

type Props = {
  value: string;
  onChange: (url: string) => void;
  initials: string;
  disabled?: boolean;
  compact?: boolean;
};

export default function AvatarPickerField({ value, onChange, initials, disabled = false, compact = false }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftSelection, setDraftSelection] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const confirmedUrl = value.trim();
  const displayInitials = initials.trim() || '?';
  const previewUrl = showPicker && draftSelection ? draftSelection : confirmedUrl;
  const avatarSize = compact ? 56 : 72;
  const avatarText = compact ? 'text-base' : 'text-xl';

  useEffect(() => {
    if (showPicker) {
      setDraftSelection(confirmedUrl || null);
    }
  }, [showPicker, confirmedUrl]);

  useEffect(() => {
    if (!showPicker) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showPicker]);

  function openPicker() {
    if (disabled) return;
    setShowPicker(true);
  }

  function cancelPicker() {
    setShowPicker(false);
    setDraftSelection(null);
    setImgError(false);
  }

  function acceptPicker() {
    if (!draftSelection) return;
    onChange(draftSelection);
    setImgError(false);
    setShowPicker(false);
    setDraftSelection(null);
  }

  function handleRemove() {
    onChange('');
    setImgError(false);
    setShowPicker(false);
    setDraftSelection(null);
  }

  const pickerOverlay = showPicker ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) cancelPicker(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-picker-title"
    >
      <div
        className="w-full max-w-[380px] rounded-xl p-4"
        style={{ background: '#1A2235', border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 25px 60px rgba(0,0,0,0.55)' }}
      >
        <p id="avatar-picker-title" className="mb-3 text-[13px] font-medium" style={{ color: '#F8FAFC' }}>
          Selecciona un avatar
        </p>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_AVATARS.map((url) => {
            const isSelected = draftSelection === url;
            return (
              <button
                key={url}
                type="button"
                onClick={() => {
                  setDraftSelection(url);
                  setImgError(false);
                }}
                disabled={disabled}
                className="relative rounded-full cursor-pointer border-0 p-0 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(148,163,184,0.08)',
                  outline: isSelected ? '2.5px solid #6366F1' : '2.5px solid transparent',
                  outlineOffset: 2,
                }}
                aria-label={`Avatar ${url.split('seed=')[1]}`}
                aria-pressed={isSelected}
              >
                <img src={url} alt="" className="w-full h-full rounded-full object-cover" style={{ background: '#1A2235' }} />
                {isSelected && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: '#6366F1', border: '2px solid #1A2235' }}>
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}>
          <button type="button" onClick={cancelPicker} disabled={disabled} className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium cursor-pointer" style={{ background: 'transparent', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.14)' }}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={acceptPicker}
            disabled={disabled || !draftSelection}
            className="px-4 py-1.5 rounded-[8px] text-[13px] font-semibold cursor-pointer text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(180deg, #7477F5 0%, #5458E8 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-4'}>
        <div className={`flex items-center ${compact ? 'gap-3' : 'gap-5'}`}>
          <div className="relative flex-none">
            <div
              className="rounded-full overflow-hidden flex items-center justify-center"
              style={{ width: avatarSize, height: avatarSize, background: 'linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)' }}
            >
              {previewUrl && !imgError ? (
                <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover bg-[#1A2235]" onError={() => setImgError(true)} />
              ) : (
                <span className={`${avatarText} font-bold text-white`}>{displayInitials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={showPicker ? cancelPicker : openPicker}
              disabled={disabled}
              className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center cursor-pointer border-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#6366F1', borderColor: compact ? '#0F172A' : '#1A2235' }}
              aria-label={showPicker ? 'Cancelar selección de avatar' : 'Elegir avatar'}
              aria-expanded={showPicker}
            >
              <CameraIcon />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-medium ${compact ? 'mb-0.5 text-[13px]' : 'mb-1 text-[13.5px]'}`} style={{ color: '#F8FAFC' }}>
              Foto de perfil
            </p>
            <p className={`${compact ? 'mb-2 text-[11px]' : 'mb-3 text-[12px]'}`} style={{ color: '#64748B' }}>
              Elige un avatar predeterminado
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={showPicker ? cancelPicker : openPicker}
                disabled={disabled}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(148,163,184,0.1)', color: '#F8FAFC', border: '1px solid rgba(148,163,184,0.2)' }}
              >
                {showPicker ? 'Cancelar' : 'Cambiar'}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || !confirmedUrl || showPicker}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'transparent', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.14)' }}
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      </div>
      {pickerOverlay}
    </>
  );
}
