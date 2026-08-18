import { useCallback, useEffect, useMemo, useState } from "react";

import type { ContentId } from "../../../../packages/content-schema/src/index";
import { ACTIVITY_SKILL_MAP } from "../../../../packages/content-schema/src/index";
import { useAudio } from "../app/audio-provider";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import {
  Card,
  EmptyState,
  IconButton,
  LessonProgress,
  PrimaryButton
} from "../components/primitives";
import { ct, t } from "../lib/i18n";
import { ActivityView } from "./ActivityView";

/**
 * The lesson player -- the screen the product lives or dies on.
 *
 * It is fullscreen, has no bottom navigation, and shows exactly one activity
 * with one primary action at a time. Everything chrome-like (title, step
 * counter, Back) is compressed into a single header line so the activity gets
 * the screen.
 */

export function LessonPlayer({
  lessonId,
  onExit
}: {
  lessonId: ContentId;
  onExit: () => void;
}) {
  const content = useContent();
  const { manager } = useAudio();
  const { recordOutcome, markLessonComplete } = useLearner();

  const lesson = content.graph.lesson(lessonId);
  const unit = lesson ? content.graph.unit(lesson.unitId) : undefined;

  const [index, setIndex] = useState(0);
  const [showContext, setShowContext] = useState(Boolean(lesson?.context));
  const [completed, setCompleted] = useState(false);

  const activity = lesson?.activities[index];

  /* Preload only the next activity's audio -- never the whole lesson. */
  const nextAudioAsset = useMemo(() => {
    const next = lesson?.activities[index + 1];
    if (!next) return undefined;
    switch (next.kind) {
      case "LISTEN_UNDERSTAND":
      case "SHADOWING":
        return content.sentence(next.sentenceId)?.audio;
      case "LISTEN_CHOOSE":
      case "QUICK_RESPONSE":
        return content.sentence(next.promptSentenceId)?.audio;
      case "GUIDED_SPEAKING":
        return content.sentence(next.targetSentenceId)?.audio;
      default:
        return undefined;
    }
  }, [lesson, index, content]);

  useEffect(() => {
    manager.preload(nextAudioAsset);
  }, [manager, nextAudioAsset]);

  /* Audio must not survive leaving the player. */
  useEffect(() => () => manager.stop(), [manager]);

  const handleComplete = useCallback(
    (score: number) => {
      if (!activity || !lesson) return;

      manager.stop();
      recordOutcome({
        conceptIds: activity.conceptIds,
        kind: activity.kind,
        score,
        skills: activity.skills ?? ACTIVITY_SKILL_MAP[activity.kind],
        at: new Date().toISOString()
      });

      if (index + 1 >= lesson.activities.length) {
        markLessonComplete(lesson.id);
        setCompleted(true);
        return;
      }
      setIndex(index + 1);
    },
    [activity, lesson, index, manager, recordOutcome, markLessonComplete]
  );

  if (!lesson) {
    return <EmptyState title="Không tìm thấy bài học" />;
  }

  if (completed) {
    return (
      <div className="lz-player">
        <div className="lz-player__stage">
          <div className="lz-player__prompt" style={{ marginBlock: "auto" }}>
            <span className="lz-player__glyph" aria-hidden="true">
              🎉
            </span>
            <h2 className="lz-section-title">{ct("lesson.complete")}</h2>
            <p className="lz-muted">{t(lesson.canDo)}</p>
            <p className="lz-muted">{ct("lesson.completeBody")}</p>
          </div>
        </div>
        <div className="lz-player__actions">
          <PrimaryButton onClick={onExit}>{ct("common.done")}</PrimaryButton>
        </div>
      </div>
    );
  }

  /* Context card: one line of scene-setting before the first activity. */
  if (showContext && lesson.context) {
    return (
      <div className="lz-player">
        <header className="lz-header">
          <IconButton label={ct("common.back")} icon="‹" onClick={onExit} />
          <h1 className="lz-header__title">{t(lesson.title)}</h1>
        </header>
        <div className="lz-player__stage">
          <div className="lz-player__prompt" style={{ marginBlock: "auto" }}>
            <span className="lz-player__glyph" aria-hidden="true">
              {unit?.icon ?? "📘"}
            </span>
            <h2 className="lz-section-title">{t(lesson.canDo)}</h2>
            <Card variant="muted">
              <p className="lz-muted" style={{ margin: 0 }}>
                {t(lesson.context)}
              </p>
            </Card>
          </div>
        </div>
        <div className="lz-player__actions">
          <PrimaryButton onClick={() => setShowContext(false)}>{ct("common.continue")}</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="lz-player">
      <header className="lz-header">
        <IconButton label={ct("common.back")} icon="‹" onClick={onExit} />
        <h1 className="lz-header__title">{unit ? t(unit.title) : t(lesson.title)}</h1>
        <span className="lz-header__meta">
          {index + 1}/{lesson.activities.length}
        </span>
      </header>

      <div style={{ padding: "0 16px 8px" }}>
        <LessonProgress total={lesson.activities.length} current={index} />
      </div>

      <div className="lz-player__stage">
        {activity ? (
          <>
            <p className="lz-muted" style={{ textAlign: "center" }}>
              {t(activity.instruction)}
            </p>
            {/* Remounting per activity resets recorder and choice state, which
                is what we want: activities never share transient state. */}
            <ActivityView key={activity.id} activity={activity} onComplete={handleComplete} />
          </>
        ) : null}
      </div>
    </div>
  );
}
