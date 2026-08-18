import type { ContentId, LanguageTag } from "./common.js";

/**
 * The *compiled*, runtime form of a `SyntaxPattern`.
 *
 * A `SyntaxPattern` is authored against lexical item ids so the content stays
 * normalised; `compilePatternToFrame` (in `evaluation-engine`) resolves those
 * ids to concrete surface strings and produces this flat, self-contained
 * frame. Keeping the two apart is what lets the matcher stay a pure function
 * with no bundle lookups -- and it is the same shape the v1 evaluator used, so
 * the existing deterministic matcher carried over unchanged.
 */
export interface GrammarFrame {
  id: ContentId;
  language: LanguageTag;
  intent: string;
  /** Templates with `{slot}` placeholders. */
  patterns: string[];
  /** Slot name -> accepted surface forms. */
  slots: Record<string, string[]>;
  /** Slot name -> hint shown when that slot is missing. */
  feedback?: Record<string, string>;
}

/**
 * Result of matching a learner attempt against a frame.
 *
 * `score` is normalized 0..1. A full pattern match scores 1; a partial match
 * is capped below 1 so "all the right words in the wrong order" never reads as
 * correct.
 */
export interface AnswerEvaluation {
  score: number;
  intentMatched: boolean;
  patternMatched: boolean;
  slotScore: number;
  matchedPattern?: string;
  missingSlots: string[];
  feedback: string[];
}
