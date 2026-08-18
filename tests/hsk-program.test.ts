import { describe, expect, it } from "vitest";

import { chineseBundle, hskProgram } from "../language-packs/zh-CN/src/index.js";

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

  it("does not claim unfinished bands are available", () => {
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
});
