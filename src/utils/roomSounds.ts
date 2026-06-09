let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedCtx) sharedCtx = new AudioContext();
    if (sharedCtx.state === 'suspended') void sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

type ToneStep = { freq: number; at: number; duration: number };

function playEnvelope(
  steps: ToneStep[],
  options: { type?: OscillatorType; volume?: number } = {},
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const { type = 'sine', volume = 0.12 } = options;

  for (const { freq, at, duration } of steps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime + at;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}

export const roomSounds = {
  messageSent() {
    playEnvelope(
      [
        { freq: 880, at: 0, duration: 0.08 },
        { freq: 1100, at: 0.06, duration: 0.1 },
      ],
      { volume: 0.1 },
    );
  },

  mediaMuted() {
    playEnvelope(
      [
        { freq: 440, at: 0, duration: 0.12 },
        { freq: 330, at: 0.08, duration: 0.15 },
      ],
      { type: 'triangle', volume: 0.1 },
    );
  },

  userJoined() {
    playEnvelope(
      [
        { freq: 523, at: 0, duration: 0.1 },
        { freq: 659, at: 0.08, duration: 0.12 },
        { freq: 784, at: 0.16, duration: 0.15 },
      ],
      { volume: 0.11 },
    );
  },

  userLeft() {
    playEnvelope(
      [
        { freq: 784, at: 0, duration: 0.1 },
        { freq: 659, at: 0.08, duration: 0.12 },
        { freq: 523, at: 0.16, duration: 0.15 },
      ],
      { volume: 0.1 },
    );
  },

  screenShare() {
    playEnvelope(
      [
        { freq: 600, at: 0, duration: 0.06 },
        { freq: 800, at: 0.05, duration: 0.08 },
        { freq: 1000, at: 0.1, duration: 0.12 },
      ],
      { type: 'square', volume: 0.06 },
    );
  },
};
