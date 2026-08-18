import { describe, expect, it } from "vitest";

import {
  HybridSpeechEvaluator,
  normalizeSpeechText,
  speechTextSimilarity,
  type AudioFeatures
} from "../packages/pronunciation-engine/src/index.js";

const features = (durationMs = 1000): AudioFeatures => ({
  pitchHz: [120, 130, 140, 150, 145, 135],
  energy: [0.2, 0.6, 0.9, 0.8, 0.5, 0.2],
  frameMs: 20,
  durationMs
});

describe("hybrid pronunciation verification", () => {
  it("normalizes punctuation and whitespace before matching Chinese text", () => {
    expect(normalizeSpeechText(" 我要一杯咖啡。 ")).toBe("我要一杯咖啡");
    expect(speechTextSimilarity("我要一杯咖啡。", "我要一杯咖啡")).toBe(1);
  });

  it("separates content match from prosody scoring", () => {
    const evaluator = new HybridSpeechEvaluator();
    const evaluation = evaluator.evaluate({
      reference: features(),
      learner: features(),
      tonal: true,
      recognition: {
        expectedText: "我要一杯咖啡。",
        recognizedText: "我要一杯茶。",
        confidence: 0.92,
        providerId: "test-recognizer"
      }
    });

    const content = evaluation.metrics.find((metric) => metric.id === "contentMatch");
    expect(content).toBeDefined();
    expect(content?.value).toBeLessThan(0.9);
    expect(evaluation.verification.content).toBe("mismatch");
    expect(evaluation.verification.pronunciation).toBe("prosody-only");
  });

  it("only calls pronunciation phoneme-verified when real unit evidence is supplied", () => {
    const evaluator = new HybridSpeechEvaluator();
    const evaluation = evaluator.evaluate({
      reference: features(),
      learner: features(),
      tonal: true,
      recognition: {
        expectedText: "你好",
        recognizedText: "你好",
        providerId: "test-recognizer"
      },
      phonemes: {
        providerId: "test-aligner",
        units: [
          { expected: "n", observed: "n", score: 0.96 },
          { expected: "i", observed: "i", score: 0.91 },
          { expected: "h", observed: "h", score: 0.88 },
          { expected: "ao", observed: "ao", score: 0.93 }
        ]
      }
    });

    expect(evaluation.verification.content).toBe("matched");
    expect(evaluation.verification.pronunciation).toBe("phoneme-verified");
    expect(evaluation.metrics.find((metric) => metric.id === "phonemeAccuracy")?.value).toBeGreaterThan(0.9);
  });
});
