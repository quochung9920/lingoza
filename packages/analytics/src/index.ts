import type { ActivityKind, ContentId, LearningSkill } from "../../content-schema/src/index.js";

/**
 * `@lingoza/analytics` -- the event contract, and nothing else.
 *
 * No provider is wired up and none is implied. Defining the events now means
 * that when one is added later it is a matter of writing a `AnalyticsSink`,
 * not of retrofitting instrumentation across every screen.
 *
 * Privacy is a design constraint here, not a policy note: no event carries
 * audio, transcripts, or free text. Scores are already normalized numbers and
 * ids are content ids, so nothing in this file can leak what a learner said.
 */

interface BaseEvent {
  /** Client-generated, so events can be de-duplicated after offline replay. */
  eventId: string;
  at: string;
  /** Opaque pseudonymous id. Never a Zalo user id or phone number. */
  learnerRef: string;
  language: string;
}

export interface LessonStartedEvent extends BaseEvent {
  type: "lesson_started";
  lessonId: ContentId;
  unitId: ContentId;
}

export interface LessonCompletedEvent extends BaseEvent {
  type: "lesson_completed";
  lessonId: ContentId;
  durationMs: number;
  activityCount: number;
}

export interface AudioPlayedEvent extends BaseEvent {
  type: "audio_played";
  ownerId: ContentId;
  speed: "normal" | "slow";
  /** True when the learner asked for it again -- a signal the item is hard. */
  isReplay: boolean;
}

export interface SpeakingStartedEvent extends BaseEvent {
  type: "speaking_started";
  activityId: ContentId;
  kind: ActivityKind;
}

export interface SpeakingCompletedEvent extends BaseEvent {
  type: "speaking_completed";
  activityId: ContentId;
  kind: ActivityKind;
  /** Prosody metrics only. There is no transcript to report. */
  metrics: Array<{ id: string; value: number }>;
  attemptNumber: number;
}

export interface ReviewCompletedEvent extends BaseEvent {
  type: "review_completed";
  slotCount: number;
  durationMs: number;
}

export interface ConceptMasteredEvent extends BaseEvent {
  type: "concept_mastered";
  conceptId: ContentId;
  skill: LearningSkill;
}

export interface ConceptFailedEvent extends BaseEvent {
  type: "concept_failed";
  conceptId: ContentId;
  skill: LearningSkill;
  score: number;
}

export interface UnitCompletedEvent extends BaseEvent {
  type: "unit_completed";
  unitId: ContentId;
}

export interface AssessmentCompletedEvent extends BaseEvent {
  type: "assessment_completed";
  assessmentId: ContentId;
  passed: boolean;
  overallScore: number;
}

export type AnalyticsEvent =
  | LessonStartedEvent
  | LessonCompletedEvent
  | AudioPlayedEvent
  | SpeakingStartedEvent
  | SpeakingCompletedEvent
  | ReviewCompletedEvent
  | ConceptMasteredEvent
  | ConceptFailedEvent
  | UnitCompletedEvent
  | AssessmentCompletedEvent;

export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
  flush?(): Promise<void>;
}

/** Default sink: drops everything. Shipping without a provider is the default. */
export const noopAnalyticsSink: AnalyticsSink = {
  track() {
    /* intentionally empty */
  }
};

/**
 * Buffers events in memory. Useful in development and as the basis of an
 * offline queue; it is not persistence and makes no network calls.
 */
export function createBufferingSink(limit = 200): AnalyticsSink & {
  readonly events: readonly AnalyticsEvent[];
} {
  const events: AnalyticsEvent[] = [];
  return {
    get events() {
      return events;
    },
    track(event) {
      events.push(event);
      if (events.length > limit) events.shift();
    }
  };
}
