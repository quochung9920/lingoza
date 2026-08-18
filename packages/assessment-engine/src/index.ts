import type {
  Assessment,
  AssessmentItem,
  AssessmentResponse,
  AssessmentResult,
  AssessmentSkillResult,
  ContentId,
  LearningSkill,
  LingozaLevel
} from "../../content-schema/src/index.js";
import { LINGOZA_LEVELS, clamp01 } from "../../content-schema/src/index.js";

/**
 * `@lingoza/assessment-engine` -- selects assessment items and scores sittings.
 *
 * The design constraint that shapes everything here is *transfer*: an
 * assessment must not be the lesson replayed. If a lesson drilled 你想喝什么，
 * the checkpoint should probe the same communicative intent through 您要喝点
 * 什么。Items therefore declare `derivedFromActivityId`, and both the selector
 * and the content validator use it to keep rehearsed material out.
 */

/* ------------------------------------------------------------------ */
/* Selection                                                           */
/* ------------------------------------------------------------------ */

/**
 * Deterministic 32-bit string hash.
 *
 * Selection is seeded rather than random so a sitting is reproducible: the
 * same learner resuming the same checkpoint gets the same items, and tests can
 * assert on selection without stubbing `Math.random`.
 */
function hash(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export interface SelectionOptions {
  /** Stable seed, e.g. `${learnerId}:${assessmentId}:${attemptNumber}`. */
  seed: string;
  /**
   * Activity ids the learner has just completed. Items derived from these are
   * deprioritised so a checkpoint taken straight after a lesson still measures
   * transfer rather than short-term echo.
   */
  recentActivityIds?: readonly ContentId[];
  /** Concepts to weight toward, e.g. ones a diagnostic flagged as weak. */
  focusConceptIds?: readonly ContentId[];
}

/**
 * Chooses the items for one sitting.
 *
 * Selection is stratified by skill before it is ranked, so a checkpoint cannot
 * quietly become a listening test just because listening items are the easiest
 * to author.
 */
export function selectItems(
  assessment: Assessment,
  options: SelectionOptions
): AssessmentItem[] {
  const recent = new Set(options.recentActivityIds ?? []);
  const focus = new Set(options.focusConceptIds ?? []);

  const bySkill = new Map<LearningSkill, AssessmentItem[]>();
  for (const item of assessment.items) {
    const bucket = bySkill.get(item.skill);
    if (bucket) bucket.push(item);
    else bySkill.set(item.skill, [item]);
  }

  const rank = (item: AssessmentItem): number => {
    let score = hash(`${options.seed}:${item.id}`) / 0xffffffff;
    if (recent.has(item.derivedFromActivityId ?? "")) score -= 1;
    if (focus.has(item.conceptId)) score += 0.5;
    return score;
  };

  for (const bucket of bySkill.values()) {
    bucket.sort((a, b) => rank(b) - rank(a));
  }

  // Round-robin across skills until the sitting is full, so a shortfall in one
  // skill's item bank costs that skill coverage rather than the whole sitting.
  const skills = [...bySkill.keys()].sort();
  const selected: AssessmentItem[] = [];
  for (let round = 0; selected.length < assessment.itemsPerSitting; round += 1) {
    let progressed = false;
    for (const skill of skills) {
      if (selected.length >= assessment.itemsPerSitting) break;
      const item = bySkill.get(skill)?.[round];
      if (!item) continue;
      selected.push(item);
      progressed = true;
    }
    if (!progressed) break;
  }

  return selected;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

/** Score for a single response, 0..1. */
export function scoreResponse(item: AssessmentItem, response: AssessmentResponse): number {
  if (item.responseMode === "speak") {
    return clamp01(response.spokenScore ?? 0);
  }
  if (item.correctChoiceIndex === undefined || response.choiceIndex === undefined) return 0;
  return response.choiceIndex === item.correctChoiceIndex ? 1 : 0;
}

export interface ScoreOptions {
  completedAt: string;
  /** Supply for PLACEMENT sittings to get a `recommendedLevel` back. */
  levelOrder?: readonly LingozaLevel[];
}

/**
 * Scores a completed sitting, per skill.
 *
 * A single overall percentage would hide the thing that actually matters --
 * that a learner is strong on listening and stalled on production -- so
 * `passed` requires every skill with a declared threshold to clear it, not the
 * mean to clear an average.
 */
export function scoreAssessment(
  assessment: Assessment,
  servedItems: readonly AssessmentItem[],
  responses: readonly AssessmentResponse[],
  options: ScoreOptions
): AssessmentResult {
  const byId = new Map(servedItems.map((item) => [item.id, item]));
  const perSkill = new Map<LearningSkill, { weighted: number; weight: number; count: number }>();
  const perConcept = new Map<ContentId, { total: number; count: number }>();

  for (const response of responses) {
    const item = byId.get(response.itemId);
    if (!item) continue;

    const score = scoreResponse(item, response);
    const weight = item.weight ?? 1;

    const skillBucket = perSkill.get(item.skill) ?? { weighted: 0, weight: 0, count: 0 };
    skillBucket.weighted += score * weight;
    skillBucket.weight += weight;
    skillBucket.count += 1;
    perSkill.set(item.skill, skillBucket);

    const conceptBucket = perConcept.get(item.conceptId) ?? { total: 0, count: 0 };
    conceptBucket.total += score;
    conceptBucket.count += 1;
    perConcept.set(item.conceptId, conceptBucket);
  }

  const skillResults: AssessmentSkillResult[] = [...perSkill.entries()].map(
    ([skill, bucket]) => {
      const score = bucket.weight === 0 ? 0 : bucket.weighted / bucket.weight;
      const threshold = assessment.passThresholds[skill];
      return {
        skill,
        score,
        itemCount: bucket.count,
        passed: threshold === undefined ? true : score >= threshold
      };
    }
  );

  const overallScore =
    skillResults.length === 0
      ? 0
      : skillResults.reduce((sum, result) => sum + result.score, 0) / skillResults.length;

  const weakConceptIds = [...perConcept.entries()]
    .map(([conceptId, bucket]) => ({ conceptId, score: bucket.total / bucket.count }))
    .filter((entry) => entry.score < 0.7)
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.conceptId);

  const passed = skillResults.length > 0 && skillResults.every((result) => result.passed);

  const result: AssessmentResult = {
    assessmentId: assessment.id,
    completedAt: options.completedAt,
    overallScore,
    passed,
    skillResults,
    weakConceptIds
  };

  if (assessment.kind === "PLACEMENT") {
    result.recommendedLevel = recommendLevel(overallScore, options.levelOrder ?? LINGOZA_LEVELS);
  }

  return result;
}

/**
 * Maps a placement score onto a starting level, biased downward.
 *
 * Starting a learner too low costs them a little boredom; starting them too
 * high costs them the course. The floor of the scaled index is deliberate.
 */
export function recommendLevel(
  overallScore: number,
  levelOrder: readonly LingozaLevel[]
): LingozaLevel {
  if (levelOrder.length === 0) return "A0";
  const index = Math.min(
    levelOrder.length - 1,
    Math.floor(clamp01(overallScore) * levelOrder.length)
  );
  return levelOrder[index];
}

/**
 * True when an item merely replays the activity it came from.
 *
 * Used by the content validator; exposed here because "what counts as reuse"
 * is an assessment-design decision, not a validation detail.
 */
export function isVerbatimReuse(
  item: AssessmentItem,
  activityPromptSentenceIds: ReadonlyMap<ContentId, ContentId>
): boolean {
  if (!item.derivedFromActivityId) return false;
  const drilled = activityPromptSentenceIds.get(item.derivedFromActivityId);
  return drilled !== undefined && drilled === item.promptSentenceId;
}
