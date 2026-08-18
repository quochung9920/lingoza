import { useMemo } from "react";

import type {
  ContentId,
  Course,
  LearningProgram,
  ProgramBand,
  ProgramStage
} from "../../../../packages/content-schema/src/index";
import { courseProgress } from "../../../../packages/curriculum-engine/src/index";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import { Card, InteractiveCard, ProgressBar, SectionHeading } from "../components/primitives";
import { t } from "../lib/i18n";

const STAGE_LABEL: Record<ProgramStage, string> = {
  elementary: "SƠ CẤP",
  intermediate: "TRUNG CẤP",
  advanced: "CAO CẤP"
};

const BAND_STATUS: Record<ProgramBand["status"], { label: string; className: string }> = {
  available: { label: "Sẵn sàng", className: "lz-hsk-band__status lz-hsk-band__status--available" },
  building: { label: "Đang xây dựng", className: "lz-hsk-band__status lz-hsk-band__status--building" },
  planned: { label: "Sắp phát triển", className: "lz-hsk-band__status lz-hsk-band__status--planned" }
};

function completionForCourse(courseId: ContentId): number {
  return 0;
}

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

function ProgramBandCard({ band }: { band: ProgramBand }) {
  const content = useContent();
  const { masteryLookup } = useLearner();
  const status = BAND_STATUS[band.status];

  const linkedCourses = band.courseIds
    .map((id) => content.graph.course(id))
    .filter((course): course is Course => Boolean(course));
  const courseCompletions = linkedCourses.map((course) => {
    const progress = courseProgress(content.graph, course.id, masteryLookup);
    return progress.length === 0
      ? completionForCourse(course.id)
      : progress.reduce((sum, unit) => sum + unit.completion, 0) / progress.length;
  });
  const completion =
    courseCompletions.length === 0
      ? 0
      : courseCompletions.reduce((sum, value) => sum + value, 0) / courseCompletions.length;
  const units = linkedCourses.reduce((sum, course) => sum + course.unitIds.length, 0);
  const lessons = linkedCourses.reduce(
    (sum, course) =>
      sum + course.unitIds.reduce((unitSum, unitId) => unitSum + (content.graph.unit(unitId)?.lessonIds.length ?? 0), 0),
    0
  );

  return (
    <div className="lz-hsk-band" data-status={band.status}>
      <div className="lz-hsk-band__top">
        <div className="lz-hsk-band__number" aria-hidden="true">{band.ordinal}</div>
        <div className="lz-hsk-band__heading">
          <strong>{t(band.label)}</strong>
          <span className={status.className}>{status.label}</span>
        </div>
      </div>
      <p>{t(band.description)}</p>
      {band.status !== "planned" ? (
        <>
          <div className="lz-hsk-band__meta">
            <span>{units} unit</span>
            <span>{lessons} bài hiện có</span>
          </div>
          <ProgressBar value={completion} label={t(band.label)} />
        </>
      ) : (
        <div className="lz-hsk-band__planned">Nội dung sẽ được mở sau khi cấp trước đạt chuẩn coverage.</div>
      )}
    </div>
  );
}

function HskRoadmap({ program }: { program: LearningProgram }) {
  const stages: ProgramStage[] = ["elementary", "intermediate", "advanced"];

  return (
    <section className="lz-hsk-roadmap">
      <div className="lz-hsk-roadmap__head">
        <div>
          <p className="lz-eyebrow">CHƯƠNG TRÌNH CHÍNH</p>
          <h2>{t(program.title)}</h2>
          <p>{t(program.description)}</p>
        </div>
        <div className="lz-hsk-roadmap__standard">
          <strong>{program.alignmentReference.reference}</strong>
          <span>chuẩn tham chiếu</span>
        </div>
      </div>

      <div className="lz-hsk-roadmap__notice">
        <span aria-hidden="true">🎯</span>
        <p>
          Lingoza chỉ đánh dấu một cấp là <strong>Sẵn sàng</strong> khi curriculum, audio, review và reference coverage đều hoàn tất. Hiện HSK 1 đang được xây dựng; HSK 2–9 hiển thị để người học thấy toàn bộ lộ trình dài hạn.
        </p>
      </div>

      {stages.map((stage) => {
        const bands = program.bands.filter((band) => band.stage === stage);
        if (bands.length === 0) return null;
        return (
          <div className="lz-hsk-stage" key={stage}>
            <div className="lz-hsk-stage__label">
              <span>{STAGE_LABEL[stage]}</span>
              <small>HSK {bands[0].ordinal}–{bands[bands.length - 1].ordinal}</small>
            </div>
            <div className="lz-hsk-stage__grid">
              {bands.map((band) => <ProgramBandCard key={band.id} band={band} />)}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/**
 * The library now has two distinct layers:
 * 1) a visible HSK 1-9 long-term program roadmap, and
 * 2) the actual authored Lingoza courses currently contributing content.
 *
 * This prevents "planned" HSK levels from masquerading as finished courses
 * while still making the product direction obvious to learners.
 */
export function CourseCatalogScreen({ onOpenUnit }: { onOpenUnit: (unitId: ContentId) => void }) {
  const content = useContent();
  const program = content.bundle.programs?.find((candidate) => candidate.id === "zh.program.hsk");
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
        <p className="lz-eyebrow lz-eyebrow--on-accent">TIẾNG TRUNG TOÀN DIỆN</p>
        <h2>Học từ nền tảng đến cao cấp</h2>
        <p>
          Lộ trình HSK 1–9 là xương sống dài hạn; các khóa tình huống dùng chung concept và mastery để tăng khả năng giao tiếp thực tế.
        </p>
        <div className="lz-topic-stats">
          <div className="lz-topic-stat"><strong>{program?.bands.length ?? 0}</strong><small>cấp HSK</small></div>
          <div className="lz-topic-stat"><strong>{content.bundle.units.length}</strong><small>unit hiện có</small></div>
          <div className="lz-topic-stat"><strong>{content.bundle.lessons.length}</strong><small>bài hiện có</small></div>
        </div>
      </section>

      {program ? <HskRoadmap program={program} /> : null}

      <div className="lz-stack">
        <SectionHeading eyebrow="NỘI DUNG ĐANG HỌC" title="Nền tảng hiện có" />
        {foundation.map((course) => (
          <CourseCard key={course.id} course={course} onOpenUnit={onOpenUnit} />
        ))}
      </div>

      {specialist.length > 0 ? (
        <div className="lz-stack">
          <SectionHeading eyebrow="KHÓA CHUYÊN ĐỀ" title="Luyện theo tình huống" />
          <Card variant="muted">
            <p className="lz-muted" style={{ margin: 0 }}>
              Từ và concept được dùng chung giữa lộ trình chính và khóa chuyên đề. Học một lần, luyện lại trong nhiều ngữ cảnh khác nhau.
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
