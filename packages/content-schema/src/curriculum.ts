import type { ContentId, LanguageTag, LocalizedText, Provenance } from "./common.js";
import type { Assessment } from "./assessment.js";
import type { DialogueScenarioV2 } from "./dialogue.js";
import type { ExampleSentence, LexicalItem, SyntaxPattern } from "./lexicon.js";
import type { LearningProgram } from "./program.js";
import type {
  ActivityKind,
  CefrReference,
  LearningSkill,
  LingozaLevel,
  SublevelId,
  Topic
} from "./taxonomy.js";

/* ------------------------------------------------------------------ */
/* Concept graph                                                       */
/* ------------------------------------------------------------------ */

/**
 * The atomic unit of *knowing something*. Mastery, SRS and unlocking all
 * operate on concepts, never on lessons -- finishing a lesson's UI is not
 * evidence of learning.
 *
 * Concepts form a directed graph via `requires`/`unlocks`, so the curriculum
 * is a dependency graph that happens to have a recommended linear reading,
 * rather than a list.
 */
export interface Concept {
  id: ContentId;
  language: LanguageTag;
  title: LocalizedText;
  /** What the learner can do once this is mastered. Learner-facing copy. */
  canDo: LocalizedText;
  level: LingozaLevel;
  sublevel: SublevelId;
  topics: ContentId[];
  skills: LearningSkill[];
  /** Concept ids that must be mastered first. */
  requires: ContentId[];
  /** Concept ids this one opens up. Authored for clarity, cross-checked. */
  unlocks: ContentId[];
  /** Non-blocking associations, used for review clustering and "see also". */
  relatedConcepts: ContentId[];
  lexicalItemIds: ContentId[];
  patternIds: ContentId[];
  /** Per-skill mastery threshold (0..1) required to count as mastered. */
  masteryThresholds: Partial<Record<LearningSkill, number>>;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* Level definition                                                    */
/* ------------------------------------------------------------------ */

/**
 * A level is defined by what the learner can *do*, not by a word count.
 * `vocabularyTarget` exists, but as one target among seven.
 */
export interface LevelDefinition {
  id: LingozaLevel;
  language: LanguageTag;
  name: LocalizedText;
  /** Reference alignment only. Lingoza does not certify CEFR. */
  cefrTarget: CefrReference;
  /** Sublevels in order, e.g. ["A1.1", "A1.2"]. */
  sublevels: SublevelId[];
  canDoObjectives: LocalizedText[];
  listeningTargets: LocalizedText[];
  speakingTargets: LocalizedText[];
  pronunciationTargets: LocalizedText[];
  syntaxTargets: LocalizedText[];
  conversationTargets: LocalizedText[];
  /** Indicative active/passive item counts. A target, not the definition. */
  vocabularyTarget: { active: number; passive: number };
  topicCoverage: ContentId[];
  /** Minimum mean mastery per skill to be considered done with the level. */
  masteryRequirements: Partial<Record<LearningSkill, number>>;
  /** Pack-specific external reference, e.g. { hsk: 1 }. Reference only. */
  externalReferences?: Record<string, string | number>;
}

/* ------------------------------------------------------------------ */
/* Course / Unit / Lesson / Activity                                   */
/* ------------------------------------------------------------------ */

export interface Course {
  id: ContentId;
  language: LanguageTag;
  level: LingozaLevel;
  title: LocalizedText;
  description: LocalizedText;
  /** Unit ids in recommended order. */
  unitIds: ContentId[];
  provenance: Provenance;
}

export interface Unit {
  id: ContentId;
  courseId: ContentId;
  title: LocalizedText;
  /** The outcomes a learner unlocks by finishing this unit. */
  canDoObjectives: LocalizedText[];
  topics: ContentId[];
  /** Lesson ids in recommended order. */
  lessonIds: ContentId[];
  /** Concepts this unit is responsible for teaching. */
  conceptIds: ContentId[];
  checkpointAssessmentId?: ContentId;
  icon?: string;
  provenance: Provenance;
}

/**
 * A lesson is a *contract*: one can-do outcome, the concepts it teaches, and
 * an ordered activity list that must include at least one listening and one
 * speaking activity. The content validator enforces that.
 */
export interface Lesson {
  id: ContentId;
  unitId: ContentId;
  title: LocalizedText;
  /** The single sentence the learner reads: "Toi co the goi mot do uong." */
  canDo: LocalizedText;
  level: LingozaLevel;
  sublevel: SublevelId;
  topics: ContentId[];
  conceptIds: ContentId[];
  estimatedMinutes: number;
  /** Short scene-setting line, shown before the first activity. */
  context?: LocalizedText;
  activities: Activity[];
  provenance: Provenance;
}

/** Shared fields on every activity, whatever its kind. */
interface ActivityBase {
  id: ContentId;
  kind: ActivityKind;
  /** Learner-facing instruction. Never contains target-language content. */
  instruction: LocalizedText;
  /** Concepts this activity provides mastery evidence for. */
  conceptIds: ContentId[];
  /** Skills this activity scores. Defaults to ACTIVITY_SKILL_MAP[kind]. */
  skills?: LearningSkill[];
}

/** Hear an utterance, then confirm understanding by picking its meaning. */
export interface ListenUnderstandActivity extends ActivityBase {
  kind: "LISTEN_UNDERSTAND";
  sentenceId: ContentId;
  /** Meaning options in the learner's own language. */
  choices: LocalizedText[];
  correctChoiceIndex: number;
}

/** Hear an utterance, pick which of several target-language items it was. */
export interface ListenChooseActivity extends ActivityBase {
  kind: "LISTEN_CHOOSE";
  promptSentenceId: ContentId;
  /** Lexical item ids offered as options; each renders with its own audio. */
  optionItemIds: ContentId[];
  correctItemId: ContentId;
}

/** Hear it, say it back. The workhorse of the speaking-first design. */
export interface ListenRepeatActivity extends ActivityBase {
  kind: "LISTEN_REPEAT";
  targetId: ContentId;
  targetType: "lexicalItem" | "sentence";
  /** Play the slow track automatically before the first attempt. */
  slowFirst: boolean;
}

/** Chunked repetition, building an utterance up phrase by phrase. */
export interface ShadowingActivity extends ActivityBase {
  kind: "SHADOWING";
  sentenceId: ContentId;
  /** Segment ids from the sentence's audio, in build-up order. */
  segmentOrder: string[];
}

/** Focused prosody practice on a single measurable feature. */
export interface PronunciationDrillActivity extends ActivityBase {
  kind: "PRONUNCIATION_DRILL";
  targetIds: ContentId[];
  targetType: "lexicalItem" | "sentence";
  /** Which measurable feature this drill emphasises in its feedback. */
  focus: "tone" | "rhythm" | "pace" | "pausing";
}

/** Hear a question, answer out loud within a countdown. Builds reflex. */
export interface QuickResponseActivity extends ActivityBase {
  kind: "QUICK_RESPONSE";
  promptSentenceId: ContentId;
  /** Pattern whose slots define acceptable answers. */
  expectedPatternId: ContentId;
  responseWindowMs: number;
  /** Model answers the learner can reveal and hear. */
  hintSentenceIds: ContentId[];
}

/** Say a target sentence from a meaning prompt, with hints on demand. */
export interface GuidedSpeakingActivity extends ActivityBase {
  kind: "GUIDED_SPEAKING";
  /** Prompt shown in the learner's own language. */
  prompt: LocalizedText;
  targetSentenceId: ContentId;
  expectedPatternId: ContentId;
  hintSentenceIds: ContentId[];
}

/** Same pattern, swapped slot filler. Rounds are generated from the pattern. */
export interface SubstitutionDrillActivity extends ActivityBase {
  kind: "SUBSTITUTION_DRILL";
  patternId: ContentId;
  /** Slot being substituted across the drill's rounds. */
  slotName: string;
  /** Lexical item ids to cycle through that slot. */
  substitutionItemIds: ContentId[];
}

/** Listen through a scripted exchange before performing it. */
export interface DialogueActivity extends ActivityBase {
  kind: "DIALOGUE";
  scenarioId: ContentId;
  /** Listen-only pass: no microphone, builds the model first. */
  mode: "listen-through";
}

/** Perform one side of a scenario against the deterministic state machine. */
export interface RolePlayActivity extends ActivityBase {
  kind: "ROLE_PLAY";
  scenarioId: ContentId;
  learnerRole: string;
}

/** Longer listening passage with comprehension checks. */
export interface ListeningChallengeActivity extends ActivityBase {
  kind: "LISTENING_CHALLENGE";
  sentenceIds: ContentId[];
  questions: Array<{
    id: ContentId;
    prompt: LocalizedText;
    choices: LocalizedText[];
    correctChoiceIndex: number;
  }>;
}

/** SRS-driven vocabulary pass. Items are supplied by the review engine. */
export interface VocabularyReviewActivity extends ActivityBase {
  kind: "VOCABULARY_REVIEW";
  itemIds: ContentId[];
}

/** SRS-driven pattern pass. */
export interface PatternReviewActivity extends ActivityBase {
  kind: "PATTERN_REVIEW";
  patternIds: ContentId[];
}

/** Terminal activity that hands control to the assessment engine. */
export interface AssessmentActivity extends ActivityBase {
  kind: "UNIT_CHECKPOINT" | "LEVEL_ASSESSMENT";
  assessmentId: ContentId;
}

export type Activity =
  | ListenUnderstandActivity
  | ListenChooseActivity
  | ListenRepeatActivity
  | ShadowingActivity
  | PronunciationDrillActivity
  | QuickResponseActivity
  | GuidedSpeakingActivity
  | SubstitutionDrillActivity
  | DialogueActivity
  | RolePlayActivity
  | ListeningChallengeActivity
  | VocabularyReviewActivity
  | PatternReviewActivity
  | AssessmentActivity;

/* ------------------------------------------------------------------ */
/* Language profile & bundle                                           */
/* ------------------------------------------------------------------ */

/**
 * What a language pack declares about itself. `supportLayers` tells the UI
 * which optional reading aids to offer in settings without the core ever
 * knowing that "pinyin" is a Chinese thing.
 */
export interface LanguageProfile {
  language: LanguageTag;
  name: LocalizedText;
  /** Native name of the language. */
  endonym: string;
  flag?: string;
  supportLayers: Array<{
    /** Key looked up in a content object's `languageData` bag. */
    key: string;
    label: LocalizedText;
    /** Shown by default at or below this level. */
    defaultOnUpTo: LingozaLevel;
  }>;
  /** Base path prefix for this pack's audio assets (CDN-ready). */
  audioBasePath: string;
}

/**
 * Everything a language pack ships. Engines accept this bundle rather than
 * importing a pack directly, which is what keeps the core language-neutral.
 */
export interface ContentBundle {
  profile: LanguageProfile;
  /** Optional external-standard learning programs, e.g. an HSK 1-9 roadmap. */
  programs?: LearningProgram[];
  levels: LevelDefinition[];
  topics: Topic[];
  concepts: Concept[];
  lexicalItems: LexicalItem[];
  sentences: ExampleSentence[];
  patterns: SyntaxPattern[];
  courses: Course[];
  units: Unit[];
  lessons: Lesson[];
  scenarios: DialogueScenarioV2[];
  assessments: Assessment[];
}
