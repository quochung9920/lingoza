import { useMemo } from "react";

import type { ContentId } from "../../../../packages/content-schema/src/index";
import { useContent } from "../app/content-provider";
import { Card, EmptyState, InteractiveCard, SectionHeading } from "../components/primitives";
import { t } from "../lib/i18n";

export function TopicScreen({
  topicId,
  onOpenUnit,
  onOpenLesson,
  onOpenScenario
}: {
  topicId: ContentId;
  onOpenUnit: (unitId: ContentId) => void;
  onOpenLesson: (lessonId: ContentId) => void;
  onOpenScenario: (scenarioId: ContentId) => void;
}) {
  const content = useContent();
  const topic = content.topic(topicId);

  const units = useMemo(() => content.unitsForTopic(topicId), [content, topicId]);
  const lessons = useMemo(() => content.lessonsForTopic(topicId), [content, topicId]);
  const scenarios = useMemo(() => content.scenariosForTopic(topicId), [content, topicId]);

  const vocabularyCount = useMemo(() => {
    const vocabulary = new Set<ContentId>();
    for (const lesson of lessons) {
      for (const conceptId of lesson.conceptIds) {
        content.graph.concept(conceptId)?.lexicalItemIds.forEach((id) => vocabulary.add(id));
      }
    }
    return vocabulary.size;
  }, [content, lessons]);

  if (!topic) return <EmptyState title="Không tìm thấy chủ đề" />;

  return (
    <div className="lz-stack">
      <section className="lz-topic-hero">
        <span className="lz-topic-hero__icon" aria-hidden="true">{topic.icon ?? "🎧"}</span>
        <p className="lz-eyebrow lz-eyebrow--on-accent">CHỦ ĐỀ</p>
        <h2>{t(topic.label)}</h2>
        <p>Học từ vựng, mẫu câu và phản xạ nói trong cùng một ngữ cảnh thay vì ghi nhớ từng mảnh rời rạc.</p>

        <div className="lz-topic-stats">
          <div className="lz-topic-stat"><strong>{vocabularyCount}</strong><small>từ & cụm</small></div>
          <div className="lz-topic-stat"><strong>{lessons.length}</strong><small>bài học</small></div>
          <div className="lz-topic-stat"><strong>{scenarios.length}</strong><small>hội thoại</small></div>
        </div>
      </section>

      {units.length > 0 ? (
        <div className="lz-stack lz-stack--tight">
          <SectionHeading title="Lộ trình trong chủ đề" />
          {units.map((unit) => (
            <InteractiveCard key={unit.id} onClick={() => onOpenUnit(unit.id)} ariaLabel={t(unit.title)}>
              <div className="lz-row lz-row--between">
                <div className="lz-row">
                  <span style={{ fontSize: 27 }} aria-hidden="true">{unit.icon ?? topic.icon ?? "📘"}</span>
                  <div>
                    <strong>{t(unit.title)}</strong>
                    <p className="lz-muted">{unit.lessonIds.length} bài · {unit.conceptIds.length} khái niệm</p>
                  </div>
                </div>
                <span className="lz-pill">→</span>
              </div>
            </InteractiveCard>
          ))}
        </div>
      ) : null}

      {lessons.length > 0 ? (
        <div className="lz-stack lz-stack--tight">
          <SectionHeading title="Bài học" />
          {lessons.map((lesson) => (
            <InteractiveCard key={lesson.id} onClick={() => onOpenLesson(lesson.id)} ariaLabel={t(lesson.title)}>
              <div className="lz-topic-section-card">
                <div className="lz-row lz-row--between">
                  <strong>{t(lesson.title)}</strong>
                  <span className="lz-pill">{lesson.estimatedMinutes} phút</span>
                </div>
                <p className="lz-muted">🎯 {t(lesson.canDo)}</p>
                <div className="lz-topic-section-card__meta">
                  <span className="lz-pill">🎧 Nghe</span>
                  <span className="lz-pill">🎤 Nói</span>
                  {lesson.activities.some((activity) => activity.kind === "ROLE_PLAY" || activity.kind === "DIALOGUE") ? (
                    <span className="lz-pill">💬 Hội thoại</span>
                  ) : null}
                </div>
              </div>
            </InteractiveCard>
          ))}
        </div>
      ) : (
        <Card variant="muted"><p className="lz-muted">Chủ đề này chưa có bài học được phát hành.</p></Card>
      )}

      {scenarios.length > 0 ? (
        <div className="lz-stack lz-stack--tight">
          <SectionHeading title="Hội thoại thực hành" />
          {scenarios.map((scenario) => (
            <InteractiveCard key={scenario.id} onClick={() => onOpenScenario(scenario.id)} ariaLabel={t(scenario.title)}>
              <div className="lz-row lz-row--between">
                <div>
                  <strong>💬 {t(scenario.title)}</strong>
                  <p className="lz-muted">{t(scenario.setting)}</p>
                </div>
                <span className="lz-pill">{scenario.level}</span>
              </div>
            </InteractiveCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
