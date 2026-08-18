import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "../packages/evaluation-engine/src/index.js";
import { availableConcepts } from "../packages/curriculum-engine/src/index.js";
import { advanceDialogue, startDialogue } from "../packages/dialogue-engine/src/index.js";
import { scheduleReview } from "../packages/srs-engine/src/index.js";
import { concepts, orderDrinkFrame, restaurantDialogue } from "../language-packs/zh-CN/src/index.js";

/**
 * The original v1 suite, carried forward.
 *
 * Two things changed and both are deliberate. `orderDrinkFrame` and
 * `restaurantDialogue` are no longer hand-written constants -- they are now
 * *derived* from v2 content by `compilePatternToFrame` and `toLegacyScenario`,
 * so these assertions verify that the migration preserved behaviour rather
 * than merely replacing it. And `availableConcepts` now reads the v2 `requires`
 * graph, in which `restaurant.order` genuinely depends on four concepts rather
 * than one, so the unlock test supplies all four.
 */
describe("model-free language engine", () => {
  it("accepts natural Chinese variants through grammar frames", () => {
    expect(evaluateAnswer("我要一杯咖啡。", orderDrinkFrame).score).toBe(1);
    expect(evaluateAnswer("我想要一杯茶", orderDrinkFrame).patternMatched).toBe(true);
    expect(evaluateAnswer("我想喝一杯咖啡", orderDrinkFrame).intentMatched).toBe(true);
  });

  it("gives structured feedback for missing language components", () => {
    const result = evaluateAnswer("我要咖啡", orderDrinkFrame);
    expect(result.patternMatched).toBe(false);
    expect(result.missingSlots).toContain("classifier");
    expect(result.score).toBeLessThan(1);
  });

  it("unlocks concepts only when prerequisites are mastered", () => {
    const mastered = (conceptId: string) => ({
      conceptId,
      skills: { listeningRecognition: 0.9, meaningRecognition: 0.8, speaking: 0.8 }
    });

    const partiallyReady = availableConcepts(concepts, [mastered("greeting.basic")]);
    expect(partiallyReady.some((concept) => concept.id === "restaurant.order")).toBe(false);
    expect(partiallyReady.some((concept) => concept.id === "intro.name")).toBe(true);

    const fullyReady = availableConcepts(concepts, [
      mastered("greeting.basic"),
      mastered("want.basic"),
      mastered("beverage.basic"),
      mastered("classifier.cup")
    ]);
    expect(fullyReady.some((concept) => concept.id === "restaurant.order")).toBe(true);
  });

  it("moves through deterministic dialogue states", () => {
    const session = startDialogue(restaurantDialogue);
    const next = advanceDialogue(restaurantDialogue, session, "restaurant.order.drink");
    expect(next.stateId).toBe("confirm");
  });

  it("schedules review without an AI model", () => {
    const next = scheduleReview({ intervalDays: 2, ease: 2.5, repetitions: 1 }, "good");
    expect(next.intervalDays).toBe(5);
    expect(next.repetitions).toBe(2);
  });
});
