import type { Concept, ContentBundle, ContentId, Course, LearningSkill, Lesson, LevelDefinition, LingozaLevel, Unit } from "../../content-schema/src/index.js";
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
export declare function toMasteryLookup(records: readonly MasteryRecord[]): MasteryLookup;
/** Default bar a concept must clear on each of its skills to count as known. */
export declare const DEFAULT_MASTERY_THRESHOLD = 0.7;
/**
 * Mean of the skills that have actually been practised.
 *
 * Unpractised skills are absent rather than zero, so they are excluded from
 * the mean: a learner who has only ever done listening on a concept should
 * read as "0.8 listening", not "0.11 overall".
 */
export declare function meanMastery(record: MasteryRecord | undefined): number | null;
/**
 * True when every skill the concept declares meets its threshold.
 *
 * A concept's own `masteryThresholds` win over the default, which lets an
 * author demand more of, say, `pronunciation` on a tone-contrast concept.
 */
export declare function isConceptMastered(concept: Concept, mastery: MasteryLookup, fallbackThreshold?: number): boolean;
/**
 * Concepts whose prerequisites are all satisfied.
 *
 * Uses the mean of practised skills rather than per-skill thresholds, because
 * unlocking should be more forgiving than declaring something mastered -- a
 * learner shouldn't be blocked from new material by a lagging pronunciation
 * score on a prerequisite.
 */
export declare function availableConcepts(concepts: readonly Concept[], mastery: readonly MasteryRecord[] | MasteryLookup, threshold?: number): Concept[];
/** Skills of a concept sorted worst-first, lowest `limit` returned. */
export declare function weakestSkills(record: MasteryRecord, limit?: number): LearningSkill[];
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
export declare function buildCurriculumGraph(bundle: ContentBundle): CurriculumGraph;
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
export declare function courseProgress(graph: CurriculumGraph, courseId: ContentId, mastery: MasteryLookup): UnitProgress[];
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
export declare function nextLesson(graph: CurriculumGraph, mastery: MasteryLookup): NextLessonSuggestion | null;
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
export declare function weakConcepts(graph: CurriculumGraph, mastery: MasteryLookup, threshold?: number, limit?: number): WeakConcept[];
/**
 * An ordered path from what the learner knows to `targetConceptId`.
 *
 * Returns only the concepts still missing, in dependency order, so the UI can
 * say "three things stand between you and ordering a coffee" instead of just
 * showing a padlock.
 */
export declare function learningPathTo(graph: CurriculumGraph, targetConceptId: ContentId, mastery: MasteryLookup): Concept[];
/** Mean mastery per skill across every concept at `level`. Drives the progress screen. */
export declare function levelSkillProfile(graph: CurriculumGraph, level: LingozaLevel, mastery: MasteryLookup): Partial<Record<LearningSkill, number>>;
