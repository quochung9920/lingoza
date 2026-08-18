import { useCallback, useState, type ReactNode } from "react";

import type {
  AudioAsset,
  AudioSpeed,
  ContentId,
  ExampleSentence,
  LanguageData,
  LexicalItem,
  PartOfSpeech
} from "../../../../packages/content-schema/src/index";
import { useAudio } from "../app/audio-provider";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import { BottomSheet } from "./primitives";
import { ct, t } from "../lib/i18n";

/**
 * The audio layer of the UI.
 *
 * Sentences keep progressive-disclosure preferences. Lexical items use a
 * stricter learning contract: target text + reading aid are visible, while the
 * Vietnamese meaning stays hidden until the learner taps the word. This keeps
 * the listening/target-language association primary without making lookup
 * inconvenient.
 */

export interface AudioButtonProps {
  ownerId: ContentId;
  asset: AudioAsset | undefined;
  text: string;
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
  languageData?: LanguageData;
  romanization?: string;
  translation?: string;
  size?: "sm" | "md" | "lg";
  forceSupport?: boolean;
}

/** Generic sentence/phrase renderer whose support layers follow preferences. */
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
/* Lexical detail                                                      */
/* ------------------------------------------------------------------ */

const POS_VI: Record<PartOfSpeech, string> = {
  noun: "Danh từ",
  verb: "Động từ",
  adjective: "Tính từ",
  adverb: "Trạng từ",
  pronoun: "Đại từ",
  numeral: "Số từ",
  "measure-word": "Lượng từ",
  particle: "Trợ từ",
  preposition: "Giới từ",
  conjunction: "Liên từ",
  interjection: "Thán từ",
  phrase: "Cụm từ"
};

function stringData(data: LanguageData | undefined, key: string): string | undefined {
  const value = data?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readingFor(item: LexicalItem): string | undefined {
  return stringData(item.languageData, "pinyin") ?? item.romanization;
}

function WordDetailSheet({ item, open, onClose }: { item: LexicalItem; open: boolean; onClose: () => void }) {
  const content = useContent();
  const pinyin = readingFor(item);
  const classifier = stringData(item.languageData, "classifier");
  const traditional = stringData(item.languageData, "traditional");
  const hskRaw = item.languageData?.hskReference;
  const hsk = typeof hskRaw === "string" || typeof hskRaw === "number" ? String(hskRaw) : undefined;

  const senses =
    item.senses && item.senses.length > 0
      ? item.senses
      : [
          {
            id: `${item.id}.primary`,
            gloss: item.meaning,
            definition: item.meaning,
            exampleSentenceIds: item.exampleSentenceIds
          }
        ];

  const collocations = item.collocations
    .map((id) => content.item(id))
    .filter((entry): entry is LexicalItem => Boolean(entry));
  const examples = item.exampleSentenceIds
    .map((id) => content.sentence(id))
    .filter((entry): entry is ExampleSentence => Boolean(entry));

  return (
    <BottomSheet open={open} title={`${item.text}${pinyin ? ` · ${pinyin}` : ""}`} onClose={onClose}>
      <div className="lz-word-detail__hero">
        <div>
          <p className="lz-word-detail__hanzi" lang={item.language}>{item.text}</p>
          {pinyin ? <p className="lz-word-detail__pinyin">{pinyin}</p> : null}
        </div>
        <AudioButton ownerId={item.id} asset={item.audio} text={item.text} lang={item.language} size="lg" />
      </div>

      <div className="lz-word-detail__badges">
        <span className="lz-pill">{POS_VI[item.partOfSpeech]}</span>
        <span className="lz-pill">{item.level}</span>
        {classifier ? <span className="lz-pill">Lượng từ: {classifier}</span> : null}
        {hsk ? <span className="lz-pill">HSK {hsk}</span> : null}
      </div>

      <div className="lz-word-detail__section">
        <p className="lz-eyebrow">NGHĨA & CÁCH DÙNG</p>
        {senses.map((sense, index) => (
          <div className="lz-word-sense" key={sense.id}>
            <div className="lz-word-sense__number">{index + 1}</div>
            <div>
              <strong>{t(sense.gloss)}</strong>
              {sense.definition ? <p>{t(sense.definition)}</p> : null}
              {sense.usageNote ? <p className="lz-muted">💡 {t(sense.usageNote)}</p> : null}
            </div>
          </div>
        ))}
        {item.usageNote ? <p className="lz-word-detail__note">💡 {t(item.usageNote)}</p> : null}
        {traditional && traditional !== item.text ? (
          <p className="lz-muted">Phồn thể: <strong>{traditional}</strong></p>
        ) : null}
      </div>

      {collocations.length > 0 ? (
        <div className="lz-word-detail__section">
          <p className="lz-eyebrow">CỤM TỪ THÔNG DỤNG</p>
          <div className="lz-word-detail__list">
            {collocations.map((entry) => (
              <div className="lz-word-detail__row" key={entry.id}>
                <div>
                  <strong lang={entry.language}>{entry.text}</strong>
                  {readingFor(entry) ? <span>{readingFor(entry)}</span> : null}
                  <small>{t(entry.meaning)}</small>
                </div>
                <AudioButton ownerId={entry.id} asset={entry.audio} text={entry.text} lang={entry.language} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {examples.length > 0 ? (
        <div className="lz-word-detail__section">
          <p className="lz-eyebrow">VÍ DỤ</p>
          <div className="lz-word-detail__list">
            {examples.slice(0, 4).map((sentence) => (
              <AudioText
                key={sentence.id}
                ownerId={sentence.id}
                text={sentence.text}
                asset={sentence.audio}
                lang={sentence.language}
                languageData={sentence.languageData}
                romanization={sentence.romanization}
                translation={t(sentence.translation)}
                forceSupport
              />
            ))}
          </div>
        </div>
      ) : null}
    </BottomSheet>
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

/**
 * Lexical items always show their reading directly below the target word. The
 * Vietnamese meaning is intentionally absent from the resting state; tapping
 * the word opens the richer lexical detail sheet instead.
 */
export function ItemText({
  item,
  size = "md"
}: {
  item: LexicalItem | undefined;
  size?: AudioTextProps["size"];
  forceSupport?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!item) return null;

  const pinyin = readingFor(item);
  const sizeClass = size === "lg" ? " lz-target--lg" : size === "sm" ? " lz-target--sm" : "";

  return (
    <>
      <div className="lz-lexical-item">
        <button
          type="button"
          className="lz-lexical-item__trigger"
          onClick={() => setOpen(true)}
          aria-label={`${item.text}${pinyin ? `, ${pinyin}` : ""}. Chạm để xem nghĩa tiếng Việt.`}
        >
          <span className={`lz-target${sizeClass}`} lang={item.language}>{item.text}</span>
          {pinyin ? <span className="lz-lexical-item__pinyin">{pinyin}</span> : null}
          <span className="lz-lexical-item__hint">Chạm để xem nghĩa</span>
        </button>
        <AudioButton
          ownerId={item.id}
          asset={item.audio}
          text={item.text}
          lang={item.language}
          size={size === "lg" ? "lg" : "md"}
        />
      </div>
      <WordDetailSheet item={item} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
