import { useMemo } from "react";

import type { ContentId, Course } from "../../../../packages/content-schema/src/index";
import { courseProgress } from "../../../../packages/curriculum-engine/src/index";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import { Card, InteractiveCard, ProgressBar, SectionHeading } from "../components/primitives";
import { t } from "../lib/i18n";

function CourseCard({ course, onOpenUnit }: { course: Course; onOpenUnit: (unitId: ContentId) => void }) {
  const content = useContent();
  const { masteryLookup } = useLearner();
  const progress = courseProgress(content.graph, course.id, masteryLookup);
  const completion =
    progress.length === 0
      ? 0
      : progress.reduce((sum, unit) => sum + unit.completion, 0) / progress.length;
  const lessonCount = course.unitIds.reduce(
    (sum, unitId) => sum + (content.graph.unit(unitId)?.lessonIds.length ?? 0),
    0
  );

  return (
    <Card className="lz-course-catalog__course">
      <div className="lz-row lz-row--between" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="lz-eyebrow">
            {course.level} · {course.unitIds.length} UNIT · {lessonCount} BÀI
          </p>
          <h3 className="lz-section-title" style={{ margin: "5px 0 7px" }}>
            {t(course.title)}
          </h3>
          <p className="lz-muted" style={{ margin: 0 }}>{t(course.description)}</p>
        </div>
        <span className="lz-pill">{Math.round(completion * 100)}%</span>
      </div>

      <div style={{ marginTop: 14 }}>
        <ProgressBar value={completion} label={t(course.title)} />
      </div>

      <div className="lz-course-catalog__units">
        {progress.map((unitProgress, index) => {
          const unit = content.graph.unit(unitProgress.unitId);
          if (!unit) return null;
          const locked = unitProgress.status === "locked";

          return (
            <InteractiveCard
              key={unit.id}
              onClick={() => onOpenUnit(unit.id)}
              disabled={locked}
              ariaLabel={`${t(unit.title)}${locked ? " — chưa mở" : ""}`}
              className="lz-course-catalog__unit"
            >
              <div className="lz-row lz-row--between">
                <div className="lz-row">
                  <span className="lz-course-catalog__unit-icon" aria-hidden="true">
                    {unit.icon ?? "📘"}
                  </span>
                  <div>
                    <strong>{t(unit.title)}</strong>
                    <p className="lz-muted">
                      {unit.lessonIds.length} bài · {unit.conceptIds.length} khái niệm
                    </p>
                  </div>
                </div>
                <span
                  className={
                    unitProgress.status === "completed"
                      ? "lz-pill lz-pill--done"
                      : locked
                        ? "lz-pill lz-pill--locked"
                        : "lz-pill"
                  }
                >
                  {unitProgress.status === "completed" ? "✓" : locked ? "🔒" : index + 1}
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                <ProgressBar value={unitProgress.completion} label={t(unit.title)} />
              </div>
            </InteractiveCard>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * Separates the sequential A0/A1 foundation path from optional specialist
 * tracks. All courses still point at the same concept graph, so specialist
 * practice strengthens existing mastery instead of creating duplicate words.
 */
export function CourseCatalogScreen({ onOpenUnit }: { onOpenUnit: (unitId: ContentId) => void }) {
  const content = useContent();
  const foundation = useMemo(
    () => content.bundle.courses.filter((course) => !course.id.includes(".track.")),
    [content.bundle.courses]
  );
  const specialist = useMemo(
    () => content.bundle.courses.filter((course) => course.id.includes(".track.")),
    [content.bundle.courses]
  );

  return (
    <div className="lz-stack">
      <section className="lz-topic-hero lz-course-catalog__hero">
        <span className="lz-topic-hero__icon" aria-hidden="true">🎓</span>
        <p className="lz-eyebrow lz-eyebrow--on-accent">THƯ VIỆN HỌC TẬP</p>
        <h2>{content.bundle.courses.length} khóa học đang có</h2>
        <p>
          Học theo lộ trình nền tảng hoặc chọn khóa tình huống. Kiến thức và mastery được dùng chung giữa các khóa.
        </p>
        <div className="lz-topic-stats">
          <div className="lz-topic-stat"><strong>{content.bundle.courses.length}</strong><small>khóa học</small></div>
          <div className="lz-topic-stat"><strong>{content.bundle.units.length}</strong><small>unit</small></div>
          <div className="lz-topic-stat"><strong>{content.bundle.lessons.length}</strong><small>bài học</small></div>
        </div>
      </section>

      <div className="lz-stack">
        <SectionHeading eyebrow="LỘ TRÌNH CHÍNH" title="Học từ nền tảng" />
        {foundation.map((course) => (
          <CourseCard key={course.id} course={course} onOpenUnit={onOpenUnit} />
        ))}
      </div>

      {specialist.length > 0 ? (
        <div className="lz-stack">
          <SectionHeading eyebrow="KHÓA CHUYÊN ĐỀ" title="Học theo tình huống" />
          <Card variant="muted">
            <p className="lz-muted" style={{ margin: 0 }}>
              Ví dụ, từ 咖啡 học trong A1 vẫn là chính khái niệm đó khi xuất hiện ở khóa Nhà hàng hay Luyện phát âm — không học lại từ đầu.
            </p>
          </Card>
          {specialist.map((course) => (
            <CourseCard key={course.id} course={course} onOpenUnit={onOpenUnit} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
