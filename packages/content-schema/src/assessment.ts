import type { ContentId, LanguageTag, LocalizedText, Provenance } from "./common.js";
import type { LearningSkill, LingozaLevel } from "./taxonomy.js";

export type AssessmentKind =
  /** Places a brand-new learner at a starting level. */
  | "PLACEMENT"
  /** Probes what a learner already knows before a unit starts. */
  | "UNIT_DIAGNOSTIC"
  /** End-of-unit gate. */
  | "UNIT_CHECKPOINT"
  /** Re-checks concepts days after they were taught. */
  | "DELAYED_REVIEW"
  /** End-of-level gate. */
  | "LEVEL_ASSESSMENT";

/**
 * How an item is answered. Assessment never uses free text -- production is
 * checked either by intent selection or by spoken attempt against a pattern.
 */
export type AssessmentResponseMode =
  | "choose-meaning"
  | "choose-audio"
  | "choose-intent"
  | "speak";

/**
 * A single assessment item.
 *
 * Assessments measure *transfer*, so an item must not be a verbatim replay of
 * a lesson activity. `derivedFromActivityId` records the lesson activity an
 * item is testing the transfer of, and the validator rejects any item whose
 * prompt sentence is the same sentence that activity drilled.
 */
export interface AssessmentItem {
  id: ContentId;
  /** Concept being measured. */
  conceptId: ContentId;
  skill: LearningSkill;
  responseMode: AssessmentResponseMode;
  /** Sentence the learner hears/reads as the prompt. */
  promptSentenceId: ContentId;
  /** Extra framing in the learner's language. */
  instruction?: LocalizedText;
  /** For choose-* modes: options and the correct index. */
  choices?: LocalizedText[];
  /** For choose-audio: option sentence ids, each with its own audio. */
  choiceSentenceIds?: ContentId[];
  correctChoiceIndex?: number;
  /** For speak mode: pattern the spoken answer is checked against. */
  expectedPatternId?: ContentId;
  /** Lesson activity this item tests transfer of. Enables the reuse check. */
  derivedFromActivityId?: ContentId;
  /** Relative weight within its skill. Defaults to 1. */
  weight?: number;
}

export interface Assessment {
  id: ContentId;
  language: LanguageTag;
  kind: AssessmentKind;
  title: LocalizedText;
  level: LingozaLevel;
  /** Scope: unit id, course id, or null for placement across the language. */
  scopeId: ContentId | null;
  items: AssessmentItem[];
  /** How many items to serve in one sitting. Items are sampled per skill. */
  itemsPerSitting: number;
  /** Minimum normalized score per skill required to pass. */
  passThresholds: Partial<Record<LearningSkill, number>>;
  provenance: Provenance;
}

/** One learner response, as recorded by the app. */
export interface AssessmentResponse {
  itemId: ContentId;
  /** Index chosen for choose-* modes. */
  choiceIndex?: number;
  /** Normalized 0..1 score for spoken items, from the evaluation pipeline. */
  spokenScore?: number;
  elapsedMs: number;
}

/** Per-skill outcome of a completed sitting. */
export interface AssessmentSkillResult {
  skill: LearningSkill;
  score: number;
  itemCount: number;
  passed: boolean;
}

export interface AssessmentResult {
  assessmentId: ContentId;
  completedAt: string;
  overallScore: number;
  passed: boolean;
  skillResults: AssessmentSkillResult[];
  /** Concepts the sitting showed as weak, worst first. */
  weakConceptIds: ContentId[];
  /** For placement: the level the learner should start at. */
  recommendedLevel?: LingozaLevel;
}
