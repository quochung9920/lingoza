import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import type { AudioAsset, AudioSpeed, ContentId } from "../../../../packages/content-schema/src/index";
import { AudioManager, type NowPlaying, type PlaybackState } from "../audio/audio-manager";

/**
 * Exposes the single `AudioManager` to the tree, plus the playback state each
 * speaker button needs to render itself.
 *
 * State is broadcast from one subscription rather than one per button: a
 * vocabulary screen can easily hold twenty speakers, and twenty subscriptions
 * to the same source is waste.
 */

interface AudioValue {
  manager: AudioManager;
  state: PlaybackState;
  playing: NowPlaying | null;
  isPlaying(ownerId: ContentId, speed?: AudioSpeed, segmentId?: string): boolean;
  canPlay(asset: AudioAsset | undefined, fallbackText?: string): boolean;
}

const AudioContext = createContext<AudioValue | null>(null);

/**
 * Where reviewed recordings are served from.
 *
 * Read from the build environment so staging and production point at different
 * buckets, with a relative default that resolves inside the Mini App package
 * during development.
 */
const AUDIO_BASE_URL = (import.meta.env?.VITE_LINGOZA_AUDIO_BASE as string | undefined) ?? "./audio";

export function AudioProvider({ children }: { children: ReactNode }) {
  const manager = useMemo(() => new AudioManager({ baseUrl: AUDIO_BASE_URL }), []);
  const [state, setState] = useState<PlaybackState>("idle");
  const [playing, setPlaying] = useState<NowPlaying | null>(null);

  useEffect(() => {
    const unsubscribe = manager.subscribe((nextState, nextPlaying) => {
      setState(nextState);
      setPlaying(nextPlaying);
    });

    return () => {
      unsubscribe();
      manager.stop();
    };
  }, [manager]);

  const value = useMemo<AudioValue>(
    () => ({
      manager,
      state,
      playing,
      isPlaying: (ownerId, speed, segmentId) =>
        state === "playing" &&
        playing?.ownerId === ownerId &&
        (speed === undefined || playing.speed === speed) &&
        (segmentId === undefined || playing.segmentId === segmentId),
      canPlay: (asset, fallbackText) => manager.canPlay(asset, fallbackText)
    }),
    [manager, state, playing]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioValue {
  const value = useContext(AudioContext);
  if (!value) throw new Error("useAudio must be used inside <AudioProvider>");
  return value;
}
