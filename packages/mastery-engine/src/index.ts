import type {
  ActivityKind,
  Concept,
  ContentId,
  KnowledgeDepth,
  LearningSkill
} from "../../content-schema/src/index.js";
import { ACTIVITY_SKILL_MAP, clamp01 } from "../../content-schema/src/index.js";

/**
 * `@lingoza/mastery-engine` -- per-skill, decaying mastery.
 *
 * Two ideas drive the whole module:
 *
 * 1. **Mastery is a vector, not a flag.** A learner can recognise 咖啡 by ear
 *    long before they can order one out loud, so every concept carries a score
 *    per `LearningSkill` and nothing collapses them into `learned: true`.
 * 2. **Mastery decays.** A score recorded three weeks ago is not evidence of
 *    present knowledge. Reads apply forgetting based on elapsed time, which is
 *    what lets the review queue find things *before* they are lost.
 */

/** One skill's state on one concept. */
export interface SkillMastery {
  /** Score at `lastPracticedAt`, before decay. 0..1. */
  score: number;
  /** ISO timestamp of the most recent evidence. */
  lastPracticedAt: string;
  /** Number of scored attempts. Drives learning-rate damping. */
  attempts: number;
  /**
   * Consecutive successful attempts. Reset on failure; used as the stability
   * signal so a long correct streak decays more slowly.
   */
  streak: number;
}

/** Full mastery state for one concept. */
export interface ConceptMastery {
  conceptId: ContentId;
  skills: Partial<Record<LearningSkill, SkillMastery>>;
  /** Highest depth reached. Monotonic: knowledge is not un-learned, only faded. */
  depth: KnowledgeDepth;
  firstSeenAt: string;
}

export type MasteryState = Record<ContentId, ConceptMastery>;

/** Evidence produced by one completed activity attempt. */
export interface ActivityOutcome {
  conceptIds: ContentId[];
  kind: ActivityKind;
  /** Normalized 0..1 result from the relevant evaluator. */
  score: number;
  /** Overrides `ACTIVITY_SKILL_MAP[kind]` when the activity declares skills. */
  skills?: readonly LearningSkill[];
  at: string;
}

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

export interface MasteryConfig {
  /** Weight of new evidence when a skill is brand new. */
  baseLearningRate: number;
  /** Floor the learning rate decays toward as attempts accumulate. */
  minLearningRate: number;
  /** Half-life in days of an unpractised skill at streak 0. */
  baseHalfLifeDays: number;
  /** Days added to the half-life per consecutive success. */
  halfLifeStreakBonusDays: number;
  /** Decayed score at or above which a concept counts as passively known. */
  passiveDepthThreshold: number;
  /** Decayed production score at or above which it counts as actively known. */
  activeDepthThreshold: number;
  /** Score below which a concept is surfaced as "at risk of being forgotten". */
  atRiskThreshold: number;
}

export const DEFAULT_MASTERY_CONFIG: MasteryConfig = {
  baseLearningRate: 0.5,
  minLearningRate: 0.15,
  baseHalfLifeDays: 6,
  halfLifeStreakBonusDays: 4,
  passiveDepthThreshold: 0.6,
  activeDepthThreshold: 0.7,
  atRiskThreshold: 0.55
};

/** Skills that constitute *producing* the language rather than understanding it. */
const ACTIVE_SKILLS: readonly LearningSkill[] = ["activeRecall", "speaking", "conversation"];

const MS_PER_DAY = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  const elapsed = Date.parse(toIso) - Date.parse(fromIso);
  if (!Number.isFinite(elapsed)) return 0;
  return Math.max(0, elapsed / MS_PER_DAY);
}

/* ------------------------------------------------------------------ */
/* Decay                                                               */
/* ------------------------------------------------------------------ */

/**
 * Exponential forgetting with a streak-extended half-life.
 *
 * The streak bonus is what separates "answered right once" from "answered
 * right five sessions running": both may sit at 0.9 today, but only the second
 * should still be near 0.9 a fortnight from now.
 */
export function decayedScore(
  skill: SkillMastery,
  now: string,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): number {
  const elapsedDays = daysBetween(skill.lastPracticedAt, now);
  if (elapsedDays <= 0) return clamp01(skill.score);
  const halfLife = config.baseHalfLifeDays + skill.streak * config.halfLifeStreakBonusDays;
  return clamp01(skill.score * Math.pow(0.5, elapsedDays / halfLife));
}

/** Every skill of a concept, decayed to `now`. */
export function decayedSkills(
  mastery: ConceptMastery,
  now: string,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): Partial<Record<LearningSkill, number>> {
  const result: Partial<Record<LearningSkill, number>> = {};
  for (const [skill, state] of Object.entries(mastery.skills) as Array<
    [LearningSkill, SkillMastery]
  >) {
    result[skill] = decayedScore(state, now, config);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Updates                                                             */
/* ------------------------------------------------------------------ */

function updateSkill(
  previous: SkillMastery | undefined,
  score: number,
  at: string,
  config: MasteryConfig
): SkillMastery {
  const observed = clamp01(score);
  if (!previous) {
    return { score: observed, lastPracticedAt: at, attempts: 1, streak: observed >= 0.7 ? 1 : 0 };
  }

  // Blend against the *decayed* prior, not the stored one: crediting a learner
  // for a score they earned a month ago would make mastery ratchet upward and
  // never reflect forgetting.
  const prior = decayedScore(previous, at, config);
  const rate = Math.max(
    config.minLearningRate,
    config.baseLearningRate / (1 + previous.attempts * 0.35)
  );
  const blended = prior + (observed - prior) * rate;

  return {
    score: clamp01(blended),
    lastPracticedAt: at,
    attempts: previous.attempts + 1,
    streak: observed >= 0.7 ? previous.streak + 1 : 0
  };
}

function resolveDepth(
  current: KnowledgeDepth,
  skills: Partial<Record<LearningSkill, SkillMastery>>,
  at: string,
  config: MasteryConfig
): KnowledgeDepth {
  const scoreOf = (skill: LearningSkill) => {
    const state = skills[skill];
    return state ? decayedScore(state, at, config) : 0;
  };

  const activeReached = ACTIVE_SKILLS.some((skill) => scoreOf(skill) >= config.activeDepthThreshold);
  if (activeReached || current === "active") return "active";

  const passiveReached =
    scoreOf("listeningRecognition") >= config.passiveDepthThreshold ||
    scoreOf("meaningRecognition") >= config.passiveDepthThreshold;
  if (passiveReached || current === "passive") return "passive";

  return "unseen";
}

/**
 * Folds one activity outcome into the mastery state.
 *
 * Returns a new state object; the caller owns persistence. Splitting evidence
 * across a concept's skills is driven by `ACTIVITY_SKILL_MAP`, so adding an
 * activity kind means declaring what it proves rather than editing this
 * function.
 */
export function applyOutcome(
  state: MasteryState,
  outcome: ActivityOutcome,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): MasteryState {
  const skills = outcome.skills ?? ACTIVITY_SKILL_MAP[outcome.kind];
  if (skills.length === 0 || outcome.conceptIds.length === 0) return state;

  const next: MasteryState = { ...state };

  for (const conceptId of outcome.conceptIds) {
    const previous: ConceptMastery = next[conceptId] ?? {
      conceptId,
      skills: {},
      depth: "unseen",
      firstSeenAt: outcome.at
    };

    const updatedSkills = { ...previous.skills };
    for (const skill of skills) {
      updatedSkills[skill] = updateSkill(previous.skills[skill], outcome.score, outcome.at, config);
    }

    next[conceptId] = {
      ...previous,
      skills: updatedSkills,
      depth: resolveDepth(previous.depth, updatedSkills, outcome.at, config)
    };
  }

  return next;
}

/** Convenience for replaying a session's outcomes in order. */
export function applyOutcomes(
  state: MasteryState,
  outcomes: readonly ActivityOutcome[],
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): MasteryState {
  return outcomes.reduce((acc, outcome) => applyOutcome(acc, outcome, config), state);
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Projection consumed by `curriculum-engine`, with decay already applied. */
export interface MasteryRecordView {
  conceptId: ContentId;
  skills: Partial<Record<LearningSkill, number>>;
}

export function projectMastery(
  state: MasteryState,
  now: string,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): MasteryRecordView[] {
  return Object.values(state).map((mastery) => ({
    conceptId: mastery.conceptId,
    skills: decayedSkills(mastery, now, config)
  }));
}

export interface AtRiskConcept {
  conceptId: ContentId;
  skill: LearningSkill;
  /** Current decayed score. */
  score: number;
  /** Days until this skill crosses `atRiskThreshold`. Negative if already past. */
  daysUntilAtRisk: number;
}

/**
 * Skills about to fall below the at-risk line, soonest first.
 *
 * This is the signal the review queue is built from: reviewing something the
 * day before it would have been forgotten is far cheaper than relearning it,
 * so the queue is ordered by urgency rather than by age.
 */
export function atRiskSkills(
  state: MasteryState,
  now: string,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
  horizonDays = 3
): AtRiskConcept[] {
  const results: AtRiskConcept[] = [];

  for (const mastery of Object.values(state)) {
    for (const [skill, skillState] of Object.entries(mastery.skills) as Array<
      [LearningSkill, SkillMastery]
    >) {
      const score = decayedScore(skillState, now, config);
      const halfLife = config.baseHalfLifeDays + skillState.streak * config.halfLifeStreakBonusDays;

      let daysUntilAtRisk: number;
      if (score <= config.atRiskThreshold) {
        daysUntilAtRisk = 0;
      } else if (skillState.score <= 0) {
        daysUntilAtRisk = 0;
      } else {
        // Solve score * 0.5^(d / halfLife) = threshold for d.
        daysUntilAtRisk = (Math.log(config.atRiskThreshold / score) / Math.log(0.5)) * halfLife;
      }

      if (daysUntilAtRisk <= horizonDays) {
        results.push({ conceptId: mastery.conceptId, skill, score, daysUntilAtRisk });
      }
    }
  }

  return results.sort((a, b) => a.daysUntilAtRisk - b.daysUntilAtRisk || a.score - b.score);
}

/**
 * Which skill of `concept` most needs work right now, or null when the concept
 * already clears every threshold it declares.
 */
export function nextSkillToPractice(
  concept: Concept,
  state: MasteryState,
  now: string,
  fallbackThreshold = 0.7,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): LearningSkill | null {
  const mastery = state[concept.id];
  let worst: { skill: LearningSkill; gap: number } | null = null;

  for (const skill of concept.skills) {
    const skillState = mastery?.skills[skill];
    const score = skillState ? decayedScore(skillState, now, config) : 0;
    const threshold = concept.masteryThresholds[skill] ?? fallbackThreshold;
    const gap = threshold - score;
    if (gap > 0 && (!worst || gap > worst.gap)) worst = { skill, gap };
  }

  return worst?.skill ?? null;
}

/** Whether the learner can *use* this concept, not merely recognise it. */
export function knowledgeDepth(state: MasteryState, conceptId: ContentId): KnowledgeDepth {
  return state[conceptId]?.depth ?? "unseen";
}
