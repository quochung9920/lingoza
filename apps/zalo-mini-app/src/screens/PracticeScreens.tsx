import { useCallback, useMemo, useState } from "react";

import type { Activity, ActivityKind, ContentId } from "../../../../packages/content-schema/src/index";
import { ACTIVITY_SKILL_MAP, LEARNING_SKILLS } from "../../../../packages/content-schema/src/index";
import {
  availableConcepts,
  levelSkillProfile,
  nextLesson,
  weakConcepts
} from "../../../../packages/curriculum-engine/src/index";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import { DialogueRunner } from "../components/dialogue-runner";
import {
  Card,
  EmptyState,
  InteractiveCard,
  LessonProgress,
  PrimaryButton,
  SecondaryButton,
  SectionHeading,
  SkillProgress
} from "../components/primitives";
import { ct, t } from "../lib/i18n";
import { ActivityView } from "./ActivityView";

/**
 * The three non-lesson tabs: adaptive practice, conversation, and progress.
 *
 * None of them introduce new learning logic. Practice replays real lesson
 * activities chosen by the SRS engine, conversation reuses the same
 * `DialogueRunner` the lesson player uses, and progress is a read-only view
 * over the mastery engine. Duplicating any of that here is exactly how a
 * codebase ends up with two subtly different definitions of "mastered".
 */

/* ------------------------------------------------------------------ */
/* Practice                                                            */
/* ------------------------------------------------------------------ */

/**
 * Finds a real activity that exercises `conceptId` through `kind`.
 *
 * Practice deliberately reuses authored activities rather than generating
 * synthetic drills: an authored activity has audio, hints and a can-do link,
 * and a generated one would have none of those.
 */
function findActivity(
  activities: readonly Activity[],
  conceptId: ContentId,
  kind: ActivityKind
): Activity | undefined {
  const forConcept = activities.filter((activity) => activity.conceptIds.includes(conceptId));
  return (
    forConcept.find((activity) => activity.kind === kind) ??
    // Fall back to any speaking/listening activity for the concept rather than
    // dropping the slot: practising the right concept the wrong way beats not
    // practising it at all.
    forConcept.find((activity) => activity.kind !== "UNIT_CHECKPOINT" && activity.kind !== "LEVEL_ASSESSMENT")
  );
}

export function PracticeScreen({ onGoLearn }: { onGoLearn: () => void }) {
  const content = useContent();
  const { reviewPlan, recordOutcome } = useLearner();

  const allActivities = useMemo(
    () => content.bundle.lessons.flatMap((lesson) => lesson.activities),
    [content.bundle.lessons]
  );

  const queue = useMemo(
    () =>
      reviewPlan.slots
        .map((slot) => ({ slot, activity: findActivity(allActivities, slot.conceptId, slot.kind) }))
        .filter(
          (entry): entry is { slot: (typeof reviewPlan.slots)[number]; activity: Activity } =>
            Boolean(entry.activity)
        ),
    [reviewPlan.slots, allActivities]
  );

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const handleComplete = useCallback(
    (score: number) => {
      const entry = queue[index];
      if (entry) {
        recordOutcome({
          conceptIds: [entry.slot.conceptId],
          kind: entry.activity.kind,
          score,
          // Score only the skill the SRS engine actually scheduled, so a
          // review of "speaking 咖啡" does not quietly credit listening too.
          skills: [entry.slot.skill],
          at: new Date().toISOString()
        });
      }
      if (index + 1 >= queue.length) setDone(true);
      else setIndex(index + 1);
    },
    [queue, index, recordOutcome]
  );

  if (queue.length === 0) {
    return (
      <div className="lz-stack">
        <EmptyState glyph="🎤" title={ct("empty.speaking")} />
        <PrimaryButton onClick={onGoLearn}>{ct("home.continue")}</PrimaryButton>
      </div>
    );
  }

  if (done) {
    return (
      <div className="lz-stack">
        <EmptyState glyph="✅" title={ct("common.done")} body={ct("lesson.completeBody")} />
        <PrimaryButton onClick={onGoLearn}>{ct("home.continue")}</PrimaryButton>
      </div>
    );
  }

  const entry = queue[index];

  return (
    <div className="lz-stack">
      <LessonProgress total={queue.length} current={index} />
      <p className="lz-muted" style={{ textAlign: "center" }}>
        {t(entry.activity.instruction)}
      </p>
      <ActivityView
        key={`${entry.slot.conceptId}:${entry.slot.skill}:${index}`}
        activity={entry.activity}
        onComplete={handleComplete}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Conversation                                                        */
/* ------------------------------------------------------------------ */

export function ConversationScreen() {
  const content = useContent();
  const { masteryLookup, recordOutcome } = useLearner();
  const [activeId, setActiveId] = useState<ContentId | null>(null);

  const unlockedConceptIds = useMemo(
    () => new Set(availableConcepts(content.bundle.concepts, masteryLookup).map((c) => c.id)),
    [content.bundle.concepts, masteryLookup]
  );

  const active = activeId ? content.scenario(activeId) : null;

  if (active) {
    return (
      <div className="lz-stack">
        <SecondaryButton onClick={() => setActiveId(null)}>‹ {ct("common.back")}</SecondaryButton>
        <DialogueRunner
          key={active.id}
          scenario={active}
          mode="role-play"
          onFinished={(score) => {
            recordOutcome({
              conceptIds: active.conceptIds,
              kind: "ROLE_PLAY",
              score,
              skills: ACTIVITY_SKILL_MAP.ROLE_PLAY,
              at: new Date().toISOString()
            });
            setActiveId(null);
          }}
        />
      </div>
    );
  }

  if (content.bundle.scenarios.length === 0) {
    return <EmptyState glyph="💬" title={ct("empty.conversation")} />;
  }

  return (
    <div className="lz-stack">
      <SectionHeading title={ct("nav.talk")} />
      {content.bundle.scenarios.map((scenario) => {
        const locked = !scenario.conceptIds.some((id) => unlockedConceptIds.has(id));
        return (
          <InteractiveCard
            key={scenario.id}
            onClick={() => setActiveId(scenario.id)}
            disabled={locked}
            ariaLabel={t(scenario.title)}
          >
            <div className="lz-row lz-row--between">
              <div>
                <strong>{t(scenario.title)}</strong>
                <p className="lz-muted">{t(scenario.setting)}</p>
              </div>
              <span className={locked ? "lz-pill lz-pill--locked" : "lz-pill"}>
                {locked ? ct("common.locked") : scenario.level}
              </span>
            </div>
          </InteractiveCard>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function ProgressScreen({ onPractice }: { onPractice: () => void }) {
  const content = useContent();
  const { masteryLookup, snapshot } = useLearner();

  const suggestion = useMemo(
    () => nextLesson(content.graph, masteryLookup),
    [content.graph, masteryLookup]
  );
  const currentLevel = suggestion?.course.level ?? snapshot.profile.currentLevel;
  const level = content.graph.level(currentLevel);

  const profile = useMemo(
    () => levelSkillProfile(content.graph, currentLevel, masteryLookup),
    [content.graph, currentLevel, masteryLookup]
  );

  const weak = useMemo(
    () => weakConcepts(content.graph, masteryLookup, 0.7, 3),
    [content.graph, masteryLookup]
  );

  const overall = useMemo(() => {
    const values = Object.values(profile);
    return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [profile]);

  const hasData = masteryLookup.size > 0;

  return (
    <div className="lz-stack">
      <Card variant="panel">
        <p className="lz-eyebrow">{ct("progress.level")}</p>
        <h2 className="lz-section-title" style={{ marginBottom: 12 }}>
          {level ? t(level.name) : currentLevel}
        </h2>
        <SkillProgress label="Tổng quan" value={overall} />
      </Card>

      {hasData ? (
        <Card>
          <SectionHeading title={ct("progress.skills")} />
          <div className="lz-stack" style={{ marginTop: 12 }}>
            {LEARNING_SKILLS.filter((skill) => profile[skill] !== undefined).map((skill) => (
              <SkillProgress key={skill} label={ct(`skill.${skill}`)} value={profile[skill] ?? 0} />
            ))}
          </div>
        </Card>
      ) : (
        <Card variant="muted">
          <p className="lz-muted">{ct("progress.noData")}</p>
        </Card>
      )}

      {weak.length > 0 ? (
        <Card>
          <SectionHeading title={ct("progress.focus")} />
          <ul style={{ margin: "12px 0 0", paddingInlineStart: 20 }}>
            {weak.map((entry) => {
              const concept = content.graph.concept(entry.conceptId);
              return (
                <li key={entry.conceptId} style={{ marginBottom: 6, fontSize: "var(--lz-text-sm)" }}>
                  {concept ? t(concept.title) : entry.conceptId}
                  {entry.weakSkills.length > 0 ? (
                    <span className="lz-muted"> — {entry.weakSkills.map((s) => ct(`skill.${s}`)).join(", ")}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <div className="lz-stack lz-stack--tight">
        <PrimaryButton onClick={onPractice}>{ct("progress.practice5")}</PrimaryButton>
        {snapshot.profile.streak.longest > 0 ? (
          <p className="lz-muted" style={{ textAlign: "center" }}>
            🔥 Chuỗi dài nhất: {snapshot.profile.streak.longest} ngày
          </p>
        ) : null}
      </div>
    </div>
  );
}
