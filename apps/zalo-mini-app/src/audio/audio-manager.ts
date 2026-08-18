import type {
  AudioAsset,
  AudioSpeed,
  AudioTrack,
  ContentId
} from "../../../../packages/content-schema/src/index";

/**
 * Application-level audio controller.
 *
 * There is exactly one playback slot. Starting a new target-language clip
 * stops anything already playing, so words, lesson prompts and dialogue never
 * talk over one another.
 */

export type PlaybackState = "idle" | "loading" | "playing";

export interface NowPlaying {
  ownerId: ContentId;
  speed: AudioSpeed;
  segmentId?: string;
}

export interface AudioManagerOptions {
  /** CDN/object-storage root, e.g. https://cdn.example.com/audio. */
  baseUrl: string;
  /** Language-pack path beneath the root, e.g. zh-CN. */
  basePath?: string;
  /** Resolve authored text when a caller only knows an owner id. */
  fallbackTextResolver?: (ownerId: ContentId) => string | undefined;
}

export interface PlayOptions {
  ownerId: ContentId;
  asset?: AudioAsset;
  speed?: AudioSpeed;
  segmentId?: string;
  fallbackText?: string;
  lang?: string;
  onEnded?: () => void;
}

type Listener = (state: PlaybackState, playing: NowPlaying | null) => void;

export class AudioManager {
  private element: HTMLAudioElement | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private state: PlaybackState = "idle";
  private playing: NowPlaying | null = null;
  private listeners = new Set<Listener>();
  private segmentStopAt: number | null = null;
  private currentToken = 0;

  constructor(private readonly options: AudioManagerOptions) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.playing);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(state: PlaybackState, playing: NowPlaying | null): void {
    this.state = state;
    this.playing = playing;
    for (const listener of this.listeners) listener(state, playing);
  }

  private assetUrl(track: AudioTrack): string {
    if (/^https?:\/\//i.test(track.src)) return track.src;

    const root = this.options.baseUrl.replace(/\/$/, "");
    const pack = (this.options.basePath ?? "").replace(/^\/+|\/+$/g, "");
    const source = track.src.replace(/^\/+/, "");
    return pack ? `${root}/${pack}/${source}` : `${root}/${source}`;
  }

  /** Public for diagnostics and tests; playback uses the same resolver. */
  resolve(track: AudioTrack): string {
    return this.assetUrl(track);
  }

  private trackFor(asset: AudioAsset, speed: AudioSpeed): AudioTrack | null {
    if (speed === "slow") return asset.slow ?? asset.normal ?? null;
    return asset.normal ?? null;
  }

  private speechSynthesis(): SpeechSynthesis | null {
    if (typeof window === "undefined") return null;
    if (!("speechSynthesis" in window)) return null;
    if (typeof SpeechSynthesisUtterance === "undefined") return null;
    return window.speechSynthesis;
  }

  private canSpeak(text?: string): boolean {
    return Boolean(text?.trim() && this.speechSynthesis());
  }

  private fallbackTextFromAsset(
    asset: AudioAsset | undefined,
    speed: AudioSpeed,
    segmentId?: string
  ): string | undefined {
    if (!asset) return undefined;

    const preferred = this.trackFor(asset, speed);
    const segmentSources = [preferred?.segments, asset.normal?.segments, asset.slow?.segments];

    if (segmentId) {
      for (const segments of segmentSources) {
        const text = segments?.find((segment) => segment.id === segmentId)?.text?.trim();
        if (text) return text;
      }
      return undefined;
    }

    for (const segments of segmentSources) {
      const text = segments
        ?.map((segment) => segment.text.trim())
        .filter(Boolean)
        .join("");
      if (text) return text;
    }

    return undefined;
  }

  private fallbackTextFor(options: PlayOptions, speed: AudioSpeed): string | undefined {
    return (
      options.fallbackText?.trim() ||
      this.fallbackTextFromAsset(options.asset, speed, options.segmentId) ||
      this.options.fallbackTextResolver?.(options.ownerId)?.trim()
    );
  }

  canPlay(asset: AudioAsset | undefined, fallbackText?: string): boolean {
    const hasRecordedAudio = Boolean(asset?.available && asset.normal?.src);
    return hasRecordedAudio || this.canSpeak(fallbackText);
  }

  stop(): void {
    this.currentToken += 1;
    this.segmentStopAt = null;

    if (this.element) {
      this.element.pause();
      this.element.src = "";
      this.element = null;
    }

    if (this.utterance) {
      this.speechSynthesis()?.cancel();
      this.utterance = null;
    }

    this.emit("idle", null);
  }

  private chooseVoice(lang: string): SpeechSynthesisVoice | undefined {
    const synth = this.speechSynthesis();
    if (!synth) return undefined;

    const voices = synth.getVoices();
    const wanted = lang.toLowerCase();
    const language = wanted.split("-")[0];

    return (
      voices.find((voice) => voice.lang.toLowerCase() === wanted) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith(`${language}-`)) ??
      voices.find((voice) => voice.lang.toLowerCase() === language)
    );
  }

  private speakFallback(
    options: PlayOptions,
    fallbackText: string,
    speed: AudioSpeed,
    nowPlaying: NowPlaying,
    token: number
  ): void {
    const synth = this.speechSynthesis();
    const text = fallbackText.trim();

    if (!synth || !text) {
      options.onEnded?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = options.lang ?? "zh-CN";
    utterance.lang = lang;
    utterance.rate = speed === "slow" ? 0.72 : 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = this.chooseVoice(lang);
    if (voice) utterance.voice = voice;

    const finish = () => {
      if (token !== this.currentToken) return;
      this.stop();
      options.onEnded?.();
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    this.utterance = utterance;

    try {
      synth.speak(utterance);
      if (token === this.currentToken) this.emit("playing", nowPlaying);
    } catch {
      finish();
    }
  }

  async play(options: PlayOptions): Promise<void> {
    const speed = options.speed ?? "normal";

    const isSame =
      this.playing?.ownerId === options.ownerId &&
      this.playing.speed === speed &&
      this.playing.segmentId === options.segmentId;
    if (isSame && this.state === "playing") {
      this.stop();
      return;
    }

    this.stop();

    const asset = options.asset;
    const track = asset ? this.trackFor(asset, speed) : null;
    const hasRecordedAudio = Boolean(track && asset?.available);
    const fallbackText = this.fallbackTextFor(options, speed);

    if (!hasRecordedAudio && !this.canSpeak(fallbackText)) {
      options.onEnded?.();
      return;
    }

    const token = ++this.currentToken;
    const nowPlaying: NowPlaying = {
      ownerId: options.ownerId,
      speed,
      segmentId: options.segmentId
    };
    this.emit("loading", nowPlaying);

    if (!hasRecordedAudio || !track || !asset) {
      if (fallbackText) this.speakFallback(options, fallbackText, speed, nowPlaying, token);
      else options.onEnded?.();
      return;
    }

    const element = new Audio();
    element.preload = "auto";
    element.src = this.assetUrl(track);
    this.element = element;

    const segment = options.segmentId
      ? track.segments?.find((candidate) => candidate.id === options.segmentId)
      : undefined;
    this.segmentStopAt = segment ? segment.endMs / 1000 : null;

    const finish = () => {
      if (token !== this.currentToken) return;
      this.stop();
      options.onEnded?.();
    };

    element.addEventListener("ended", finish);
    element.addEventListener("error", finish);
    element.addEventListener("timeupdate", () => {
      if (this.segmentStopAt !== null && element.currentTime >= this.segmentStopAt) finish();
    });

    try {
      if (segment) element.currentTime = segment.startMs / 1000;
      await element.play();
      if (token !== this.currentToken) return;
      this.emit("playing", nowPlaying);
    } catch {
      finish();
    }
  }

  /** Warm the browser cache for the next reviewed recording only. */
  preload(asset: AudioAsset | undefined, speed: AudioSpeed = "normal"): void {
    if (!asset?.available) return;
    const track = this.trackFor(asset, speed);
    if (!track) return;
    const element = new Audio();
    element.preload = "auto";
    element.src = this.assetUrl(track);
  }
}
