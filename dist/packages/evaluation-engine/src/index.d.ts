import type { AnswerEvaluation, GrammarFrame } from "../../content-schema/src/index.js";
export interface Normalizer {
    normalize(input: string): string;
}
export declare function evaluateAnswer(rawAnswer: string, frame: GrammarFrame, normalizer?: Normalizer): AnswerEvaluation;
