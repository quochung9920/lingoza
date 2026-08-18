/**
 * v1 shapes retained for migration.
 *
 * These are the flat structures the original prototype used. They are still
 * exported so that adapters (and any consumer not yet migrated) keep
 * compiling, but no v2 engine consumes them and no new content should be
 * authored against them. `dialogue-engine` ships `toLegacyScenario` to project
 * a `DialogueScenarioV2` down onto `LegacyDialogueScenario`.
 */

/** @deprecated Use `DialogueStateV2`. */
export interface LegacyDialogueState {
  id: string;
  prompt: string;
  acceptedIntents: string[];
  transitions: Record<string, string>;
  terminal?: boolean;
}

/** @deprecated Use `DialogueScenarioV2`. */
export interface LegacyDialogueScenario {
  id: string;
  topic: string;
  initialState: string;
  states: LegacyDialogueState[];
}

/** @deprecated Use `LexicalItem`. */
export interface LegacyVocabularyEntry {
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
