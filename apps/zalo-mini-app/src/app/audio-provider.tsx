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
import { useContent } from "./content-provider";

interface AudioValue {
  manager: AudioManager;
  state: PlaybackState;
  playing: NowPlaying | null;
  isPlaying(ownerId: ContentId, speed?: AudioSpeed, segmentId?: string): boolean;
  canPlay(asset: AudioAsset | undefined, fallbackText?: string): boolean;
}

const AudioContext = createContext<AudioValue | null>(null);

const AUDIO_BASE_URL = (import.meta.env?.VITE_LINGOZA_AUDIO_BASE as string | undefined) ?? "./audio";

export function AudioProvider({ children }: { children: ReactNode }) {
  const content = useContent();
  const basePath = content.bundle.profile.audioBasePath;
  const language = content.bundle.profile.language;
  const manager = useMemo(
    () =>
      new AudioManager({
        baseUrl: AUDIO_BASE_URL,
        basePath,
        defaultLang: language,
        fallbackTextResolver: (ownerId) =>
          content.sentence(ownerId)?.text ?? content.item(ownerId)?.text
      }),
    [basePath, language, content]
  );
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
