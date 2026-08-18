import type { ContentId, LanguageTag, LocalizedText, SourceReference } from "./common.js";

/** A broad stage inside an external proficiency framework. */
export type ProgramStage = "elementary" | "intermediate" | "advanced";

/** Whether the curriculum structure itself has been designed. */
export type ProgramBandDevelopmentStatus = "developed" | "in-development";

/**
 * Commercial release readiness of a program band.
 *
 * This is deliberately NOT the same thing as `developmentStatus`.
 * A band may already have its full structure, themes, targets and learner
 * outcomes designed while still being `planned` or `building` for commercial
 * release because authored lessons, reviewed audio, reference coverage or
 * human sign-off are incomplete.
 *
 * `planned`  = blueprint exists, learner-production work is not yet complete.
 * `building` = real learner content exists, but one or more release gates remain.
 * `available` = required reference coverage and production quality gates pass.
 */
export type ProgramBandStatus = "available" | "building" | "planned";

/** One ordered band in an aligned learning program, e.g. HSK 1 or HSK 7. */
export interface ProgramBand {
  id: ContentId;
  ordinal: number;
  label: LocalizedText;
  stage: ProgramStage;
  /** Curriculum-design completeness. Independent from release readiness. */
  developmentStatus: ProgramBandDevelopmentStatus;
  /** Release readiness, not curriculum-design completeness. */
  status: ProgramBandStatus;
  description: LocalizedText;
  /** Existing Lingoza courses currently contributing learner content to this band. */
  courseIds: ContentId[];
  /** Learner-facing outcomes, not claims of official certification. */
  canDoObjectives: LocalizedText[];
}

/**
 * A language pack's alignment to an external learning/testing framework.
 * Programs are reference-aligned; they are never represented as certification.
 */
export interface LearningProgram {
  id: ContentId;
  language: LanguageTag;
  title: LocalizedText;
  description: LocalizedText;
  alignmentReference: SourceReference;
  bands: ProgramBand[];
}
