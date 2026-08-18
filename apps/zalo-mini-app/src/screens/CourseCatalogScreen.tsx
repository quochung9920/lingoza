import { useMemo } from "react";

import type {
  ContentId,
  Course,
  LearningProgram,
  ProgramBand,
  ProgramStage
} from "../../../../packages/content-schema/src/index";
import { courseProgress } from "../../../../packages/curriculum-engine/src/index";
import {
  HSK_PRODUCTION_PLAN,
  productionPlanForBand
} from "../../../../language-packs/zh-CN/src/hsk-production-plan";
import { hskThemeLabelVi } from "../../../../language-packs/zh-CN/src/hsk-theme-labels";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import { Card, InteractiveCard, ProgressBar, SectionHeading } from "../components/primitives";
import { t } from "../lib/i18n";

const STAGE_LABEL: Record<ProgramStage, string> = {
  elementary: "SƠ CẤP",
  intermediate: "TRUNG CẤP",
  advanced: "CAO CẤP"
};

const RELEASE_STATUS: Record<ProgramBand["status"], { label: string; className: string }> = {
  available: {
    label: "Đã phát hành",
    className: "lz-hsk-band__status lz-hsk-band__status--available"
  },
  building: {
    label: "Đang hoàn thiện phát hành",
    className: "lz-hsk-band__status lz-hsk-band__status--building"
  },
  planned: {
    label: "Chưa phát hành thương mại",
    className: "lz-hsk-band__status lz-hsk-band__status--planned"
  }
};

const HSK_TARGET_TOTALS = HSK_PRODUCTION_PLAN.reduce(
  (totals, plan) => ({
    units: totals.units + plan.productionTargets.minimumUnits,
    lessons: totals.lessons + plan.productionTargets.minimumLessons,
    utterances: totals.utterances + plan.productionTargets.minimumReviewedUtterances,
    scenarios: totals.scenarios + plan.productionTargets.minimumConversationScenarios
  }),
  { units: 0, lessons: 0, utterances: 0, scenarios: 0 }
);

function completionForCourse(courseId: ContentId): number {
  void courseId;
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
  const releaseStatus = RELEASE_STATUS[band.status];
  const productionPlan = productionPlanForBand(band.ordinal);
  const target = productionPlan?.productionTargets;

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
  const currentUnits = linkedCourses.reduce((sum, course) => sum + course.unitIds.length, 0);
  const currentLessons = linkedCourses.reduce(
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
          <span className="lz-hsk-band__status lz-hsk-band__status--available">
            {band.developmentStatus === "developed" ? "Đã phát triển lộ trình" : "Đang phát triển lộ trình"}
          </span>
        </div>
      </div>

      <p>{t(band.description)}</p>

      <div className="lz-hsk-band__meta">
        <span>{productionPlan?.themes.length ?? 0} danh mục</span>
        <span>{target?.minimumUnits ?? 0} unit mục tiêu</span>
        <span>{target?.minimumLessons ?? 0} bài mục tiêu</span>
      </div>

      {productionPlan ? (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Xem đầy đủ {productionPlan.themes.length} danh mục HSK {band.ordinal}
          </summary>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {productionPlan.themes.map((theme, index) => (
              <span className="lz-pill" key={`${band.id}.theme.${theme}`}>
                {index + 1}. {hskThemeLabelVi(theme)}
              </span>
            ))}
          </div>
        </details>
      ) : null}

      <div className="lz-hsk-band__planned" style={{ marginTop: 10 }}>
        <strong>Trạng thái phát hành:</strong>{" "}
        <span className={releaseStatus.className}>{releaseStatus.label}</span>
      </div>

      <div style={{ marginTop: 12 }}>
        <p className="lz-eyebrow" style={{ marginBottom: 8 }}>NĂNG LỰC ĐẦU RA</p>
        <div className="lz-stack" style={{ gap: 7 }}>
          {band.canDoObjectives.map((objective, index) => (
            <div key={`${band.id}.objective.${index}`} className="lz-row" style={{ alignItems: "flex-start" }}>
              <span aria-hidden="true">✓</span>
              <span>{t(objective)}</span>
            </div>
          ))}
        </div>
      </div>

      {linkedCourses.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div className="lz-hsk-band__meta">
            <span>{currentUnits} unit có thể học</span>
            <span>{currentLessons} bài có thể học</span>
          </div>
          <ProgressBar value={completion} label={`${t(band.label)} — tiến độ nội dung hiện có`} />
        </div>
      ) : (
        <div className="lz-hsk-band__planned" style={{ marginTop: 12 }}>
          Khung chương trình của cấp này đã được thiết kế. Bài học learner-facing sẽ chỉ được đưa vào kho học khi vượt qua content, audio và review gate.
        </div>
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
          <strong>Cả 9 cấp HSK đã có lộ trình curriculum và production blueprint.</strong>{" "}
          Nhãn phát hành được tách riêng: một cấp chỉ được gọi là đã phát hành thương mại khi learner content, audio, human review và reference coverage đều đạt gate.
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
 * Two states are intentionally visible at the same time:
 * 1) curriculum-development completeness — all HSK 1-9 blueprints exist; and
 * 2) commercial-release readiness — only real, reviewed learner content counts.
 *
 * This prevents the UI from saying a curriculum is "not developed" merely
 * because its production audio or review gates are not finished yet.
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
        <h2>HSK 1–9 đã có cấu trúc chương trình đầy đủ</h2>
        <p>
          Cả 9 cấp đã có curriculum blueprint từ sơ cấp đến cao cấp. Nội dung học thật được phát hành dần theo quality gate để không đánh đổi độ chính xác lấy số lượng.
        </p>
        <div className="lz-topic-stats">
          <div className="lz-topic-stat"><strong>{program?.bands.length ?? 0}/9</strong><small>lộ trình đã thiết kế</small></div>
          <div className="lz-topic-stat"><strong>{HSK_TARGET_TOTALS.units}</strong><small>danh mục / unit</small></div>
          <div className="lz-topic-stat"><strong>{HSK_TARGET_TOTALS.lessons}</strong><small>bài mục tiêu</small></div>
        </div>
      </section>

      {program ? <HskRoadmap program={program} /> : null}

      <div className="lz-stack">
        <SectionHeading eyebrow="CÓ THỂ HỌC NGAY" title="Nội dung learner-facing hiện có" />
        <Card variant="muted">
          <p className="lz-muted" style={{ margin: 0 }}>
            Đây là các course đã có lesson thật trong content bundle. Chúng được tách khỏi trạng thái “đã thiết kế curriculum” để người học luôn biết phần nào có thể bắt đầu học ngay.
          </p>
        </Card>
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
