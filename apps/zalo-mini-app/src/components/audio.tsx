import { useCallback, type ReactNode } from "react";

import type {
  AudioAsset,
  AudioSpeed,
  ContentId,
  ExampleSentence,
  LanguageData,
  LexicalItem
} from "../../../../packages/content-schema/src/index";
import { useAudio } from "../app/audio-provider";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import { ct, t } from "../lib/i18n";

/**
 * The audio layer of the UI.
 *
 * `AudioButton` and `AudioText` make the Universal Audio Rule hold in
 * practice: target-language text is paired with a speaker everywhere it is
 * rendered through these content-aware components.
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
  /** Pack-owned data keyed by LanguageProfile.supportLayers. */
  languageData?: LanguageData;
  /** Generic fallback kept for imported content that only has romanization. */
  romanization?: string;
  translation?: string;
  size?: "sm" | "md" | "lg";
  /** Force-show available support layers regardless of preference. */
  forceSupport?: boolean;
}

/**
 * Target-language text with its speaker, optional pack-declared reading aids
 * and translation. The component does not know what "pinyin", "romaji" or
 * "traditional" means: it renders support-layer keys declared by the active
 * language profile and looks their values up dynamically in `languageData`.
 */
export function AudioText({
  ownerId,
  text,
  asset,
  lang = "zh-CN",
  languageData,
  romanization,
  translation,
  size = "md",
  forceSupport = false
}: AudioTextProps) {
  const { bundle } = useContent();
  const { snapshot } = useLearner();
  const preferences = snapshot.profile.preferences;
  const showTranslation = forceSupport || preferences.showTranslation;

  const supportRows = bundle.profile.supportLayers.flatMap((layer) => {
    if (!forceSupport && !preferences.visibleSupportLayers.includes(layer.key)) return [];
    const raw = languageData?.[layer.key];
    if (typeof raw === "string" && raw.trim()) {
      return [{ key: layer.key, label: t(layer.label), value: raw.trim() }];
    }
    if (typeof raw === "number") {
      return [{ key: layer.key, label: t(layer.label), value: String(raw) }];
    }
    return [];
  });

  // Imported legacy content may have only the generic romanization field. It
  // remains visible when support is forced, but new packs should populate
  // languageData according to their declared support-layer keys.
  const fallbackRomanization = forceSupport && supportRows.length === 0 ? romanization : undefined;
  const sizeClass = size === "lg" ? " lz-target--lg" : size === "sm" ? " lz-target--sm" : "";

  return (
    <div className="lz-audio-text">
      <div className="lz-audio-text__body">
        <p className={`lz-target${sizeClass}`} lang={lang}>
          {text}
        </p>
        {supportRows.map((row) => (
          <p className="lz-support-layer" key={row.key} data-layer={row.key}>
            <span className="lz-visually-hidden">{row.label}: </span>
            {row.value}
          </p>
        ))}
        {fallbackRomanization ? <p className="lz-support-layer">{fallbackRomanization}</p> : null}
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
      languageData={sentence.languageData}
      romanization={sentence.romanization}
      translation={t(sentence.translation)}
      size={size}
      forceSupport={forceSupport}
    />
  );
}

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
      languageData={item.languageData}
      romanization={item.romanization}
      translation={t(item.meaning)}
      size={size}
      forceSupport={forceSupport}
    />
  );
}
