import type { AnswerEvaluation, GrammarFrame } from "../../content-schema/src/index.js";

export interface Normalizer {
  normalize(input: string): string;
}

const defaultNormalizer: Normalizer = {
  normalize(input) {
    return input.normalize("NFKC").trim().replace(/[\s。！？,.!?]+/g, "");
  }
};

function compilePattern(pattern: string, slots: Record<string, string[]>): RegExp {
  let source = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [slot, values] of Object.entries(slots)) {
    const token = `\\{${slot}\\}`;
    const alternatives = values
      .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    source = source.replace(new RegExp(token, "g"), `(?:${alternatives})`);
  }
  return new RegExp(`^${source}$`, "u");
}

export function evaluateAnswer(
  rawAnswer: string,
  frame: GrammarFrame,
  normalizer: Normalizer = defaultNormalizer
): AnswerEvaluation {
  const answer = normalizer.normalize(rawAnswer);
  const normalizedPatterns = frame.patterns.map((pattern) => normalizer.normalize(pattern));
  const normalizedSlots = Object.fromEntries(
    Object.entries(frame.slots).map(([key, values]) => [
      key,
      values.map((value) => normalizer.normalize(value))
    ])
  );

  let matchedPattern: string | undefined;
  for (const pattern of normalizedPatterns) {
    if (compilePattern(pattern, normalizedSlots).test(answer)) {
      matchedPattern = pattern;
      break;
    }
  }

  const missingSlots = Object.entries(normalizedSlots)
    .filter(([, values]) => !values.some((value) => answer.includes(value)))
    .map(([slot]) => slot);

  const slotCount = Object.keys(normalizedSlots).length;
  const slotScore = slotCount === 0 ? 1 : (slotCount - missingSlots.length) / slotCount;
  const patternMatched = Boolean(matchedPattern);
  const score = patternMatched ? 1 : Math.max(0, Math.min(0.95, slotScore * 0.75));

  const feedback = missingSlots.map(
    (slot) => frame.feedback?.[slot] ?? `Missing or unrecognized slot: ${slot}`
  );

  if (!patternMatched && missingSlots.length === 0) {
    feedback.push("The meaning components are present, but the sentence pattern is not yet accepted.");
  }

  return {
    score,
    intentMatched: patternMatched || slotScore >= 0.75,
    patternMatched,
    slotScore,
    matchedPattern,
    missingSlots,
    feedback
  };
}
