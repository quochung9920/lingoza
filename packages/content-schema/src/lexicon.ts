import type {
  AudioAsset,
  ContentId,
  LanguageTag,
  LocalizedText,
  Provenance,
  Register
} from "./common.js";
import type { KnowledgeDepth, LingozaLevel } from "./taxonomy.js";

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "numeral"
  | "measure-word"
  | "particle"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "phrase";

/** Corpus frequency band. 1 = most frequent. Drives review prioritisation. */
export type FrequencyBand = 1 | 2 | 3 | 4 | 5;

/**
 * Language-specific fields. Core engines and core UI must never read these
 * structurally — only a language pack's own renderer may. This is what keeps
 * `hanzi`/`pinyin`/`tone` out of the framework.
 */
export interface LanguageData {
  [key: string]: unknown;
}

/** Chinese-pack shape of `LanguageData`. Documented here for pack authors. */
export interface ChineseLanguageData extends LanguageData {
  simplified: string;
  traditional: string;
  pinyin: string;
  /** Tone number per syllable, 5 = neutral. */
  tones: number[];
  classifier?: string;
  hskReference?: number;
}

/**
 * One dictionary-style sense of a lexical item. `meaning` remains the compact
 * gloss used by exercises; senses power the on-demand detail sheet so learners
 * can inspect nuance without having Vietnamese permanently visible under every
 * target-language word.
 */
export interface LexicalSense {
  id: string;
  gloss: LocalizedText;
  /** Slightly fuller learner-facing explanation of this sense. */
  definition?: LocalizedText;
  /** Usage/register note that prevents a superficially-correct misuse. */
  usageNote?: LocalizedText;
  /** Examples that specifically demonstrate this sense. */
  exampleSentenceIds: ContentId[];
}

/**
 * A lexical item: word, fixed phrase, or collocation. The `kind` distinction
 * lets one entry (咖啡) own its collocations (喝咖啡, 一杯咖啡) as first-class
 * entries with their own audio rather than as bare strings.
 */
export interface LexicalItem {
  id: ContentId;
  language: LanguageTag;
  kind: "word" | "phrase" | "collocation";
  /** Written form in the target language, as the learner sees it. */
  text: string;
  /** Phonetic transcription (pinyin, romaji, IPA...). Support layer only. */
  romanization?: string;
  /** Compact gloss used in exercises and search results. */
  meaning: LocalizedText;
  /** Optional detailed dictionary-style senses, revealed on demand. */
  senses?: LexicalSense[];
  /** Whole-item usage note when it applies across all senses. */
  usageNote?: LocalizedText;
  partOfSpeech: PartOfSpeech;
  level: LingozaLevel;
  /** Target depth this item should reach at its level. */
  targetDepth: Exclude<KnowledgeDepth, "unseen">;
  topics: ContentId[];
  semanticCategory?: string;
  register: Register;
  frequencyBand: FrequencyBand;
  synonyms: ContentId[];
  antonyms: ContentId[];
  /** Ids of `LexicalItem`s of kind `collocation` built on this item. */
  collocations: ContentId[];
  /** Ids of `ExampleSentence`s that use this item. */
  exampleSentenceIds: ContentId[];
  audio: AudioAsset;
  languageData: LanguageData;
  provenance: Provenance;
}

/**
 * A full sentence with audio. Used by patterns, listening activities,
 * vocabulary cards and assessments alike, so a sentence is authored once.
 */
export interface ExampleSentence {
  id: ContentId;
  language: LanguageTag;
  text: string;
  romanization?: string;
  translation: LocalizedText;
  level: LingozaLevel;
  topics: ContentId[];
  register: Register;
  /** Lexical items appearing in this sentence. */
  lexicalItemIds: ContentId[];
  /** Syntax pattern this sentence instantiates, if any. */
  patternId?: ContentId;
  audio: AudioAsset;
  languageData: LanguageData;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* Syntax / grammar patterns                                           */
/* ------------------------------------------------------------------ */

/**
 * One replaceable position in a pattern template. `acceptedItemIds` are the
 * lexical items the deterministic evaluator will accept in that slot — which
 * is also what makes substitution drills generatable rather than hand-written.
 */
export interface PatternSlot {
  name: string;
  label: LocalizedText;
  acceptedItemIds: ContentId[];
  /** Literal surface forms accepted in addition to the lexical items. */
  acceptedSurfaces: string[];
  optional: boolean;
  /** Shown when the learner's attempt is missing this slot. */
  hint: LocalizedText;
}

/**
 * A sentence pattern such as `SUBJECT + 想 + VERB + OBJECT`.
 *
 * `templates` use `{slotName}` placeholders and compile to the deterministic
 * matcher in `evaluation-engine`. Grammar is taught by hearing many
 * instantiations first; `explanation` is intentionally one short paragraph.
 */
export interface SyntaxPattern {
  id: ContentId;
  language: LanguageTag;
  /** Communicative intent this pattern realises, e.g. `restaurant.order.drink`. */
  intent: string;
  name: LocalizedText;
  /** Human-facing skeleton, e.g. `我想 + hành động`. Display only. */
  skeleton: string;
  /** Machine-matchable templates with `{slot}` placeholders. */
  templates: string[];
  slots: PatternSlot[];
  level: LingozaLevel;
  topics: ContentId[];
  register: Register;
  /** Lexical items the learner should already know before this pattern. */
  prerequisiteItemIds: ContentId[];
  /** Ids of `ExampleSentence`s. Minimum of two enforced by the validator. */
  exampleSentenceIds: ContentId[];
  /** Deliberately short: two or three sentences after the audio examples. */
  explanation: LocalizedText;
  usageNote?: LocalizedText;
  provenance: Provenance;
}
