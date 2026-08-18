import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "../packages/evaluation-engine/src/index.js";
import { availableConcepts } from "../packages/curriculum-engine/src/index.js";
import { advanceDialogue, startDialogue } from "../packages/dialogue-engine/src/index.js";
import { scheduleReview } from "../packages/srs-engine/src/index.js";
import { concepts, orderDrinkFrame, restaurantDialogue } from "../language-packs/zh-CN/src/index.js";
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
        const unlocked = availableConcepts(concepts, [
            {
                conceptId: "greeting.basic",
                skills: { recognition: 0.9, listening: 0.8, production: 0.8 }
            }
        ]);
        expect(unlocked.some((concept) => concept.id === "restaurant.order")).toBe(true);
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
