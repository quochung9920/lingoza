import type {
  AudioAsset,
  AudioSpeed,
  AudioTrack,
  ContentId
} from "../../../../packages/content-schema/src/index";

/**
 * Application-level audio controller.
 *
 * There is exactly one of these. Every speaker button in the product goes
 * through it, which is what makes the "never two clips at once" rule
 * structural rather than a thing each screen has to remember: starting a new
 * clip stops whatever was playing, because there is only one playback slot.
 *
 * `HTMLAudioElement` is used directly rather than Web Audio: the Mini App
 * webview handles it more predictably, and nothing here needs a graph.
 * `SpeechSynthesis` is deliberately never used -- see `placeholderAudio` in the
 * language pack for why.
 */

export type PlaybackState = "idle" | "loading" | "playing";

export interface NowPlaying {
  ownerId: ContentId;
  speed: AudioSpeed;
  /** Segment id when a single phrase of a longer clip is playing. */
  segmentId?: string;
}

export interface AudioManagerOptions {
  /**
   * Base URL for audio assets. Assets are served from object storage/CDN and
   * are never bundled into the Mini App: a full course of recordings would
   * dwarf the JS budget many times over.
   */
  baseUrl: string;
}

export interface PlayOptions {
  ownerId: ContentId;
  asset: AudioAsset;
  speed?: AudioSpeed;
  /** Play only this segment of the clip (shadowing build-up). */
  segmentId?: string;
  /** Called when playback finishes or is superseded. */
  onEnded?: () => void;
}

type Listener = (state: PlaybackState, playing: NowPlaying | null) => void;

export class AudioManager {
  private element: HTMLAudioElement | null = null;
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

  /** Resolves a pack-relative `src` against the configured CDN base. */
  resolve(track: AudioTrack, basePath: string): string {
    return `${this.options.baseUrl.replace(/\/$/, "")}/${basePath}/${track.src}`;
  }

  private trackFor(asset: AudioAsset, speed: AudioSpeed): AudioTrack | null {
    if (speed === "slow") return asset.slow ?? asset.normal ?? null;
    return asset.normal ?? null;
  }

  /**
   * Whether this asset can actually be played.
   *
   * Screens call this to render an audio button in its unavailable state --
   * still present, still labelled -- instead of hiding it. Hiding the speaker
   * would quietly break the Universal Audio Rule wherever recordings lag
   * behind authoring.
   */
  canPlay(asset: AudioAsset | undefined): boolean {
    return Boolean(asset?.available && asset.normal?.src);
  }

  stop(): void {
    this.currentToken += 1;
    this.segmentStopAt = null;
    if (this.element) {
      this.element.pause();
      this.element.src = "";
      this.element = null;
    }
    this.emit("idle", null);
  }

  /**
   * Plays a clip, stopping anything already playing.
   *
   * Tapping the speaker that is currently playing stops it rather than
   * restarting: on a phone, the second tap is almost always "that's enough",
   * and a replay is one more tap away.
   */
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

    const track = this.trackFor(options.asset, speed);
    if (!track || !options.asset.available) {
      // Nothing to play. Report it as a completed no-op so callers that chain
      // (autoplay, shadowing sequences) don't stall waiting for an end event.
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

    const element = new Audio();
    element.preload = "auto";
    element.src = track.src.startsWith("http")
      ? track.src
      : `${this.options.baseUrl.replace(/\/$/, "")}/${track.src}`;
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
      // Autoplay refusal or a missing file. Both mean "no sound happened",
      // which is a normal state here, not an error worth surfacing.
      finish();
    }
  }

  /**
   * Warms the browser cache for a clip the learner is about to need.
   *
   * Only ever called for the *next* item, never for a whole lesson: preloading
   * a unit's worth of audio on a mobile connection costs more than it saves.
   */
  preload(asset: AudioAsset | undefined, speed: AudioSpeed = "normal"): void {
    if (!asset?.available) return;
    const track = this.trackFor(asset, speed);
    if (!track) return;
    const element = new Audio();
    element.preload = "auto";
    element.src = track.src.startsWith("http")
      ? track.src
      : `${this.options.baseUrl.replace(/\/$/, "")}/${track.src}`;
  }
}
