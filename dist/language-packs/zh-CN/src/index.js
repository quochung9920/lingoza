import { compilePatternToFrame } from "../../../packages/evaluation-engine/src/index.js";
import { toLegacyScenario } from "../../../packages/dialogue-engine/src/index.js";
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
export const profile = {
    language: "zh-CN",
    name: { "vi-VN": "Tiếng Trung", "en-US": "Chinese (Mandarin)" },
    endonym: "中文",
    flag: "🇨🇳",
    /**
     * Reading aids, declared as data. The UI renders a toggle per layer and
     * looks the key up in each item's `languageData` -- it has no idea what
     * "pinyin" means, which is exactly the point.
     */
    supportLayers: [
        {
            key: "pinyin",
            label: { "vi-VN": "Phiên âm (pinyin)", "en-US": "Romanization (pinyin)" },
            // Beginners need it constantly; by A2 leaning on it slows reading down.
            defaultOnUpTo: "A2"
        },
        {
            key: "traditional",
            label: { "vi-VN": "Chữ phồn thể", "en-US": "Traditional characters" },
            defaultOnUpTo: "A0"
        }
    ],
    /** Resolved at runtime against the audio CDN base; no assets are bundled. */
    audioBasePath: "zh-CN"
};
export const chineseBundle = {
    profile,
    levels,
    topics,
    concepts,
    lexicalItems,
    sentences,
    patterns,
    courses,
    units,
    lessons,
    scenarios,
    assessments
};
export { assessments, concepts, courses, lessons, levels, lexicalItems, patterns, scenarios, sentences, topics, units };
/* ------------------------------------------------------------------ */
/* Migration adapters                                                  */
/* ------------------------------------------------------------------ */
/**
 * The v1 `orderDrinkFrame`, now *derived* from the v2 pattern rather than
 * hand-maintained beside it.
 *
 * This is the migration made verifiable: the original evaluator tests still
 * run, unchanged, against content that is now authored in the v2 schema. If
 * the v2 pattern ever stopped accepting 我要一杯咖啡, those tests would fail.
 */
export const orderDrinkFrame = compilePatternToFrame(patterns.find((pattern) => pattern.id === "zh.p.order-drink"), lexicalItems, { locale: "vi-VN" });
export const wantActionFrame = compilePatternToFrame(patterns.find((pattern) => pattern.id === "zh.p.want-action"), lexicalItems, { locale: "vi-VN" });
export const nameIntroductionFrame = compilePatternToFrame(patterns.find((pattern) => pattern.id === "zh.p.name-introduction"), lexicalItems, { locale: "vi-VN" });
/** Compiled frame for any pattern id in this pack. */
export function frameFor(patternId) {
    const pattern = patterns.find((candidate) => candidate.id === patternId);
    if (!pattern)
        throw new Error(`zh-CN pack has no pattern "${patternId}"`);
    return compilePatternToFrame(pattern, lexicalItems, { locale: "vi-VN" });
}
const sentenceText = (id) => sentences.find((sentence) => sentence.id === id)?.text ?? "";
/** @deprecated v1 projection of `zh.dialogue.cafe-order`. */
export const restaurantDialogue = toLegacyScenario(scenarios.find((scenario) => scenario.id === "zh.dialogue.cafe-order"), sentenceText);
