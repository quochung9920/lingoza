import { useMemo } from "react";

import type { ContentId } from "../../../../packages/content-schema/src/index";
import { courseProgress, nextLesson } from "../../../../packages/curriculum-engine/src/index";
import type { LearningGoal } from "../../../../packages/persistence/src/index";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import {
  Card,
  EmptyState,
  InteractiveCard,
  PrimaryButton,
  ProgressBar,
  SectionHeading
} from "../components/primitives";
import { ct, t } from "../lib/i18n";

const GOAL_LABEL: Record<LearningGoal, string> = {
  conversation: "Giao tiếp",
  travel: "Du lịch",
  work: "Công việc",
  study: "Học tập",
  hsk: "HSK"
};

function greetingKey(): Parameters<typeof ct>[0] {
  const hour = new Date().getHours();
  if (hour < 12) return "home.greetingMorning";
  if (hour < 18) return "home.greetingAfternoon";
  return "home.greetingEvening";
}

export function HomeScreen({
  onOpenLesson,
  onOpenUnit,
  onOpenCourse,
  onOpenReview,
  onOpenTopic
}: {
  onOpenLesson: (lessonId: ContentId) => void;
  onOpenUnit: (unitId: ContentId) => void;
  onOpenCourse: () => void;
  onOpenReview: () => void;
  onOpenTopic: (topicId: ContentId) => void;
}) {
  const content = useContent();
  const { masteryLookup, reviewPlan, snapshot } = useLearner();

  const suggestion = useMemo(
    () => nextLesson(content.graph, masteryLookup),
    [content.graph, masteryLookup]
  );

  const levelProgress = useMemo(() => {
    if (!suggestion) return 1;
    const units = courseProgress(content.graph, suggestion.course.id, masteryLookup);
    if (units.length === 0) return 0;
    return units.reduce((sum, unit) => sum + unit.completion, 0) / units.length;
  }, [content.graph, masteryLookup, suggestion]);

  const level = suggestion
    ? content.graph.level(suggestion.course.level)
    : content.graph.level(snapshot.profile.currentLevel);

  const topics = useMemo(() => content.coveredTopics().slice(0, 8), [content]);
  const streak = snapshot.profile.streak.current;
  const reviewMinutes = Math.max(1, Math.round(reviewPlan.estimatedSeconds / 60));
  const completedLessons = snapshot.profile.completedLessonIds.length;

  return (
    <div className="lz-stack">
      <section className="lz-hero">
        <div className="lz-row lz-row--between">
          <p className="lz-eyebrow lz-eyebrow--on-accent">
            {content.bundle.profile.flag} {t(content.bundle.profile.name)}
          </p>
          <span className="lz-pill lz-pill--on-accent">
            {streak > 0 ? `🔥 ${streak} ${ct("home.streak")}` : `🎯 ${GOAL_LABEL[snapshot.profile.learningGoal]}`}
          </span>
        </div>

        <h2 style={{ margin: "8px 0 4px", fontSize: "var(--lz-text-2xl)", letterSpacing: "-0.02em" }}>
          {ct(greetingKey())} 👋
        </h2>

        {level ? (
          <>
            <p style={{ margin: "0 0 12px", opacity: 0.86, fontSize: "var(--lz-text-sm)" }}>
              {t(level.name)} · {t(level.canDoObjectives[0])}
            </p>
            <ProgressBar value={levelProgress} label={t(level.name)} onAccent />
          </>
        ) : null}
      </section>

      {suggestion ? (
        <Card variant="panel">
          <p className="lz-eyebrow">{ct("home.nextLesson")}</p>
          <h3 style={{ margin: "6px 0 4px", fontSize: "var(--lz-text-xl)", letterSpacing: "-0.01em" }}>
            {t(suggestion.lesson.title)}
          </h3>
          <p className="lz-muted" style={{ marginBottom: 4 }}>
            {t(suggestion.unit.title)} · {suggestion.lesson.estimatedMinutes} {ct("common.minutes")}
          </p>
          <p className="lz-muted" style={{ marginBottom: 16 }}>
            🎯 {t(suggestion.lesson.canDo)}
          </p>
          <PrimaryButton onClick={() => onOpenLesson(suggestion.lesson.id)}>
            ▶ {ct("home.continue")}
          </PrimaryButton>
          <button
            type="button"
            className="lz-btn lz-btn--ghost lz-btn--block"
            onClick={() => onOpenUnit(suggestion.unit.id)}
          >
            Xem {t(suggestion.unit.title)} →
          </button>
        </Card>
      ) : (
        <Card variant="panel">
          <EmptyState glyph="🎉" title={ct("home.allDone")} />
        </Card>
      )}

      <div className="lz-mini-metric-grid" aria-label="Tóm tắt học tập">
        <div className="lz-mini-metric">
          <strong>{snapshot.profile.preferences.dailyGoalMinutes}</strong>
          <small>phút mục tiêu / ngày</small>
        </div>
        <div className="lz-mini-metric">
          <strong>{reviewPlan.slots.length}</strong>
          <small>nội dung cần ưu tiên ôn</small>
        </div>
        <div className="lz-mini-metric">
          <strong>{completedLessons}</strong>
          <small>bài đã hoàn thành</small>
        </div>
      </div>

      <div className="lz-home-actions">
        <InteractiveCard onClick={onOpenCourse} ariaLabel="Mở lộ trình học">
          <div className="lz-row lz-row--between">
            <div>
              <strong>🗺️ Lộ trình học</strong>
              <p className="lz-muted">Xem cấp độ, unit và bài đã mở.</p>
            </div>
            <span className="lz-pill">→</span>
          </div>
        </InteractiveCard>

        <InteractiveCard onClick={onOpenReview} ariaLabel="Mở ôn tập hôm nay">
          <div className="lz-row lz-row--between">
            <div>
              <strong>🔁 {ct("home.review")}</strong>
              <p className="lz-muted">
                {reviewPlan.slots.length > 0
                  ? `${reviewPlan.slots.length} ${ct("common.items")} · ~${reviewMinutes} ${ct("common.minutes")}`
                  : "Chưa có nội dung đến hạn."}
              </p>
            </div>
            <span className="lz-pill">▶</span>
          </div>
        </InteractiveCard>
      </div>

      {topics.length > 0 ? (
        <div className="lz-stack lz-stack--tight">
          <SectionHeading title={ct("home.topics")} />
          <div className="lz-topic-grid">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="lz-topic-card"
                onClick={() => onOpenTopic(topic.id)}
              >
                <span className="lz-topic-card__icon" aria-hidden="true">
                  {topic.icon ?? "•"}
                </span>
                {t(topic.label)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
