import { useState, useEffect, useRef } from 'react';
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

function sanitizeCodePart(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
}

function parseCodeParts(raw: string): { part1: string; part2: string } | null {
  const parsed = parseSalaJoinInput(raw);
  const full = parsed.match(/^CRF-([A-Z0-9]{3})-([A-Z0-9]{3})$/);
  if (full) return { part1: full[1]!, part2: full[2]! };
  const partial = raw.trim().toUpperCase().match(/^([A-Z0-9]{3})-([A-Z0-9]{3})$/);
  if (partial) return { part1: partial[1]!, part2: partial[2]! };
  return null;
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function JoinRoomModal({ open, onClose, onJoined }: Props) {
  const jwtToken = useAuthStore(s => s.jwtToken);
  const dialogRef = useModalA11y(open, {
    onClose,
    initialFocusSelector: '#join-code-part1',
  });
  const part1Ref = useRef<HTMLInputElement>(null);
  const part2Ref = useRef<HTMLInputElement>(null);

  const [codePart1, setCodePart1] = useState('');
  const [codePart2, setCodePart2] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (open) {
      setCodePart1('');
      setCodePart2('');
      setInviteUrl('');
      setError(null);
      setJoining(false);
    }
  }, [open]);

  if (!open) return null;

  const builtCode = codePart1.length === 3 && codePart2.length === 3
    ? `CRF-${codePart1}-${codePart2}`
    : null;
  const parsedUrl = inviteUrl.trim() ? parseSalaJoinInput(inviteUrl) : null;
  const canJoin = Boolean(
    (parsedUrl && (isCodigoInvitacion(parsedUrl) || parsedUrl.length > 0))
    || builtCode,
  );

  function clearError() {
    setError(null);
  }

  function applyCodeParts(part1: string, part2: string) {
    setCodePart1(part1);
    setCodePart2(part2);
  }

  function handlePart1Change(value: string) {
    setCodePart1(sanitizeCodePart(value));
    clearError();
    if (sanitizeCodePart(value).length === 3) part2Ref.current?.focus();
  }

  function handlePart2Change(value: string) {
    setCodePart2(sanitizeCodePart(value));
    clearError();
  }

  function handleCodePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const parsed = parseCodeParts(e.clipboardData.getData('text'));
    if (!parsed) return;
    e.preventDefault();
    applyCodeParts(parsed.part1, parsed.part2);
    setInviteUrl('');
    clearError();
    part2Ref.current?.focus();
  }

  function handlePart1KeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !codePart1 && codePart2) {
      e.preventDefault();
      setCodePart2(codePart2.slice(0, -1));
    }
  }

  function handlePart2KeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !codePart2) {
      part1Ref.current?.focus();
    }
  }
  function handleUrlChange(value: string) {
    setInviteUrl(value);
    clearError();
    const parsed = parseCodeParts(value);
    if (parsed) applyCodeParts(parsed.part1, parsed.part2);
  }

  function resolveJoinTarget(): string | null {
    if (inviteUrl.trim()) {
      const parsed = parseSalaJoinInput(inviteUrl);
      return parsed || null;
    }
    if (builtCode) return builtCode;
    return null;
  }

  async function handleJoin() {
    const target = resolveJoinTarget();
    if (!target) {
      setError('Ingresa el código o el enlace de invitación.');
      return;
    }
    if (!jwtToken) return;

    setJoining(true);
    setError(null);
    try {
      const sala = isCodigoInvitacion(target)
        ? await joinSalaPorCodigo(jwtToken, target)
        : await joinSala(jwtToken, target);
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
        className="w-full max-w-[440px] rounded-2xl flex flex-col max-h-[min(92vh,100svh)] overflow-y-auto"
        style={{
          background: '#1A2235',
          border: '1px solid rgba(148,163,184,0.12)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        }}
      >
        <div className="px-5 sm:px-7 pt-5 sm:pt-7 pb-5">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 id="join-room-title" className="m-0 text-[18px] font-bold" style={{ color: '#F8FAFC', letterSpacing: '-0.02em' }}>
                Unirse por ID
              </h2>
              <p id="join-room-desc" className="mt-1 text-[13px]" style={{ color: '#64748B' }}>
                Ingresa el código que te compartieron.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg cursor-pointer border-0 flex-none"
              style={{ background: 'transparent', color: '#64748B' }}
              aria-label="Cerrar"
            >
              <XIcon />
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div
              className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-5 rounded-xl"
              style={{
                background: '#0F172A',
                border: `1px solid ${error && !inviteUrl.trim() ? 'rgba(248,113,113,0.45)' : 'rgba(148,163,184,0.14)'}`,
              }}
            >
              <span className="text-[20px] sm:text-[22px] font-bold font-mono tracking-wide" style={{ color: '#475569' }}>
                CRF
              </span>
              <span className="text-[18px] font-light select-none" style={{ color: '#334155' }} aria-hidden="true">-</span>
              <input
                ref={part1Ref}
                id="join-code-part1"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={codePart1}
                onChange={e => handlePart1Change(e.target.value)}
                onPaste={handleCodePaste}
                onKeyDown={handlePart1KeyDown}
                disabled={joining}
                maxLength={3}
                aria-label="Primer segmento del código"
                className="w-[72px] sm:w-[80px] h-[52px] rounded-[10px] text-center text-[20px] sm:text-[22px] font-bold font-mono tracking-widest outline-none disabled:opacity-50"
                style={{
                  background: 'rgba(148,163,184,0.06)',
                  color: '#E2E8F0',
                  border: '1px solid rgba(148,163,184,0.12)',
                }}
              />
              <span className="text-[18px] font-light select-none" style={{ color: '#334155' }} aria-hidden="true">-</span>
              <input
                ref={part2Ref}
                id="join-code-part2"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={codePart2}
                onChange={e => handlePart2Change(e.target.value)}
                onPaste={handleCodePaste}
                onKeyDown={handlePart2KeyDown}
                disabled={joining}
                maxLength={3}
                aria-label="Segundo segmento del código"
                className="w-[72px] sm:w-[80px] h-[52px] rounded-[10px] text-center text-[20px] sm:text-[22px] font-bold font-mono tracking-widest outline-none disabled:opacity-50"
                style={{
                  background: 'rgba(148,163,184,0.06)',
                  color: '#E2E8F0',
                  border: '1px solid rgba(148,163,184,0.12)',
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(148,163,184,0.12)' }} aria-hidden="true" />
              <span className="text-[12px] whitespace-nowrap" style={{ color: '#475569' }}>
                o pega el enlace de invitación
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(148,163,184,0.12)' }} aria-hidden="true" />
            </div>

            <div className="relative">
              <span
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#475569' }}
                aria-hidden="true"
              >
                <LinkIcon />
              </span>
              <input
                id="join-room-url"
                type="url"
                value={inviteUrl}
                onChange={e => handleUrlChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleJoin(); }}
                placeholder="https://crossflow.app/r/CRF-9D2-LK4"
                disabled={joining}
                aria-label="Enlace de invitación"
                aria-invalid={error && inviteUrl.trim() ? true : undefined}
                aria-describedby={error ? 'join-room-error' : undefined}
                className="w-full pl-10 pr-3.5 py-3 rounded-[10px] text-[13px] outline-none disabled:opacity-50"
                style={{
                  background: '#0F172A',
                  color: '#94A3B8',
                  border: `1px solid ${error && inviteUrl.trim() ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.18)'}`,
                }}
              />
            </div>

            {error && (
              <p id="join-room-error" role="alert" className="m-0 -mt-2 text-[12.5px]" style={{ color: '#F87171' }}>
                {error}
              </p>
            )}
          </div>
        </div>

        <div
          className="px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}
        >
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
            disabled={joining || !canJoin}
            aria-label="Unirse a la sala"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: joining
                ? 'rgba(99,102,241,0.5)'
                : 'linear-gradient(180deg, #7477F5 0%, #5458E8 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: joining ? 'none' : '0 1px 0 rgba(255,255,255,0.14) inset, 0 4px 14px rgba(99,102,241,0.3)',
            }}
          >
            {joining ? 'Uniéndose…' : (
              <>
                <ArrowRightIcon />
                Unirme
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
