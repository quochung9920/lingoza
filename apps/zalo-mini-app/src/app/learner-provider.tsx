import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import type { ContentId, LearningSkill } from "../../../../packages/content-schema/src/index";
import {
  toMasteryLookup,
  type MasteryLookup,
  type MasteryRecord
} from "../../../../packages/curriculum-engine/src/index";
import {
  applyOutcome,
  atRiskSkills,
  decayedScore,
  projectMastery,
  type ActivityOutcome,
  type MasteryState
} from "../../../../packages/mastery-engine/src/index";
import {
  assembleSession,
  dueItems,
  recordReview,
  type ReviewSchedule,
  type SessionPlan,
  type WeakSignal
} from "../../../../packages/srs-engine/src/index";
import {
  createDefaultSnapshot,
  createMemoryRepository,
  createWebStorageRepository,
  touchStreak,
  type LearnerPreferences,
  type LearnerRepository,
  type LearnerSnapshot,
  type PrivacySettings
} from "../../../../packages/persistence/src/index";
import { DEFAULT_LOCALE } from "../lib/i18n";

/**
 * Learner state: mastery, review schedule, preferences, privacy, streak.
 *
 * All the reasoning lives in the engine packages. This provider does three
 * things and nothing else: hold the snapshot, hand outcomes to the engines,
 * and persist the result. That boundary is what keeps the learning model
 * testable without React and keeps components free of learning logic.
 */

export interface LearnerValue {
  snapshot: LearnerSnapshot;
  /** Decayed mastery as of `now`, ready for the curriculum engine. */
  masteryLookup: MasteryLookup;
  masteryRecords: MasteryRecord[];
  masteryState: MasteryState;
  /** Today's assembled review session. */
  reviewPlan: SessionPlan;
  /** Records one activity result: mastery, SRS and streak all move together. */
  recordOutcome(outcome: ActivityOutcome): void;
  markLessonComplete(lessonId: ContentId): void;
  updatePreferences(patch: Partial<LearnerPreferences>): void;
  updatePrivacy(patch: Partial<PrivacySettings>): void;
  grantMicrophoneConsent(): void;
  skillScore(conceptId: ContentId, skill: LearningSkill): number;
  resetProgress(): void;
}

const LearnerContext = createContext<LearnerValue | null>(null);

function createRepository(): LearnerRepository {
  // Private-mode webviews throw on `localStorage` access rather than returning
  // null, so probe before committing to it and fall back to memory.
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const probe = "__lingoza_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return createWebStorageRepository(window.localStorage);
    }
  } catch {
    /* fall through to memory */
  }
  return createMemoryRepository();
}

export function LearnerProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(createRepository, []);
  const [snapshot, setSnapshot] = useState<LearnerSnapshot>(() =>
    createDefaultSnapshot("local", "zh-CN", DEFAULT_LOCALE)
  );
  const [hydrated, setHydrated] = useState(false);

  // A single timestamp per render pass keeps decay calculations consistent
  // across every consumer within one frame.
  const nowRef = useRef(new Date().toISOString());
  nowRef.current = new Date().toISOString();

  useEffect(() => {
    let cancelled = false;
    void repository.load().then((stored) => {
      if (cancelled) return;
      if (stored) setSnapshot(stored);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    // Never write before the first read completes, or a fresh default snapshot
    // would overwrite real progress on a slow load.
    if (hydrated) void repository.save(snapshot);
  }, [hydrated, repository, snapshot]);

  const now = nowRef.current;

  const masteryRecords = useMemo(
    () => projectMastery(snapshot.mastery, now),
    [snapshot.mastery, now]
  );
  const masteryLookup = useMemo(() => toMasteryLookup(masteryRecords), [masteryRecords]);

  const reviewPlan = useMemo<SessionPlan>(() => {
    const due = dueItems(snapshot.reviews, now);
    const risk = atRiskSkills(snapshot.mastery, now);

    const weak: WeakSignal[] = [];
    for (const record of masteryRecords) {
      for (const [skill, score] of Object.entries(record.skills) as Array<[LearningSkill, number]>) {
        if (score < 0.6) weak.push({ conceptId: record.conceptId, skill, score });
      }
    }

    return assembleSession(due, risk, weak, {
      budgetSeconds: snapshot.profile.preferences.dailyGoalMinutes * 60 * 0.4,
      maxSlots: 12
    });
  }, [snapshot.reviews, snapshot.mastery, snapshot.profile.preferences.dailyGoalMinutes, masteryRecords, now]);

  const recordOutcome = useCallback((outcome: ActivityOutcome) => {
    setSnapshot((previous) => {
      const mastery = applyOutcome(previous.mastery, outcome);

      // Every scored attempt also reschedules the (concept, skill) pairs it
      // touched, so the review queue stays in step with mastery automatically.
      const skills = outcome.skills ?? [];
      let reviews: ReviewSchedule = previous.reviews;
      for (const conceptId of outcome.conceptIds) {
        for (const skill of skills.length > 0 ? skills : Object.keys(mastery[conceptId]?.skills ?? {})) {
          reviews = recordReview(
            reviews,
            { conceptId, skill: skill as LearningSkill },
            outcome.score,
            outcome.at
          );
        }
      }

      return {
        ...previous,
        mastery,
        reviews,
        profile: { ...previous.profile, streak: touchStreak(previous.profile.streak, outcome.at) }
      };
    });
  }, []);

  const markLessonComplete = useCallback((lessonId: ContentId) => {
    setSnapshot((previous) =>
      previous.profile.completedLessonIds.includes(lessonId)
        ? previous
        : {
            ...previous,
            profile: {
              ...previous.profile,
              completedLessonIds: [...previous.profile.completedLessonIds, lessonId]
            }
          }
    );
  }, []);

  const updatePreferences = useCallback((patch: Partial<LearnerPreferences>) => {
    setSnapshot((previous) => ({
      ...previous,
      profile: {
        ...previous.profile,
        preferences: { ...previous.profile.preferences, ...patch }
      }
    }));
  }, []);

  const updatePrivacy = useCallback((patch: Partial<PrivacySettings>) => {
    setSnapshot((previous) => ({
      ...previous,
      profile: { ...previous.profile, privacy: { ...previous.profile.privacy, ...patch } }
    }));
  }, []);

  const grantMicrophoneConsent = useCallback(() => {
    updatePrivacy({ microphoneConsentGrantedAt: new Date().toISOString() });
  }, [updatePrivacy]);

  const skillScore = useCallback(
    (conceptId: ContentId, skill: LearningSkill) => {
      const state = snapshot.mastery[conceptId]?.skills[skill];
      return state ? decayedScore(state, now) : 0;
    },
    [snapshot.mastery, now]
  );

  const resetProgress = useCallback(() => {
    setSnapshot(createDefaultSnapshot("local", "zh-CN", DEFAULT_LOCALE));
  }, []);

  const value = useMemo<LearnerValue>(
    () => ({
      snapshot,
      masteryLookup,
      masteryRecords,
      masteryState: snapshot.mastery,
      reviewPlan,
      recordOutcome,
      markLessonComplete,
      updatePreferences,
      updatePrivacy,
      grantMicrophoneConsent,
      skillScore,
      resetProgress
    }),
    [
      snapshot,
      masteryLookup,
      masteryRecords,
      reviewPlan,
      recordOutcome,
      markLessonComplete,
      updatePreferences,
      updatePrivacy,
      grantMicrophoneConsent,
      skillScore,
      resetProgress
    ]
  );

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearner(): LearnerValue {
  const value = useContext(LearnerContext);
  if (!value) throw new Error("useLearner must be used inside <LearnerProvider>");
  return value;
}
