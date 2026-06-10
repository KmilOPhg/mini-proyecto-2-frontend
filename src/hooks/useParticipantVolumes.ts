import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cf_participant_volumes';
const DEFAULT_VOLUME = 1;

function readStored(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, number> : {};
  } catch {
    return {};
  }
}

function writeStored(volumes: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
  } catch {
    // localStorage puede no estar disponible.
  }
}

export function useParticipantVolumes() {
  const [volumes, setVolumes] = useState<Record<string, number>>(readStored);

  useEffect(() => {
    writeStored(volumes);
  }, [volumes]);

  const getVolume = useCallback(
    (uid: string) => volumes[uid] ?? DEFAULT_VOLUME,
    [volumes],
  );

  const setVolume = useCallback((uid: string, volume: number) => {
    const clamped = Math.min(1, Math.max(0, volume));
    setVolumes((prev) => ({ ...prev, [uid]: clamped }));
  }, []);

  const resetVolume = useCallback((uid: string) => {
    setVolumes((prev) => {
      if (!(uid in prev)) return prev;
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  }, []);

  return { getVolume, setVolume, resetVolume };
}
