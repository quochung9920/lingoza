import type { AnswerEvaluation, GrammarFrame, LexicalItem, SyntaxPattern, UiLocale } from "../../content-schema/src/index.js";
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
export declare const defaultNormalizer: Normalizer;
/**
 * Matches `rawAnswer` against every template in `frame`.
 *
 * Scoring is intentionally blunt: a full template match is 1, anything else is
 * capped at 0.95 and scaled by how many slots were even present. That gap
 * matters -- it stops a learner who produced all the right words in the wrong
 * order from being told they were right.
 */
export declare function evaluateAnswer(rawAnswer: string, frame: GrammarFrame, normalizer?: Normalizer): AnswerEvaluation;
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
export declare function compilePatternToFrame(pattern: SyntaxPattern, lexicalItems: readonly LexicalItem[], options: CompileOptions): GrammarFrame;
/**
 * Renders one concrete sentence from a pattern by filling each slot with the
 * given surface forms. Used to generate substitution-drill rounds instead of
 * hand-authoring every permutation.
 */
export declare function realizePattern(pattern: SyntaxPattern, fillers: Record<string, string>, templateIndex?: number): string;
/**
 * Scores a multiple-choice response. Trivial, but it lives here so that every
 * activity type produces a `0..1` score through the same module and the
 * mastery engine has exactly one input contract.
 */
export declare function evaluateChoice(selectedIndex: number, correctIndex: number): number;
