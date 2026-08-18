export type ProficiencyLevel = "pre-a1" | "a1" | "a2" | "b1" | "b2" | "c1" | "c2";
export type Skill = "recognition" | "meaning" | "reading" | "listening" | "production" | "grammar" | "spelling" | "pronunciation" | "conversation";

export interface Concept {
  id: string;
  title: string;
  topic: string;
  level: ProficiencyLevel;
  prerequisites: string[];
  skills: Skill[];
}

export interface VocabularyEntry {
  id: string;
  language: string;
  surface: string;
  reading?: string;
  partOfSpeech: string;
  meanings: string[];
  topics: string[];
  collocations?: string[];
  metadata?: Record<string, unknown>;
}

export interface GrammarFrame {
  id: string;
  language: string;
  intent: string;
  patterns: string[];
  slots: Record<string, string[]>;
  feedback?: Record<string, string>;
}

export interface AnswerEvaluation {
  score: number;
  intentMatched: boolean;
  patternMatched: boolean;
  slotScore: number;
  matchedPattern?: string;
  missingSlots: string[];
  feedback: string[];
}

export interface DialogueState {
  id: string;
  prompt: string;
  acceptedIntents: string[];
  transitions: Record<string, string>;
  terminal?: boolean;
}

export interface DialogueScenario {
  id: string;
  topic: string;
  initialState: string;
  states: DialogueState[];
}
