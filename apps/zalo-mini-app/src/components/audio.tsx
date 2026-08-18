import { useCallback, type ReactNode } from "react";

import type {
  AudioAsset,
  AudioSpeed,
  ContentId,
  ExampleSentence,
  LexicalItem
} from "../../../../packages/content-schema/src/index";
import { useAudio } from "../app/audio-provider";
import { useLearner } from "../app/learner-provider";
import { ct, t } from "../lib/i18n";

/**
 * The audio layer of the UI.
 *
 * `AudioButton` and `AudioText` are the components that make the Universal
 * Audio Rule hold in practice: no screen renders target-language text as a bare
 * string, it renders an `AudioText`, and an `AudioText` cannot exist without a
 * speaker.
 */

export interface AudioButtonProps {
  ownerId: ContentId;
  asset: AudioAsset | undefined;
  /** The text being spoken and used to build the accessible name. */
  text: string;
  /** BCP-47 language tag used by the device-TTS fallback. */
  lang?: string;
  speed?: AudioSpeed;
  segmentId?: string;
  size?: "md" | "lg";
  onPlayed?: () => void;
}

/**
 * The universal speaker button.
 *
 * Reviewed audio is preferred. Seed content whose recording is still marked
 * unavailable falls back to the host device's speech synthesis when supported,
 * so the learner can tap every speaker during development/testing without
 * changing the content's production-review status.
 */
export function AudioButton({
  ownerId,
  asset,
  text,
  lang = "zh-CN",
  speed = "normal",
  segmentId,
  size = "md",
  onPlayed
}: AudioButtonProps) {
  const { manager, isPlaying, canPlay } = useAudio();
  const playable = canPlay(asset, text);
  const playing = isPlaying(ownerId, speed, segmentId);

  const handleClick = useCallback(() => {
    if (!playable) return;
    void manager.play({
      ownerId,
      asset,
      speed,
      segmentId,
      fallbackText: text,
      lang,
      onEnded: onPlayed
    });
  }, [asset, playable, manager, ownerId, speed, segmentId, text, lang, onPlayed]);

  const action = speed === "slow" ? ct("audio.playSlow") : ct("audio.play");
  const label = playable ? `${action}: ${text}` : `${ct("audio.unavailable")}: ${text}`;

  return (
    <button
      type="button"
      className={`lz-audio-btn${size === "lg" ? " lz-audio-btn--lg" : ""}`}
      data-state={!playable ? "unavailable" : playing ? "playing" : "idle"}
      aria-label={label}
      aria-disabled={!playable}
      disabled={!playable}
      onClick={handleClick}
    >
      <span className="lz-audio-btn__disc" aria-hidden="true">
        {playing ? "⏸" : "🔊"}
      </span>
    </button>
  );
}

/** Explicit slow-playback control, used where the learner needs it prominently. */
export function SlowAudioButton({
  ownerId,
  asset,
  text,
  lang = "zh-CN"
}: {
  ownerId: ContentId;
  asset: AudioAsset | undefined;
  text: string;
  lang?: string;
}) {
  const { manager, isPlaying, canPlay } = useAudio();
  const playable = canPlay(asset, text);
  const playing = isPlaying(ownerId, "slow");

  return (
    <button
      type="button"
      className="lz-chip-btn"
      aria-pressed={playing}
      aria-label={`${ct("audio.playSlow")}: ${text}`}
      disabled={!playable}
      onClick={() =>
        playable &&
        manager.play({
          ownerId,
          asset,
          speed: "slow",
          fallbackText: text,
          lang
        })
      }
    >
      <span aria-hidden="true">🐢</span>
      {ct("audio.slowLabel")}
    </button>
  );
}

/** Normal + slow + replay, as one row. The lesson player's standard control set. */
export function AudioControls({
  ownerId,
  asset,
  text,
  lang = "zh-CN",
  extra
}: {
  ownerId: ContentId;
  asset: AudioAsset | undefined;
  text: string;
  lang?: string;
  extra?: ReactNode;
}) {
  const { manager, canPlay } = useAudio();
  const playable = canPlay(asset, text);

  return (
    <div className="lz-audio-controls">
      <SlowAudioButton ownerId={ownerId} asset={asset} text={text} lang={lang} />
      <button
        type="button"
        className="lz-chip-btn"
        aria-label={`${ct("audio.replay")}: ${text}`}
        disabled={!playable}
        onClick={() =>
          playable &&
          manager.play({
            ownerId,
            asset,
            speed: "normal",
            fallbackText: text,
            lang
          })
        }
      >
        <span aria-hidden="true">🔁</span>
        {ct("audio.replay")}
      </button>
      {extra}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Target-language text                                                */
/* ------------------------------------------------------------------ */

export interface AudioTextProps {
  ownerId: ContentId;
  text: string;
  asset: AudioAsset | undefined;
  lang?: string;
  romanization?: string;
  translation?: string;
  size?: "sm" | "md" | "lg";
  /** Force-show support layers regardless of preference (e.g. after a hint). */
  forceSupport?: boolean;
}

/**
 * Target-language text with its speaker, romanization and translation.
 *
 * Which support layers appear is a learner preference, not a per-screen
 * decision: someone at A0 wants pinyin on everything, and the same person at
 * A2 wants it gone everywhere at once.
 */
export function AudioText({
  ownerId,
  text,
  asset,
  lang = "zh-CN",
  romanization,
  translation,
  size = "md",
  forceSupport = false
}: AudioTextProps) {
  const { snapshot } = useLearner();
  const preferences = snapshot.profile.preferences;
  const showRomanization =
    forceSupport || preferences.visibleSupportLayers.includes("pinyin");
  const showTranslation = forceSupport || preferences.showTranslation;

  const sizeClass = size === "lg" ? " lz-target--lg" : size === "sm" ? " lz-target--sm" : "";

  return (
    <div className="lz-audio-text">
      <div className="lz-audio-text__body">
        <p className={`lz-target${sizeClass}`} lang={lang}>
          {text}
        </p>
        {showRomanization && romanization ? <p className="lz-romanization">{romanization}</p> : null}
        {showTranslation && translation ? <p className="lz-translation">{translation}</p> : null}
      </div>
      <AudioButton
        ownerId={ownerId}
        asset={asset}
        text={text}
        lang={lang}
        size={size === "lg" ? "lg" : "md"}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Content-aware wrappers                                              */
/* ------------------------------------------------------------------ */

/** `AudioText` for a sentence, reading everything from the content object. */
export function SentenceText({
  sentence,
  size = "md",
  forceSupport
}: {
  sentence: ExampleSentence | undefined;
  size?: AudioTextProps["size"];
  forceSupport?: boolean;
}) {
  if (!sentence) return null;
  return (
    <AudioText
      ownerId={sentence.id}
      text={sentence.text}
      asset={sentence.audio}
      lang={sentence.language}
      romanization={sentence.romanization}
      translation={t(sentence.translation)}
      size={size}
      forceSupport={forceSupport}
    />
  );
}

/** `AudioText` for a lexical item. */
export function ItemText({
  item,
  size = "md",
  forceSupport
}: {
  item: LexicalItem | undefined;
  size?: AudioTextProps["size"];
  forceSupport?: boolean;
}) {
  if (!item) return null;
  return (
    <AudioText
      ownerId={item.id}
      text={item.text}
      asset={item.audio}
      lang={item.language}
      romanization={item.romanization}
      translation={t(item.meaning)}
      size={size}
      forceSupport={forceSupport}
    />
  );
}
