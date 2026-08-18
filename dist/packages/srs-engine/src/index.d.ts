import type { ActivityKind, ContentId, LearningSkill } from "../../content-schema/src/index.js";
import type { AtRiskConcept } from "../../mastery-engine/src/index.js";
/**
 * `@lingoza/srs-engine` -- spaced repetition, extended from flashcard
 * scheduling to multi-skill session assembly.
 *
 * The scheduler below is the original SM-2-flavoured interval function, kept
 * because it is well understood and its behaviour is pinned by tests. What is
 * new is that a review item is now a (concept, skill) pair rather than a card:
 * "咖啡" can be due for *speaking* while its listening recognition is fine.
 */
export type ReviewRating = "again" | "hard" | "good" | "easy";
export interface ReviewState {
    intervalDays: number;
    ease: number;
    repetitions: number;
}
/**
 * Next interval for one review item.
 *
 * `again` resets the interval to a single day and drops ease, on the principle
 * that a lapse means the item was not actually consolidated and should be
 * re-earned rather than merely delayed.
 */
export declare function scheduleReview(state: ReviewState, rating: ReviewRating): ReviewState;
/** Maps a normalized activity score onto a rating, so the learner never grades themselves. */
export declare function ratingFromScore(score: number): ReviewRating;
export interface ReviewItemKey {
    conceptId: ContentId;
    skill: LearningSkill;
}
/** Scheduling state for one (concept, skill) pair. */
export interface ReviewItemState extends ReviewItemKey, ReviewState {
    dueAt: string;
}
export type ReviewSchedule = Record<string, ReviewItemState>;
export declare function reviewKey(key: ReviewItemKey): string;
export declare function initialReviewState(key: ReviewItemKey, now: string): ReviewItemState;
/** Records an attempt and re-schedules the item. Pure; returns a new schedule. */
export declare function recordReview(schedule: ReviewSchedule, key: ReviewItemKey, score: number, now: string): ReviewSchedule;
export declare function dueItems(schedule: ReviewSchedule, now: string): ReviewItemState[];
/**
 * One slot in an assembled session. The engine picks the concept, the skill
 * and therefore the *kind* of practice; the learner never manages a deck.
 */
export interface ReviewSlot {
    conceptId: ContentId;
    skill: LearningSkill;
    /** Activity kind that exercises this skill. */
    kind: ActivityKind;
    /** Why this slot was chosen. Surfaced in the progress screen, not mid-drill. */
    reason: "due" | "at-risk" | "weak";
    /** Higher runs first. */
    priority: number;
    estimatedSeconds: number;
}
export interface SessionPlan {
    slots: ReviewSlot[];
    estimatedSeconds: number;
}
/**
 * Activity used to rehearse each skill.
 *
 * Every entry is a listening or speaking task -- there is no reading-only or
 * writing rehearsal anywhere in the review path, which is what keeps daily
 * practice aligned with the audio-first promise.
 */
export declare const SKILL_REVIEW_ACTIVITY: Readonly<Record<LearningSkill, ActivityKind>>;
/** Rough per-slot cost, used to fit a session into the learner's time budget. */
export declare const SKILL_SLOT_SECONDS: Readonly<Record<LearningSkill, number>>;
export interface AssembleOptions {
    /** Time budget in seconds. Slots are added until it is exhausted. */
    budgetSeconds: number;
    /** Hard cap on slots, so a short budget cannot produce a flood of micro-drills. */
    maxSlots?: number;
    /** Max slots per concept, to keep one weak word from monopolising a session. */
    maxPerConcept?: number;
}
export interface WeakSignal {
    conceptId: ContentId;
    skill: LearningSkill;
    score: number;
}
/**
 * Builds a session from three signals, in descending priority: items whose SRS
 * interval has elapsed, skills the mastery engine projects will fall below the
 * at-risk line shortly, and skills already sitting below threshold.
 *
 * Interleaving matters as much as selection, so the result is round-robined
 * across concepts: practising a concept's four skills back to back inflates
 * scores through short-term recall rather than building durable retrieval.
 */
export declare function assembleSession(due: readonly ReviewItemState[], atRisk: readonly AtRiskConcept[], weak: readonly WeakSignal[], options: AssembleOptions): SessionPlan;
