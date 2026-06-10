const SOUNDS = {
  message: '/sounds/Chat.mp3',
  mediaMuted: '/sounds/Desactivar-camara-y-microfono.mp3',
  mediaUnmuted: '/sounds/Activar-camara-y-microfono.mp3',
  userJoined: '/sounds/Entro-a-llamada.mp3',
  userLeft: '/sounds/Salio-de-llamada.mp3',
  screenShare: '/sounds/Compartir-pantalla.mp3',
} as const;

const DEFAULT_VOLUME = 0.55;

function playSound(src: string, volume = DEFAULT_VOLUME) {
  if (typeof window === 'undefined') return;

  const audio = new Audio(src);
  audio.volume = volume;
  void audio.play().catch(() => {});
}

export function preloadRoomSounds() {
  if (typeof window === 'undefined') return;
  Object.values(SOUNDS).forEach((src) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.load();
  });
}

export const roomSounds = {
  messageSent() {
    playSound(SOUNDS.message);
  },

  mediaMuted() {
    playSound(SOUNDS.mediaMuted);
  },

  mediaUnmuted() {
    playSound(SOUNDS.mediaUnmuted);
  },

  userJoined() {
    playSound(SOUNDS.userJoined);
  },

  userLeft() {
    playSound(SOUNDS.userLeft);
  },

  screenShare() {
    playSound(SOUNDS.screenShare);
  },
};
