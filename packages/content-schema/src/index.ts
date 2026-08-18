/**
 * `@lingoza/content-schema` -- the single source of truth for every content
 * shape in Lingoza.
 *
 * Two rules govern everything in here:
 *
 * 1. **Language-neutral core.** Nothing outside a `languageData` bag may be
 *    specific to one language. Chinese ships `hanzi`/`pinyin`/`tones` inside
 *    `languageData`; the framework never reads those keys.
 * 2. **Audio is not optional.** Every content object a learner can *see* in
 *    the target language carries an `AudioAsset`. The content validator
 *    enforces this, so the Universal Audio Rule is a type-and-CI guarantee
 *    rather than a UI convention.
 */

export * from "./common.js";
export * from "./taxonomy.js";
export * from "./lexicon.js";
export * from "./curriculum.js";
export * from "./dialogue.js";
export * from "./assessment.js";
export * from "./evaluation.js";
export * from "./legacy.js";
