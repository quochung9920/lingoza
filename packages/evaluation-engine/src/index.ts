import type {
  AnswerEvaluation,
  ContentId,
  GrammarFrame,
  LexicalItem,
  SyntaxPattern,
  UiLocale
} from "../../content-schema/src/index.js";

/**
 * `@lingoza/evaluation-engine` -- deterministic checking of a learner's
 * production against an authored sentence pattern.
 *
 * There is no model here and there never will be. Everything is regex
 * compilation over author-declared slot fillers, which means the same input
 * always produces the same feedback and the whole thing runs offline.
 */

export interface Normalizer {
  normalize(input: string): string;
}

/**
 * Strips punctuation and whitespace and applies NFKC so that full-width and
 * half-width forms compare equal. Deliberately does *not* lowercase: some
 * writing systems carry meaning in case, and packs can supply their own.
 */
export const defaultNormalizer: Normalizer = {
  normalize(input) {
    return input.normalize("NFKC").trim().replace(/[\s。！？，、,.!?]+/g, "");
  }
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePattern(pattern: string, slots: Record<string, string[]>): RegExp {
  const placeholder = /\{([a-zA-Z0-9_-]+)\}/g;
  let source = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholder.exec(pattern)) !== null) {
    source += escapeRegex(pattern.slice(cursor, match.index));
    const slotName = match[1];
    const values = slots[slotName];
    if (!values || values.length === 0) {
      throw new Error(`Grammar pattern references undefined slot: ${slotName}`);
    }
    source += `(?:${values.map(escapeRegex).join("|")})`;
    cursor = match.index + match[0].length;
  }

  source += escapeRegex(pattern.slice(cursor));
  return new RegExp(`^${source}$`, "u");
}

/**
 * Matches `rawAnswer` against every template in `frame`.
 *
 * Scoring is intentionally blunt: a full template match is 1, anything else is
 * capped at 0.95 and scaled by how many slots were even present. That gap
 * matters -- it stops a learner who produced all the right words in the wrong
 * order from being told they were right.
 */
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
    feedback.push(
      "The meaning components are present, but the sentence pattern is not yet accepted."
    );
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

/* ------------------------------------------------------------------ */
/* Pattern -> frame compilation                                        */
/* ------------------------------------------------------------------ */

export interface CompileOptions {
  /** Locale used for slot hint text in the resulting frame's `feedback`. */
  locale: UiLocale;
}

/**
 * Resolves a normalised `SyntaxPattern` into a flat `GrammarFrame`.
 *
 * Slots are authored as lexical item ids so that a word's surface form lives
 * in exactly one place; this walks those ids into concrete strings. Optional
 * slots compile with an extra empty alternative so a template matches whether
 * or not the learner supplied them.
 */
export function compilePatternToFrame(
  pattern: SyntaxPattern,
  lexicalItems: readonly LexicalItem[],
  options: CompileOptions
): GrammarFrame {
  const byId = new Map<ContentId, LexicalItem>(lexicalItems.map((item) => [item.id, item]));
  const slots: Record<string, string[]> = {};
  const feedback: Record<string, string> = {};

  for (const slot of pattern.slots) {
    const surfaces = new Set<string>(slot.acceptedSurfaces);
    for (const itemId of slot.acceptedItemIds) {
      const item = byId.get(itemId);
      if (!item) {
        throw new Error(
          `Pattern ${pattern.id} slot "${slot.name}" references unknown lexical item ${itemId}`
        );
      }
      surfaces.add(item.text);
    }
    if (slot.optional) surfaces.add("");
    if (surfaces.size === 0) {
      throw new Error(`Pattern ${pattern.id} slot "${slot.name}" has no accepted fillers`);
    }
    // Longest first: otherwise a short filler can shadow a longer one that
    // starts with the same characters when alternatives are tried in order.
    slots[slot.name] = [...surfaces].sort((a, b) => b.length - a.length);
    feedback[slot.name] = slot.hint[options.locale] ?? Object.values(slot.hint)[0] ?? slot.name;
  }

  return {
    id: pattern.id,
    language: pattern.language,
    intent: pattern.intent,
    patterns: pattern.templates,
    slots,
    feedback
  };
}

/**
 * Renders one concrete sentence from a pattern by filling each slot with the
 * given surface forms. Used to generate substitution-drill rounds instead of
 * hand-authoring every permutation.
 */
export function realizePattern(
  pattern: SyntaxPattern,
  fillers: Record<string, string>,
  templateIndex = 0
): string {
  const template = pattern.templates[templateIndex];
  if (!template) {
    throw new Error(`Pattern ${pattern.id} has no template at index ${templateIndex}`);
  }
  return template.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_match, slotName: string) => {
    const filler = fillers[slotName];
    if (filler === undefined) {
      const slot = pattern.slots.find((candidate) => candidate.name === slotName);
      if (slot?.optional) return "";
      throw new Error(`No filler supplied for required slot "${slotName}" of ${pattern.id}`);
    }
    return filler;
  });
}

/**
 * Scores a multiple-choice response. Trivial, but it lives here so that every
 * activity type produces a `0..1` score through the same module and the
 * mastery engine has exactly one input contract.
 */
export function evaluateChoice(selectedIndex: number, correctIndex: number): number {
  return selectedIndex === correctIndex ? 1 : 0;
}
