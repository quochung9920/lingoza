import type { ContentId, ExampleSentence, LexicalItem } from "../../../packages/content-schema/src/index.js";
import {
  coreCourseUnitExtensions,
  expansionConcepts as authoredConcepts,
  expansionCourses,
  expansionLessons as authoredLessons,
  expansionLexicalItems as authoredLexicalItems,
  expansionSentences,
  expansionUnits as authoredUnits
} from "./expansion.js";

/**
 * Topic ids and concept ids share the global ContentId namespace. The authoring
 * vocabulary uses short semantic names, so this adapter namespaces concept names
 * that intentionally mirror topic names before they enter the validated bundle.
 */
const CONCEPT_ID_MAP: Readonly<Record<string, ContentId>> = {
  "work.office": "concept.work.office",
  "services.help": "concept.services.help"
};

function conceptId(id: ContentId): ContentId {
  return CONCEPT_ID_MAP[id] ?? id;
}

export const expansionConcepts = authoredConcepts.map((concept) => ({
  ...concept,
  id: conceptId(concept.id),
  requires: concept.requires.map(conceptId),
  unlocks: concept.unlocks.map(conceptId),
  relatedConcepts: concept.relatedConcepts.map(conceptId)
}));

export const expansionLessons = authoredLessons.map((lesson) => ({
  ...lesson,
  conceptIds: lesson.conceptIds.map(conceptId),
  activities: lesson.activities.map((activity) => ({
    ...activity,
    conceptIds: activity.conceptIds.map(conceptId)
  }))
}));

export const expansionUnits = authoredUnits.map((unit) => ({
  ...unit,
  conceptIds: unit.conceptIds.map(conceptId)
}));

/**
 * A word-detail example must literally contain the lexical item it illustrates.
 * Expansion authoring deliberately reuses a small set of situation sentences,
 * so this normalization removes topic-level references that are useful for
 * planning but would be misleading inside the learner-facing dictionary sheet.
 */
const sentenceById = new Map<ContentId, ExampleSentence>(
  expansionSentences.map((sentence) => [sentence.id, sentence])
);

function isLiteralExample(itemId: ContentId, sentenceId: ContentId): boolean {
  return sentenceById.get(sentenceId)?.lexicalItemIds.includes(itemId) ?? false;
}

export const expansionLexicalItems: LexicalItem[] = authoredLexicalItems.map((item) => {
  const exampleSentenceIds = item.exampleSentenceIds.filter((sentenceId) =>
    isLiteralExample(item.id, sentenceId)
  );

  return {
    ...item,
    exampleSentenceIds,
    senses: item.senses?.map((sense) => ({
      ...sense,
      exampleSentenceIds: sense.exampleSentenceIds.filter((sentenceId) =>
        isLiteralExample(item.id, sentenceId)
      )
    }))
  };
});

export {
  coreCourseUnitExtensions,
  expansionCourses,
  expansionSentences
};
