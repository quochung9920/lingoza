import type { ContentId, LingozaLevel, UiLocale } from "../../content-schema/src/index.js";
import type { MasteryState } from "../../mastery-engine/src/index.js";
import type { ReviewSchedule } from "../../srs-engine/src/index.js";

/**
 * `@lingoza/persistence` -- repository interfaces and prototype adapters.
 *
 * The app talks to `LearnerRepository`, never storage directly. Today the web
 * client uses a namespaced browser-storage adapter; a server-backed repository
 * can replace it later without changing screens or learning engines.
 */

export type LearningGoal = "conversation" | "travel" | "work" | "study" | "hsk";

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

/** Microphone and recording consent. */
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
  /** New learners see onboarding until this is true. */
  onboardingCompleted: boolean;
  /** Used to prioritise topic paths without changing the core curriculum. */
  learningGoal: LearningGoal;
}

/** Everything the app persists about one learner. */
export interface LearnerSnapshot {
  profile: LearnerProfile;
  mastery: MasteryState;
  reviews: ReviewSchedule;
  /** Bumped when the stored shape changes, so adapters can migrate. */
  schemaVersion: number;
}

export const LEARNER_SCHEMA_VERSION = 2;

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
      },
      onboardingCompleted: false,
      learningGoal: "conversation"
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

interface LegacyLearnerProfileV1 {
  learnerRef: string;
  activeLanguage: string;
  currentLevel: LingozaLevel;
  completedLessonIds: ContentId[];
  streak: StreakState;
  preferences: LearnerPreferences;
  privacy: PrivacySettings;
}

interface LegacyLearnerSnapshotV1 {
  schemaVersion: 1;
  profile: LegacyLearnerProfileV1;
  mastery: MasteryState;
  reviews: ReviewSchedule;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Migrates the only previously shipped browser snapshot shape.
 *
 * Existing prototype users should not be forced through onboarding again or
 * lose mastery just because profile metadata grew. New installs still start
 * with onboarding incomplete via `createDefaultSnapshot`.
 */
export function migrateLearnerSnapshot(value: unknown): LearnerSnapshot | null {
  if (!isRecord(value) || typeof value.schemaVersion !== "number" || !isRecord(value.profile)) {
    return null;
  }

  if (value.schemaVersion === LEARNER_SCHEMA_VERSION) {
    return value as unknown as LearnerSnapshot;
  }

  if (value.schemaVersion !== 1) return null;

  const legacy = value as unknown as LegacyLearnerSnapshotV1;
  const defaults = createDefaultSnapshot(
    legacy.profile.learnerRef || "local",
    legacy.profile.activeLanguage || "zh-CN",
    legacy.profile.preferences?.locale ?? "vi-VN"
  );

  return {
    schemaVersion: LEARNER_SCHEMA_VERSION,
    profile: {
      ...defaults.profile,
      ...legacy.profile,
      preferences: { ...defaults.profile.preferences, ...legacy.profile.preferences },
      privacy: { ...defaults.profile.privacy, ...legacy.profile.privacy },
      // An existing learner already experienced the old app; do not interrupt
      // them with first-run setup after upgrading storage.
      onboardingCompleted: true,
      learningGoal: "conversation"
    },
    mastery: legacy.mastery ?? {},
    reviews: legacy.reviews ?? {}
  };
}

/** Defensive browser-storage adapter with schema migration. */
export function createWebStorageRepository(
  store: KeyValueStore,
  key = "lingoza.learner.v1"
): LearnerRepository {
  return {
    async load() {
      const raw = store.getItem(key);
      if (!raw) return null;
      try {
        return migrateLearnerSnapshot(JSON.parse(raw) as unknown);
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

/** ISO date (YYYY-MM-DD) in UTC. */
export function isoDate(at: string): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** Advances the practice streak for activity on `at`. */
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
