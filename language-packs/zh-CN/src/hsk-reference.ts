import { GF0025_REFERENCE } from "./hsk.js";

export type HskBand = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type HskReferenceDimension = "syllable" | "character" | "lexical" | "grammar";
export type HskReferenceCatalogStatus = "not-loaded" | "partial" | "complete";

export interface HskReferenceEntry {
  id: string;
  band: HskBand;
  dimension: HskReferenceDimension;
  value: string;
}

export interface HskReferenceCatalog {
  standard: typeof GF0025_REFERENCE.reference;
  status: HskReferenceCatalogStatus;
  /**
   * Entries are intentionally empty until imported from a reviewed official
   * source. Lingoza must never fabricate an HSK percentage from authored lesson
   * content alone.
   */
  entries: HskReferenceEntry[];
}

/**
 * Reference-catalog gate for exact HSK coverage.
 *
 * The product roadmap can exist before this catalog is populated, but a band
 * cannot be promoted to `available` merely because it has many lessons. Exact
 * equivalence requires this catalog to be complete and cross-checked.
 */
export const hskReferenceCatalog: HskReferenceCatalog = {
  standard: GF0025_REFERENCE.reference,
  status: "not-loaded",
  entries: []
};
