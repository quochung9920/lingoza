import type { ContentId, LanguageTag, LocalizedText, SourceReference } from "./common.js";

/** A broad stage inside an external proficiency framework. */
export type ProgramStage = "elementary" | "intermediate" | "advanced";

/**
 * Authoring status of a program band.
 *
 * `building` means real learner content exists but coverage is incomplete;
 * `available` is reserved for a band whose required reference catalog and
 * production quality gates have been satisfied.
 */
export type ProgramBandStatus = "available" | "building" | "planned";

/** One ordered band in an aligned learning program, e.g. HSK 1 or HSK 7. */
export interface ProgramBand {
  id: ContentId;
  ordinal: number;
  label: LocalizedText;
  stage: ProgramStage;
  status: ProgramBandStatus;
  description: LocalizedText;
  /** Existing Lingoza courses currently contributing to this band. */
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
