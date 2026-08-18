/**
 * Primitives shared by every Lingoza content object.
 *
 * Everything here is language-neutral on purpose: language-specific data
 * (hanzi, pinyin, tone, classifier, ...) lives in `languageData` bags that
 * language packs own and that core engines/UI never read structurally.
 */

/** BCP-47 language tag, e.g. `zh-CN`, `en-US`, `ja-JP`. */
export type LanguageTag = string;

/** Locale tag for the learner's own UI language, e.g. `vi-VN`. */
export type UiLocale = string;

/**
 * Translations of a piece of content into the learner's language(s).
 * Keyed by UI locale so a pack can ship `vi-VN` and `en-US` glosses together.
 */
export type LocalizedText = Record<UiLocale, string>;

/** Opaque, human-readable, stable identifier (`zh.n.coffee`, `zh.a1.u2.l1`). */
export type ContentId = string;

/** 0..1 normalized score used across engines. Never a percentage. */
export type NormalizedScore = number;

export function clamp01(value: number): NormalizedScore {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

export type AudioSpeed = "normal" | "slow";
export type SpeakerGender = "male" | "female" | "unspecified";
export type Register = "neutral" | "formal" | "informal" | "polite" | "written";

/** Timing of a single word/character inside a recording. */
export interface WordTiming {
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * A phrase-level chunk of an utterance. Drives shadowing segmentation
 * (我想 / 我想喝 / 我想喝咖啡) and highlight-on-playback.
 */
export interface AudioSegment {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
}

/** One concrete recording. `src` is resolved against the audio CDN base. */
export interface AudioTrack {
  /** CDN-relative path. Never a full URL — the AudioManager resolves it. */
  src: string;
  speed: AudioSpeed;
  speakerId?: string;
  gender?: SpeakerGender;
  accent?: string;
  register?: Register;
  durationMs?: number;
  segments?: AudioSegment[];
  wordTimings?: WordTiming[];
}

/**
 * Audio attached to a linguistic item.
 *
 * `normal` is required by the Universal Audio Rule: any language content the
 * learner can see must be playable. `available: false` marks content whose
 * recording is not produced yet — the UI degrades gracefully instead of
 * crashing, and the validator reports it as a publish blocker.
 */
export interface AudioAsset {
  normal: AudioTrack;
  slow?: AudioTrack;
  variants?: AudioTrack[];
  /** False while only placeholder metadata exists (no real recording yet). */
  available: boolean;
}

/* ------------------------------------------------------------------ */
/* Provenance & review                                                 */
/* ------------------------------------------------------------------ */

export type PublishStatus = "DRAFT" | "REVIEW" | "VALIDATED" | "PUBLISHED" | "ARCHIVED";

export type ContentOrigin =
  /** Written from scratch by the Lingoza content team. */
  | "lingoza-original"
  /** Derived from a public standard/framework (CEFR descriptors, HSK lists). */
  | "public-standard"
  /** Imported from an explicitly licensed open dataset. */
  | "licensed-import";

export interface SourceReference {
  label: string;
  /** Framework/standard/dataset identifier, not a scraped URL. */
  reference: string;
  note?: string;
}

export type ReviewOutcome = "not-started" | "in-progress" | "approved" | "rejected";

export interface ReviewSignoff {
  status: ReviewOutcome;
  reviewer?: string;
  reviewedAt?: string;
}

/**
 * Attached to every publishable content object. The validator refuses to mark
 * anything PUBLISHED unless all four review gates are `approved`.
 */
export interface Provenance {
  origin: ContentOrigin;
  sourceReferences: SourceReference[];
  license: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  linguisticReview: ReviewSignoff;
  nativeReview: ReviewSignoff;
  pedagogyReview: ReviewSignoff;
  audioReview: ReviewSignoff;
  publishStatus: PublishStatus;
}

export const REVIEW_GATES = [
  "linguisticReview",
  "nativeReview",
  "pedagogyReview",
  "audioReview"
] as const;

export type ReviewGate = (typeof REVIEW_GATES)[number];

export function isFullyReviewed(provenance: Provenance): boolean {
  return REVIEW_GATES.every((gate) => provenance[gate].status === "approved");
}
