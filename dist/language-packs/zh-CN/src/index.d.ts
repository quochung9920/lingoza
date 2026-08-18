import type { ContentBundle, GrammarFrame, LanguageProfile, LegacyDialogueScenario } from "../../../packages/content-schema/src/index.js";
import { assessments } from "./assessments.js";
import { concepts, courses, lessons, levels, units } from "./curriculum.js";
import { scenarios } from "./dialogues.js";
import { lexicalItems, sentences } from "./lexicon.js";
import { patterns } from "./patterns.js";
import { topics } from "./topics.js";
/**
 * `zh-CN` language pack.
 *
 * Everything Chinese-specific lives in this directory. The framework consumes
 * `chineseBundle` through the `ContentBundle` interface and never imports this
 * module by name, which is what a future `ja-JP` pack depends on.
 */
export declare const profile: LanguageProfile;
export declare const chineseBundle: ContentBundle;
export { assessments, concepts, courses, lessons, levels, lexicalItems, patterns, scenarios, sentences, topics, units };
/**
 * The v1 `orderDrinkFrame`, now *derived* from the v2 pattern rather than
 * hand-maintained beside it.
 *
 * This is the migration made verifiable: the original evaluator tests still
 * run, unchanged, against content that is now authored in the v2 schema. If
 * the v2 pattern ever stopped accepting 我要一杯咖啡, those tests would fail.
 */
export declare const orderDrinkFrame: GrammarFrame;
export declare const wantActionFrame: GrammarFrame;
export declare const nameIntroductionFrame: GrammarFrame;
/** Compiled frame for any pattern id in this pack. */
export declare function frameFor(patternId: string): GrammarFrame;
/** @deprecated v1 projection of `zh.dialogue.cafe-order`. */
export declare const restaurantDialogue: LegacyDialogueScenario;
