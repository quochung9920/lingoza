import type { ContentId, LingozaLevel, UiLocale } from "../../content-schema/src/index.js";
import type { MasteryState } from "../../mastery-engine/src/index.js";
import type { ReviewSchedule } from "../../srs-engine/src/index.js";

/**
 * `@lingoza/persistence` -- repository interfaces and two prototype adapters.
 *
 * The app talks to `LearnerRepository`, never to storage directly. That
 * indirection is the whole point: today the implementation is `localStorage`
 * behind a namespaced key, tomorrow it is an API client, and no screen or
 * engine changes. Treating `localStorage` as *the database* is what makes that
 * migration painful later, so it never gets to be one.
 */

/** Learner-controlled display and playback preferences. */
export interface LearnerPreferences {
  locale: UiLocale;
  /** Support layers (romanization, translation, ...) the learner wants shown. */
  visibleSupportLayers: string[];
  showTranslation: boolean;
  autoplayAudio: boolean;
  preferSlowAudio: boolean;
  reducedMotion: boolean;
  /** Daily practice budget in minutes; drives session assembly. */
  dailyGoalMinutes: number;
}

/**
 * Microphone and recording consent.
 *
 * Consent is requested at the moment the learner starts a speaking activity,
 * never at app launch, and `keepRecordingsLocally: false` means an attempt is
 * discarded as soon as its metrics are computed.
 */
export interface PrivacySettings {
  microphoneConsentGrantedAt: string | null;
  keepRecordingsLocally: boolean;
  /** Days a locally kept recording survives. 0 = discard after the attempt. */
  recordingRetentionDays: number;
  analyticsOptIn: boolean;
}

export interface StreakState {
  current: number;
  longest: number;
  /** ISO date (no time) of the last day with any completed activity. */
  lastActiveDate: string | null;
}

export interface LearnerProfile {
  learnerRef: string;
  activeLanguage: string;
  currentLevel: LingozaLevel;
  completedLessonIds: ContentId[];
  streak: StreakState;
  preferences: LearnerPreferences;
  privacy: PrivacySettings;
}

/** Everything the app persists about one learner. */
export interface LearnerSnapshot {
  profile: LearnerProfile;
  mastery: MasteryState;
  reviews: ReviewSchedule;
  /** Bumped when the stored shape changes, so adapters can migrate. */
  schemaVersion: number;
}

export const LEARNER_SCHEMA_VERSION = 1;

export interface LearnerRepository {
  load(): Promise<LearnerSnapshot | null>;
  save(snapshot: LearnerSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export function createDefaultSnapshot(
  learnerRef: string,
  language: string,
  locale: UiLocale
): LearnerSnapshot {
  return {
    schemaVersion: LEARNER_SCHEMA_VERSION,
    profile: {
      learnerRef,
      activeLanguage: language,
      currentLevel: "A0",
      completedLessonIds: [],
      streak: { current: 0, longest: 0, lastActiveDate: null },
      preferences: {
        locale,
        visibleSupportLayers: [],
        showTranslation: true,
        autoplayAudio: true,
        preferSlowAudio: false,
        reducedMotion: false,
        dailyGoalMinutes: 10
      },
      privacy: {
        microphoneConsentGrantedAt: null,
        keepRecordingsLocally: false,
        recordingRetentionDays: 0,
        analyticsOptIn: false
      }
    },
    mastery: {},
    reviews: {}
  };
}

/** In-memory adapter. The default in tests and in SSR-less first render. */
export function createMemoryRepository(initial?: LearnerSnapshot): LearnerRepository {
  let snapshot: LearnerSnapshot | null = initial ?? null;
  return {
    async load() {
      return snapshot;
    },
    async save(next) {
      snapshot = next;
    },
    async clear() {
      snapshot = null;
    }
  };
}

/** Minimal surface of `localStorage`, so the adapter is testable without a DOM. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Web-storage adapter for the prototype.
 *
 * Reads are defensive: corrupted JSON or a snapshot from a future schema
 * version resolves to `null` rather than throwing, so a bad write can never
 * lock a learner out of the app. A real migration path replaces the version
 * check when the shape next changes.
 */
export function createWebStorageRepository(
  store: KeyValueStore,
  key = "lingoza.learner.v1"
): LearnerRepository {
  return {
    async load() {
      const raw = store.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as LearnerSnapshot;
        if (parsed.schemaVersion !== LEARNER_SCHEMA_VERSION) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    async save(snapshot) {
      store.setItem(key, JSON.stringify(snapshot));
    },
    async clear() {
      store.removeItem(key);
    }
  };
}

/** ISO date (YYYY-MM-DD) in the runtime's local timezone. */
export function isoDate(at: string): string {
  return new Date(at).toISOString().slice(0, 10);
}

/**
 * Advances the streak for activity on `at`.
 *
 * Same-day activity is a no-op, consecutive days increment, and any longer gap
 * resets to 1 rather than 0 -- the learner did practise today, and showing them
 * a zero for it would be both wrong and discouraging.
 */
export function touchStreak(streak: StreakState, at: string): StreakState {
  const today = isoDate(at);
  if (streak.lastActiveDate === today) return streak;

  const yesterday = isoDate(new Date(Date.parse(at) - 86_400_000).toISOString());
  const current = streak.lastActiveDate === yesterday ? streak.current + 1 : 1;

  return {
    current,
    longest: Math.max(streak.longest, current),
    lastActiveDate: today
  };
}
