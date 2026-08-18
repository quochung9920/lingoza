import { describe, expect, it } from "vitest";

import { chineseBundle, hskProgram } from "../language-packs/zh-CN/src/index.js";
import {
  HSK_PRODUCTION_PLAN,
  LINGOZA_HSK_PARITY_GAPS,
  productionPlanForBand,
  validateHskProductionPlan
} from "../language-packs/zh-CN/src/hsk-production-plan.js";
import { hasVietnameseHskThemeLabel } from "../language-packs/zh-CN/src/hsk-theme-labels.js";

describe("HSK 1-9 program roadmap", () => {
  it("contains exactly nine ordered bands", () => {
    expect(hskProgram.bands).toHaveLength(9);
    expect(hskProgram.bands.map((band) => band.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("uses the three-stage grouping", () => {
    expect(hskProgram.bands.slice(0, 3).every((band) => band.stage === "elementary")).toBe(true);
    expect(hskProgram.bands.slice(3, 6).every((band) => band.stage === "intermediate")).toBe(true);
    expect(hskProgram.bands.slice(6, 9).every((band) => band.stage === "advanced")).toBe(true);
  });

  it("marks the curriculum structure of all nine bands as developed", () => {
    expect(hskProgram.bands.every((band) => band.developmentStatus === "developed")).toBe(true);
  });

  it("keeps commercial release readiness separate from development completeness", () => {
    expect(hskProgram.bands[0]?.status).toBe("building");
    expect(hskProgram.bands.slice(1).every((band) => band.status === "planned")).toBe(true);
    expect(hskProgram.bands.some((band) => band.status === "available")).toBe(false);
  });

  it("references only real Lingoza courses", () => {
    const courseIds = new Set(chineseBundle.courses.map((course) => course.id));
    for (const band of hskProgram.bands) {
      for (const courseId of band.courseIds) {
        expect(courseIds.has(courseId), `${band.id} references ${courseId}`).toBe(true);
      }
    }
  });

  it("is attached to the Chinese content bundle", () => {
    expect(chineseBundle.programs?.map((program) => program.id)).toContain(hskProgram.id);
  });

  it("ships a validated production blueprint for every HSK band", () => {
    expect(HSK_PRODUCTION_PLAN).toHaveLength(9);
    expect(HSK_PRODUCTION_PLAN.map((band) => band.band)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(validateHskProductionPlan()).toEqual([]);
  });

  it("provides a learner-facing Vietnamese label for every curriculum category", () => {
    const themes = HSK_PRODUCTION_PLAN.flatMap((band) => [...band.themes]);
    expect(themes).toHaveLength(180);
    expect(themes.every(hasVietnameseHskThemeLabel)).toBe(true);
  });

  it("keeps production-plan stage and release status aligned with the learner roadmap", () => {
    for (const band of hskProgram.bands) {
      const productionPlan = productionPlanForBand(band.ordinal);
      expect(productionPlan, `missing production plan for HSK ${band.ordinal}`).toBeDefined();
      expect(productionPlan?.stage).toBe(band.stage);
      expect(productionPlan?.programStatus).toBe(band.status);
    }
  });

  it("uses the shared advanced examination-syllabus bucket for HSK 7-9", () => {
    expect(productionPlanForBand(7)?.syllabusBucket).toBe("7-9");
    expect(productionPlanForBand(8)?.syllabusBucket).toBe("7-9");
    expect(productionPlanForBand(9)?.syllabusBucket).toBe("7-9");
  });

  it("requires substantial reviewed material before a band can be called commercial-ready", () => {
    for (const band of HSK_PRODUCTION_PLAN) {
      const targets = band.productionTargets;
      expect(targets.minimumUnits).toBeGreaterThan(0);
      expect(targets.minimumLessons).toBeGreaterThanOrEqual(targets.minimumUnits * 4);
      expect(targets.minimumReviewedUtterances).toBeGreaterThanOrEqual(targets.minimumLessons * 10);
      expect(targets.minimumConversationScenarios).toBeGreaterThan(0);
      expect(targets.minimumAssessments).toBeGreaterThan(0);
    }
  });

  it("makes full-standard parity gaps explicit instead of claiming unsupported skills", () => {
    expect(LINGOZA_HSK_PARITY_GAPS).toEqual(["reading", "writing", "translation"]);
  });
});
