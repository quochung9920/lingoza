import type { Provenance, PublishStatus, ReviewSignoff } from "../../../packages/content-schema/src/index.js";

/**
 * Provenance defaults for the zh-CN seed pack.
 *
 * Every item here is written from scratch by the Lingoza team. Nothing is
 * lifted from a textbook, a competing app, a subtitle file, or an unlicensed
 * corpus -- which is why `origin` is `lingoza-original` throughout and why the
 * only `sourceReferences` that appear are to public frameworks (CEFR
 * descriptors, the official HSK word lists, Unicode/Unihan character data)
 * consulted for *alignment*, never copied from.
 */

const PENDING: ReviewSignoff = { status: "not-started" };

const AUTHORED_AT = "2026-08-18T00:00:00.000Z";

export interface ProvenanceOptions {
  publishStatus?: PublishStatus;
  /** Additional public-standard references consulted for alignment. */
  sourceReferences?: Provenance["sourceReferences"];
}

/**
 * Builds a provenance record.
 *
 * The default `publishStatus` is `VALIDATED`, not `PUBLISHED`: this content has
 * passed the automated validator but no human linguist, native speaker,
 * pedagogy lead or audio engineer has signed it off, and no real recordings
 * exist yet. Claiming PUBLISHED would make the validator's review gate
 * meaningless and would misrepresent the state of the pack.
 */
export function provenance(options: ProvenanceOptions = {}): Provenance {
  return {
    origin: "lingoza-original",
    sourceReferences: options.sourceReferences ?? [],
    license: "Proprietary - (c) Lingoza. All rights reserved.",
    author: "Lingoza Content Team",
    createdAt: AUTHORED_AT,
    updatedAt: AUTHORED_AT,
    version: 1,
    linguisticReview: PENDING,
    nativeReview: PENDING,
    pedagogyReview: PENDING,
    audioReview: PENDING,
    publishStatus: options.publishStatus ?? "VALIDATED"
  };
}

/** CEFR descriptors are consulted for level alignment only. */
export const CEFR_REFERENCE = {
  label: "CEFR Companion Volume descriptors",
  reference: "council-of-europe/cefr-companion-volume",
  note: "Consulted for can-do phrasing and level alignment. Lingoza does not certify CEFR levels."
} as const;

/** Official HSK lists are used as a coverage cross-check, not as content. */
export const HSK_REFERENCE = {
  label: "Official HSK 3.0 word list",
  reference: "chinese-testing-international/hsk-3.0",
  note: "Used only to sanity-check level placement of vocabulary. No list content is redistributed."
} as const;
