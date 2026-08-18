import { describe, expect, it } from "vitest";

import {
  LEARNER_SCHEMA_VERSION,
  createDefaultSnapshot,
  migrateLearnerSnapshot
} from "../packages/persistence/src/index.js";

describe("learner persistence", () => {
  it("creates a new learner that must complete onboarding", () => {
    const snapshot = createDefaultSnapshot("local", "zh-CN", "vi-VN");

    expect(snapshot.schemaVersion).toBe(LEARNER_SCHEMA_VERSION);
    expect(snapshot.profile.onboardingCompleted).toBe(false);
    expect(snapshot.profile.learningGoal).toBe("conversation");
    expect(snapshot.profile.preferences.dailyGoalMinutes).toBe(10);
    expect(snapshot.profile.privacy.speechRecognitionOptIn).toBe(false);
    expect(snapshot.profile.privacy.advancedPronunciationOptIn).toBe(false);
  });

  it("migrates v1 progress without replaying onboarding or losing mastery", () => {
    const previous = {
      schemaVersion: 1,
      profile: {
        learnerRef: "legacy",
        activeLanguage: "zh-CN",
        currentLevel: "A1",
        completedLessonIds: ["zh.lesson.greeting"],
        streak: { current: 4, longest: 9, lastActiveDate: "2026-08-18" },
        preferences: {
          locale: "vi-VN",
          visibleSupportLayers: ["pinyin"],
          showTranslation: false,
          autoplayAudio: true,
          preferSlowAudio: true,
          reducedMotion: false,
          dailyGoalMinutes: 15
        },
        privacy: {
          microphoneConsentGrantedAt: null,
          keepRecordingsLocally: false,
          recordingRetentionDays: 0,
          analyticsOptIn: false
        }
      },
      mastery: {
        "greeting.basic": {
          conceptId: "greeting.basic",
          skills: {
            speaking: {
              score: 0.8,
              lastPracticedAt: "2026-08-18T00:00:00.000Z",
              attempts: 3,
              streak: 2
            }
          },
          depth: "active",
          firstSeenAt: "2026-08-10T00:00:00.000Z"
        }
      },
      reviews: {}
    };

    const migrated = migrateLearnerSnapshot(previous);

    expect(migrated).not.toBeNull();
    expect(migrated?.schemaVersion).toBe(LEARNER_SCHEMA_VERSION);
    expect(migrated?.profile.onboardingCompleted).toBe(true);
    expect(migrated?.profile.learningGoal).toBe("conversation");
    expect(migrated?.profile.completedLessonIds).toEqual(["zh.lesson.greeting"]);
    expect(migrated?.profile.preferences.dailyGoalMinutes).toBe(15);
    expect(migrated?.profile.privacy.speechRecognitionOptIn).toBe(false);
    expect(migrated?.profile.privacy.advancedPronunciationOptIn).toBe(false);
    expect(migrated?.mastery["greeting.basic"]?.skills.speaking?.score).toBe(0.8);
  });

  it("migrates v2 learners without silently enabling speech services", () => {
    const current = createDefaultSnapshot("v2-user", "zh-CN", "vi-VN");
    const previous = {
      ...current,
      schemaVersion: 2,
      profile: {
        ...current.profile,
        onboardingCompleted: true,
        learningGoal: "hsk" as const,
        privacy: {
          microphoneConsentGrantedAt: "2026-08-18T00:00:00.000Z",
          keepRecordingsLocally: false,
          recordingRetentionDays: 0,
          analyticsOptIn: false
        }
      }
    };

    const migrated = migrateLearnerSnapshot(previous);

    expect(migrated?.schemaVersion).toBe(LEARNER_SCHEMA_VERSION);
    expect(migrated?.profile.onboardingCompleted).toBe(true);
    expect(migrated?.profile.learningGoal).toBe("hsk");
    expect(migrated?.profile.privacy.speechRecognitionOptIn).toBe(false);
    expect(migrated?.profile.privacy.advancedPronunciationOptIn).toBe(false);
  });

  it("preserves an explicit v3 browser-recognition choice but keeps advanced upload off", () => {
    const current = createDefaultSnapshot("v3-user", "zh-CN", "vi-VN");
    const previous = {
      ...current,
      schemaVersion: 3,
      profile: {
        ...current.profile,
        privacy: {
          microphoneConsentGrantedAt: "2026-08-18T00:00:00.000Z",
          keepRecordingsLocally: false,
          recordingRetentionDays: 0,
          analyticsOptIn: false,
          speechRecognitionOptIn: true
        }
      }
    };

    const migrated = migrateLearnerSnapshot(previous);

    expect(migrated?.schemaVersion).toBe(LEARNER_SCHEMA_VERSION);
    expect(migrated?.profile.privacy.speechRecognitionOptIn).toBe(true);
    expect(migrated?.profile.privacy.advancedPronunciationOptIn).toBe(false);
  });
});
