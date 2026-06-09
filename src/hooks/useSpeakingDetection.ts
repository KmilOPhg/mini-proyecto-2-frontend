import { useEffect, useState } from 'react';

export type SpeakingSource = {
  uid: string;
  stream: MediaStream | null;
  audioMuted: boolean;
};

const SPEAKING_THRESHOLD = 18;

export function useSpeakingDetection(sources: SpeakingSource[]): ReadonlySet<string> {
  const [speakingUids, setSpeakingUids] = useState<ReadonlySet<string>>(() => new Set());
  const sourcesKey = sources
    .map((s) => `${s.uid}:${s.audioMuted}:${s.stream?.id ?? 'none'}`)
    .join('|');

  useEffect(() => {
    let cancelled = false;
    const audioContext = new AudioContext();
    const monitors: Array<{
      uid: string;
      analyser: AnalyserNode;
      sourceNode: MediaStreamAudioSourceNode;
      data: Uint8Array<ArrayBuffer>;
    }> = [];

    for (const { uid, stream, audioMuted } of sources) {
      if (!stream || audioMuted) continue;
      const hasLiveAudio = stream
        .getAudioTracks()
        .some((track) => track.enabled && track.readyState === 'live');
      if (!hasLiveAudio) continue;

      try {
        const sourceNode = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        sourceNode.connect(analyser);
        monitors.push({
          uid,
          analyser,
          sourceNode,
          data: new Uint8Array(analyser.frequencyBinCount),
        });
      } catch {
        // El stream puede no tener audio o ya estar conectado a otro nodo.
      }
    }

    if (monitors.length === 0) {
      void audioContext.close();
      setSpeakingUids(new Set());
      return;
    }

    let rafId = 0;

    const tick = () => {
      if (cancelled) return;
      const next = new Set<string>();
      for (const { uid, analyser, data } of monitors) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        if (avg > SPEAKING_THRESHOLD) next.add(uid);
      }
      setSpeakingUids((prev) => {
        if (prev.size === next.size && [...prev].every((uid) => next.has(uid))) return prev;
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };

    void audioContext.resume().then(() => {
      if (!cancelled) rafId = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      for (const { sourceNode } of monitors) sourceNode.disconnect();
      void audioContext.close();
    };
  }, [sourcesKey]);

  return speakingUids;
}
