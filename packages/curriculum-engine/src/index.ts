import type {
  Concept,
  ContentBundle,
  ContentId,
  Course,
  LearningSkill,
  Lesson,
  LevelDefinition,
  LingozaLevel,
  Unit
} from "../../content-schema/src/index.js";
import { levelRank } from "../../content-schema/src/index.js";

/**
 * `@lingoza/curriculum-engine` -- treats the curriculum as a directed graph of
 * concepts and answers the questions the app actually asks: what is unlocked,
 * what comes next, what is this learner missing.
 *
 * The engine never mutates learner state; it takes a mastery snapshot and
 * returns derived views. Everything is pure and synchronous so it can run
 * inside a render pass without a data-fetching story.
 */

/** Mastery snapshot as far as this engine is concerned. */
export interface MasteryRecord {
  conceptId: ContentId;
  skills: Partial<Record<LearningSkill, number>>;
}

export type MasteryLookup = ReadonlyMap<ContentId, MasteryRecord>;

export function toMasteryLookup(records: readonly MasteryRecord[]): MasteryLookup {
  return new Map(records.map((record) => [record.conceptId, record]));
}

/** Default bar a concept must clear on each of its skills to count as known. */
export const DEFAULT_MASTERY_THRESHOLD = 0.7;

/**
 * Mean of the skills that have actually been practised.
 *
 * Unpractised skills are absent rather than zero, so they are excluded from
 * the mean: a learner who has only ever done listening on a concept should
 * read as "0.8 listening", not "0.11 overall".
 */
export function meanMastery(record: MasteryRecord | undefined): number | null {
  if (!record) return null;
  const scores = Object.values(record.skills).filter(
    (score): score is number => typeof score === "number"
  );
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * True when every skill the concept declares meets its threshold.
 *
 * A concept's own `masteryThresholds` win over the default, which lets an
 * author demand more of, say, `pronunciation` on a tone-contrast concept.
 */
export function isConceptMastered(
  concept: Concept,
  mastery: MasteryLookup,
  fallbackThreshold = DEFAULT_MASTERY_THRESHOLD
): boolean {
  const record = mastery.get(concept.id);
  if (!record) return false;
  return concept.skills.every((skill) => {
    const score = record.skills[skill];
    if (typeof score !== "number") return false;
    return score >= (concept.masteryThresholds[skill] ?? fallbackThreshold);
  });
}

/**
 * Concepts whose prerequisites are all satisfied.
 *
 * Uses the mean of practised skills rather than per-skill thresholds, because
 * unlocking should be more forgiving than declaring something mastered -- a
 * learner shouldn't be blocked from new material by a lagging pronunciation
 * score on a prerequisite.
 */
export function availableConcepts(
  concepts: readonly Concept[],
  mastery: readonly MasteryRecord[] | MasteryLookup,
  threshold = DEFAULT_MASTERY_THRESHOLD
): Concept[] {
  const lookup: MasteryLookup =
    mastery instanceof Map ? mastery : toMasteryLookup(mastery as readonly MasteryRecord[]);
  return concepts.filter((concept) =>
    concept.requires.every((prerequisiteId) => {
      const mean = meanMastery(lookup.get(prerequisiteId));
      return mean !== null && mean >= threshold;
    })
  );
}

/** Skills of a concept sorted worst-first, lowest `limit` returned. */
export function weakestSkills(record: MasteryRecord, limit = 3): LearningSkill[] {
  return (Object.entries(record.skills) as Array<[LearningSkill, number]>)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([skill]) => skill);
}

/* ------------------------------------------------------------------ */
/* Graph index                                                         */
/* ------------------------------------------------------------------ */

/**
 * Pre-resolved views over a bundle. Built once per language pack load; every
 * query below is then a map lookup rather than a scan.
 */
export interface CurriculumGraph {
  bundle: ContentBundle;
  concept(id: ContentId): Concept | undefined;
  lesson(id: ContentId): Lesson | undefined;
  unit(id: ContentId): Unit | undefined;
  course(id: ContentId): Course | undefined;
  level(id: LingozaLevel): LevelDefinition | undefined;
  /** Concepts that directly depend on `id`. */
  dependentsOf(id: ContentId): readonly Concept[];
  /** Lessons that teach `conceptId`. */
  lessonsTeaching(conceptId: ContentId): readonly Lesson[];
  /** Prerequisite closure of `id`, nearest first, excluding `id` itself. */
  prerequisiteClosure(id: ContentId): readonly ContentId[];
  /** Concepts in dependency order. Empty if the graph has a cycle. */
  topologicalOrder(): readonly Concept[];
}

export function buildCurriculumGraph(bundle: ContentBundle): CurriculumGraph {
  const concepts = new Map(bundle.concepts.map((concept) => [concept.id, concept]));
  const lessons = new Map(bundle.lessons.map((lesson) => [lesson.id, lesson]));
  const units = new Map(bundle.units.map((unit) => [unit.id, unit]));
  const courses = new Map(bundle.courses.map((course) => [course.id, course]));
  const levels = new Map(bundle.levels.map((level) => [level.id, level]));

  const dependents = new Map<ContentId, Concept[]>();
  for (const concept of bundle.concepts) {
    for (const requiredId of concept.requires) {
      const bucket = dependents.get(requiredId);
      if (bucket) bucket.push(concept);
      else dependents.set(requiredId, [concept]);
    }
  }

  const teachers = new Map<ContentId, Lesson[]>();
  for (const lesson of bundle.lessons) {
    for (const conceptId of lesson.conceptIds) {
      const bucket = teachers.get(conceptId);
      if (bucket) bucket.push(lesson);
      else teachers.set(conceptId, [lesson]);
    }
  }

  const prerequisiteClosure = (id: ContentId): ContentId[] => {
    const ordered: ContentId[] = [];
    const seen = new Set<ContentId>([id]);
    let frontier = concepts.get(id)?.requires ?? [];
    while (frontier.length > 0) {
      const next: ContentId[] = [];
      for (const candidate of frontier) {
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        ordered.push(candidate);
        next.push(...(concepts.get(candidate)?.requires ?? []));
      }
      frontier = next;
    }
    return ordered;
  };

  let cachedOrder: Concept[] | null = null;
  const topologicalOrder = (): Concept[] => {
    if (cachedOrder) return cachedOrder;
    // Kahn's algorithm. A cycle leaves nodes unemitted, which we surface as an
    // empty result rather than a partial order -- the validator reports it
    // properly, and a partial order would silently hide broken content.
    const indegree = new Map<ContentId, number>();
    for (const concept of bundle.concepts) {
      indegree.set(concept.id, concept.requires.filter((id) => concepts.has(id)).length);
    }
    const queue = bundle.concepts.filter((concept) => indegree.get(concept.id) === 0);
    const result: Concept[] = [];
    while (queue.length > 0) {
      const concept = queue.shift() as Concept;
      result.push(concept);
      for (const dependent of dependents.get(concept.id) ?? []) {
        const remaining = (indegree.get(dependent.id) ?? 0) - 1;
        indegree.set(dependent.id, remaining);
        if (remaining === 0) queue.push(dependent);
      }
    }
    cachedOrder = result.length === bundle.concepts.length ? result : [];
    return cachedOrder;
  };

  return {
    bundle,
    concept: (id) => concepts.get(id),
    lesson: (id) => lessons.get(id),
    unit: (id) => units.get(id),
    course: (id) => courses.get(id),
    level: (id) => levels.get(id),
    dependentsOf: (id) => dependents.get(id) ?? [],
    lessonsTeaching: (conceptId) => teachers.get(conceptId) ?? [],
    prerequisiteClosure,
    topologicalOrder
  };
}

/* ------------------------------------------------------------------ */
/* Progress & next-step queries                                        */
/* ------------------------------------------------------------------ */

export type UnitStatus = "locked" | "available" | "in-progress" | "completed";

export interface UnitProgress {
  unitId: ContentId;
  status: UnitStatus;
  /** 0..1 across the unit's concepts. */
  completion: number;
  masteredConceptIds: ContentId[];
  /** Concepts introduced here that are still gated by unmet prerequisites. */
  blockedConceptIds: ContentId[];
}

/**
 * Status of every unit in a course.
 *
 * A unit is `available` as soon as *any* of its concepts is unlocked, not once
 * all of them are: gating a whole unit on its hardest concept would strand
 * learners who are ready for four of its five lessons.
 */
export function courseProgress(
  graph: CurriculumGraph,
  courseId: ContentId,
  mastery: MasteryLookup
): UnitProgress[] {
  const course = graph.course(courseId);
  if (!course) return [];

  return course.unitIds.map((unitId) => {
    const unit = graph.unit(unitId);
    if (!unit) {
      return {
        unitId,
        status: "locked" as UnitStatus,
        completion: 0,
        masteredConceptIds: [],
        blockedConceptIds: []
      };
    }

    const conceptList = unit.conceptIds
      .map((id) => graph.concept(id))
      .filter((concept): concept is Concept => Boolean(concept));

    const mastered = conceptList.filter((concept) => isConceptMastered(concept, mastery));
    const unlocked = new Set(availableConcepts(conceptList, mastery).map((c) => c.id));
    const blocked = conceptList.filter((concept) => !unlocked.has(concept.id));
    const touched = conceptList.some((concept) => mastery.has(concept.id));

    const completion = conceptList.length === 0 ? 0 : mastered.length / conceptList.length;
    const status: UnitStatus =
      conceptList.length > 0 && mastered.length === conceptList.length
        ? "completed"
        : touched
          ? "in-progress"
          : unlocked.size > 0
            ? "available"
            : "locked";

    return {
      unitId,
      status,
      completion,
      masteredConceptIds: mastered.map((concept) => concept.id),
      blockedConceptIds: blocked.map((concept) => concept.id)
    };
  });
}

export interface NextLessonSuggestion {
  lesson: Lesson;
  unit: Unit;
  course: Course;
  /** Why this lesson: the first not-yet-mastered concept it teaches. */
  reasonConceptId: ContentId;
}

/**
 * The single answer to "what do I do next?".
 *
 * Walks courses in level order, then units and lessons in authored order, and
 * returns the first lesson that teaches an unlocked-but-unmastered concept.
 * Authored order is respected rather than recomputed, because a good
 * curriculum sequence carries pedagogical intent the graph alone doesn't hold.
 */
export function nextLesson(
  graph: CurriculumGraph,
  mastery: MasteryLookup
): NextLessonSuggestion | null {
  const courses = [...graph.bundle.courses].sort(
    (a, b) => levelRank(a.level) - levelRank(b.level)
  );

  for (const course of courses) {
    for (const unitId of course.unitIds) {
      const unit = graph.unit(unitId);
      if (!unit) continue;
      for (const lessonId of unit.lessonIds) {
        const lesson = graph.lesson(lessonId);
        if (!lesson) continue;

        const conceptList = lesson.conceptIds
          .map((id) => graph.concept(id))
          .filter((concept): concept is Concept => Boolean(concept));
        if (conceptList.length === 0) continue;

        const unlocked = new Set(availableConcepts(conceptList, mastery).map((c) => c.id));
        const pending = conceptList.find(
          (concept) => unlocked.has(concept.id) && !isConceptMastered(concept, mastery)
        );
        if (pending) {
          return { lesson, unit, course, reasonConceptId: pending.id };
        }
      }
    }
  }
  return null;
}

export interface WeakConcept {
  conceptId: ContentId;
  /** Mean over practised skills. */
  score: number;
  weakSkills: LearningSkill[];
}

/**
 * Concepts the learner has practised but not consolidated, worst first.
 *
 * Only practised concepts qualify -- something never studied is *new*, not
 * weak, and conflating the two would fill the review queue with material the
 * learner has never seen.
 */
export function weakConcepts(
  graph: CurriculumGraph,
  mastery: MasteryLookup,
  threshold = DEFAULT_MASTERY_THRESHOLD,
  limit = 10
): WeakConcept[] {
  const weak: WeakConcept[] = [];
  for (const record of mastery.values()) {
    const concept = graph.concept(record.conceptId);
    if (!concept) continue;
    const mean = meanMastery(record);
    if (mean === null || mean >= threshold) continue;
    weak.push({
      conceptId: concept.id,
      score: mean,
      weakSkills: weakestSkills(record).filter(
        (skill) => (record.skills[skill] ?? 0) < (concept.masteryThresholds[skill] ?? threshold)
      )
    });
  }
  return weak.sort((a, b) => a.score - b.score).slice(0, limit);
}

/**
 * An ordered path from what the learner knows to `targetConceptId`.
 *
 * Returns only the concepts still missing, in dependency order, so the UI can
 * say "three things stand between you and ordering a coffee" instead of just
 * showing a padlock.
 */
export function learningPathTo(
  graph: CurriculumGraph,
  targetConceptId: ContentId,
  mastery: MasteryLookup
): Concept[] {
  const target = graph.concept(targetConceptId);
  if (!target) return [];

  const needed = new Set<ContentId>([targetConceptId, ...graph.prerequisiteClosure(targetConceptId)]);
  const order = graph.topologicalOrder();
  const ordered = order.length > 0 ? order : graph.bundle.concepts;

  return ordered.filter(
    (concept) => needed.has(concept.id) && !isConceptMastered(concept, mastery)
  );
}

/** Mean mastery per skill across every concept at `level`. Drives the progress screen. */
export function levelSkillProfile(
  graph: CurriculumGraph,
  level: LingozaLevel,
  mastery: MasteryLookup
): Partial<Record<LearningSkill, number>> {
  const totals = new Map<LearningSkill, { sum: number; count: number }>();

  for (const concept of graph.bundle.concepts) {
    if (concept.level !== level) continue;
    const record = mastery.get(concept.id);
    for (const skill of concept.skills) {
      const bucket = totals.get(skill) ?? { sum: 0, count: 0 };
      // Concepts at this level that were never practised count as zero here:
      // level completion should reflect coverage, not just quality on the
      // handful of concepts the learner happened to touch.
      bucket.sum += record?.skills[skill] ?? 0;
      bucket.count += 1;
      totals.set(skill, bucket);
    }
  }

  const profile: Partial<Record<LearningSkill, number>> = {};
  for (const [skill, { sum, count }] of totals) {
    profile[skill] = count === 0 ? 0 : sum / count;
  }
  return profile;
}
