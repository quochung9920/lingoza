import { useMemo } from "react";

import type { ContentId } from "../../../../packages/content-schema/src/index";
import {
  courseProgress,
  isConceptMastered,
  learningPathTo,
  type UnitStatus
} from "../../../../packages/curriculum-engine/src/index";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import {
  Card,
  EmptyState,
  InteractiveCard,
  ProgressBar,
  SectionHeading
} from "../components/primitives";
import { ct, t } from "../lib/i18n";

/**
 * Course map and unit detail.
 *
 * A locked unit explains itself. Rather than showing a padlock and nothing
 * else, the card names what still has to be learned first -- the curriculum
 * engine can compute that path, so withholding it would be a choice to be
 * mysterious.
 */

const STATUS_PILL: Record<UnitStatus, { className: string; labelKey: Parameters<typeof ct>[0] }> = {
  locked: { className: "lz-pill lz-pill--locked", labelKey: "common.locked" },
  available: { className: "lz-pill", labelKey: "common.current" },
  "in-progress": { className: "lz-pill", labelKey: "common.current" },
  completed: { className: "lz-pill lz-pill--done", labelKey: "common.completed" }
};

export function CourseMapScreen({ onOpenUnit }: { onOpenUnit: (unitId: ContentId) => void }) {
  const content = useContent();
  const { masteryLookup } = useLearner();

  return (
    <div className="lz-stack">
      {content.bundle.courses.map((course) => {
        const units = courseProgress(content.graph, course.id, masteryLookup);
        const completion =
          units.length === 0 ? 0 : units.reduce((sum, unit) => sum + unit.completion, 0) / units.length;

        return (
          <div className="lz-stack lz-stack--tight" key={course.id}>
            <SectionHeading eyebrow={course.level} title={t(course.title)} />
            <Card variant="muted">
              <p className="lz-muted" style={{ marginBottom: 10 }}>
                {t(course.description)}
              </p>
              <ProgressBar value={completion} label={t(course.title)} />
            </Card>

            {units.map((progress) => {
              const unit = content.graph.unit(progress.unitId);
              if (!unit) return null;
              const pill = STATUS_PILL[progress.status];

              return (
                <InteractiveCard
                  key={unit.id}
                  onClick={() => onOpenUnit(unit.id)}
                  ariaLabel={`${t(unit.title)} — ${ct(pill.labelKey)}`}
                >
                  <div className="lz-row lz-row--between">
                    <div className="lz-row">
                      <span style={{ fontSize: 24 }} aria-hidden="true">
                        {unit.icon ?? "📘"}
                      </span>
                      <div>
                        <strong>{t(unit.title)}</strong>
                        <p className="lz-muted">
                          {unit.lessonIds.length} bài · {unit.conceptIds.length} khái niệm
                        </p>
                      </div>
                    </div>
                    <span className={pill.className}>{ct(pill.labelKey)}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <ProgressBar value={progress.completion} label={t(unit.title)} />
                  </div>
                </InteractiveCard>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function UnitScreen({
  unitId,
  onOpenLesson
}: {
  unitId: ContentId;
  onOpenLesson: (lessonId: ContentId) => void;
}) {
  const content = useContent();
  const { masteryLookup, snapshot } = useLearner();
  const unit = content.graph.unit(unitId);

  const counts = useMemo(() => {
    if (!unit) return { vocabulary: 0, patterns: 0, conversations: 0 };
    const vocabulary = new Set<ContentId>();
    const patterns = new Set<ContentId>();
    const conversations = new Set<ContentId>();

    for (const conceptId of unit.conceptIds) {
      const concept = content.graph.concept(conceptId);
      concept?.lexicalItemIds.forEach((id) => vocabulary.add(id));
      concept?.patternIds.forEach((id) => patterns.add(id));
    }
    for (const lessonId of unit.lessonIds) {
      for (const activity of content.graph.lesson(lessonId)?.activities ?? []) {
        if (activity.kind === "ROLE_PLAY" || activity.kind === "DIALOGUE") {
          conversations.add(activity.scenarioId);
        }
      }
    }
    return { vocabulary: vocabulary.size, patterns: patterns.size, conversations: conversations.size };
  }, [content, unit]);

  if (!unit) return <EmptyState title="Không tìm thấy nội dung" />;

  const conceptList = unit.conceptIds
    .map((id) => content.graph.concept(id))
    .filter((concept): concept is NonNullable<typeof concept> => Boolean(concept));
  const mastered = conceptList.filter((concept) => isConceptMastered(concept, masteryLookup));

  return (
    <div className="lz-stack">
      <Card variant="panel">
        <div className="lz-row" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 30 }} aria-hidden="true">
            {unit.icon ?? "📘"}
          </span>
          <div>
            <h2 className="lz-section-title">{t(unit.title)}</h2>
            <p className="lz-muted">
              {counts.vocabulary} từ · {counts.patterns} mẫu câu · {counts.conversations} hội thoại
            </p>
          </div>
        </div>
        <ProgressBar
          value={conceptList.length === 0 ? 0 : mastered.length / conceptList.length}
          label={t(unit.title)}
        />
      </Card>

      <div className="lz-stack lz-stack--tight">
        <SectionHeading eyebrow="SAU BÀI NÀY BẠN CÓ THỂ" title="Mục tiêu" />
        <Card variant="muted">
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {unit.canDoObjectives.map((objective, index) => (
              <li key={index} style={{ marginBottom: 6, fontSize: "var(--lz-text-sm)" }}>
                {t(objective)}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="lz-stack lz-stack--tight">
        <SectionHeading title="Bài học" />
        {unit.lessonIds.map((lessonId, index) => {
          const lesson = content.graph.lesson(lessonId);
          if (!lesson) return null;

          const missing = lesson.conceptIds.flatMap((conceptId) =>
            learningPathTo(content.graph, conceptId, masteryLookup).filter(
              (concept) => !lesson.conceptIds.includes(concept.id)
            )
          );
          const locked = missing.length > 0;
          const done = snapshot.profile.completedLessonIds.includes(lesson.id);

          return (
            <InteractiveCard
              key={lesson.id}
              onClick={() => onOpenLesson(lesson.id)}
              disabled={locked}
              ariaLabel={`${t(lesson.title)}${locked ? " — chưa mở" : ""}`}
            >
              <div className="lz-row lz-row--between">
                <div className="lz-row">
                  <span className="lz-pill" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <strong>{t(lesson.title)}</strong>
                    <p className="lz-muted">
                      {t(lesson.canDo)} · {lesson.estimatedMinutes} {ct("common.minutes")}
                    </p>
                  </div>
                </div>
                {done ? <span className="lz-pill lz-pill--done">✓</span> : null}
              </div>

              {locked ? (
                <p className="lz-muted" style={{ marginTop: 10 }}>
                  🔒 Cần học trước: {missing.map((concept) => t(concept.title)).join(", ")}
                </p>
              ) : null}
            </InteractiveCard>
          );
        })}
      </div>
    </div>
  );
}
