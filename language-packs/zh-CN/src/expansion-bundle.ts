import type { ContentId } from "../../../packages/content-schema/src/index.js";
import {
  coreCourseUnitExtensions,
  expansionConcepts as authoredConcepts,
  expansionCourses,
  expansionLessons as authoredLessons,
  expansionLexicalItems,
  expansionSentences,
  expansionUnits as authoredUnits
} from "./expansion.js";

/**
 * Topic ids and concept ids share the global ContentId namespace. The authoring
 * vocabulary uses short semantic names, so this adapter namespaces the two
 * concept names that intentionally mirror topic names before they enter the
 * validated ContentBundle.
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

export {
  coreCourseUnitExtensions,
  expansionCourses,
  expansionLexicalItems,
  expansionSentences
};
