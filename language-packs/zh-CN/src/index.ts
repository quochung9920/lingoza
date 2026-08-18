import type {
  ContentBundle,
  GrammarFrame,
  LanguageProfile,
  LegacyDialogueScenario
} from "../../../packages/content-schema/src/index.js";
import { compilePatternToFrame } from "../../../packages/evaluation-engine/src/index.js";
import { toLegacyScenario } from "../../../packages/dialogue-engine/src/index.js";
import { assessments } from "./assessments.js";
import {
  concepts as coreConcepts,
  courses as coreCourses,
  lessons as coreLessons,
  levels,
  units as coreUnits
} from "./curriculum.js";
import { scenarios } from "./dialogues.js";
import {
  coreCourseUnitExtensions,
  expansionConcepts,
  expansionCourses,
  expansionLessons,
  expansionLexicalItems,
  expansionSentences,
  expansionUnits
} from "./expansion-bundle.js";
import { lexicalItems as coreLexicalItems, sentences as coreSentences } from "./lexicon.js";
import { patterns } from "./patterns.js";
import { topics } from "./topics.js";

/**
 * `zh-CN` language pack.
 *
 * The compact original vertical slice remains intact for migration tests while
 * production-oriented expansion content is merged here. Existing concept ids
 * are deliberately reused by specialist courses, so learning a word in the
 * foundation path also counts when it appears in Travel/Pronunciation/etc.
 */

export const profile: LanguageProfile = {
  language: "zh-CN",
  name: { "vi-VN": "Tiếng Trung", "en-US": "Chinese (Mandarin)" },
  endonym: "中文",
  flag: "🇨🇳",
  supportLayers: [
    {
      key: "pinyin",
      label: { "vi-VN": "Phiên âm (pinyin)", "en-US": "Romanization (pinyin)" },
      defaultOnUpTo: "A2"
    },
    {
      key: "traditional",
      label: { "vi-VN": "Chữ phồn thể", "en-US": "Traditional characters" },
      defaultOnUpTo: "A0"
    }
  ],
  audioBasePath: "zh-CN"
};

export const lexicalItems = [...coreLexicalItems, ...expansionLexicalItems];
export const sentences = [...coreSentences, ...expansionSentences];
export const concepts = [...coreConcepts, ...expansionConcepts];
export const units = [...coreUnits, ...expansionUnits];
export const lessons = [...coreLessons, ...expansionLessons];

export const courses = [
  ...coreCourses.map((course) => ({
    ...course,
    unitIds: [...course.unitIds, ...(coreCourseUnitExtensions[course.id] ?? [])]
  })),
  ...expansionCourses
];

export const chineseBundle: ContentBundle = {
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

export {
  assessments,
  levels,
  patterns,
  scenarios,
  topics
};

/* ------------------------------------------------------------------ */
/* Migration adapters                                                  */
/* ------------------------------------------------------------------ */

export const orderDrinkFrame: GrammarFrame = compilePatternToFrame(
  patterns.find((pattern) => pattern.id === "zh.p.order-drink")!,
  lexicalItems,
  { locale: "vi-VN" }
);

export const wantActionFrame: GrammarFrame = compilePatternToFrame(
  patterns.find((pattern) => pattern.id === "zh.p.want-action")!,
  lexicalItems,
  { locale: "vi-VN" }
);

export const nameIntroductionFrame: GrammarFrame = compilePatternToFrame(
  patterns.find((pattern) => pattern.id === "zh.p.name-introduction")!,
  lexicalItems,
  { locale: "vi-VN" }
);

/** Compiled frame for any pattern id in this pack. */
export function frameFor(patternId: string): GrammarFrame {
  const pattern = patterns.find((candidate) => candidate.id === patternId);
  if (!pattern) throw new Error(`zh-CN pack has no pattern "${patternId}"`);
  return compilePatternToFrame(pattern, lexicalItems, { locale: "vi-VN" });
}

const sentenceText = (id: string): string =>
  sentences.find((sentence) => sentence.id === id)?.text ?? "";

/** @deprecated v1 projection of `zh.dialogue.cafe-order`. */
export const restaurantDialogue: LegacyDialogueScenario = toLegacyScenario(
  scenarios.find((scenario) => scenario.id === "zh.dialogue.cafe-order")!,
  sentenceText
);
