import type { ContentId, LanguageTag, LocalizedText, Provenance } from "./common.js";
import type { LingozaLevel } from "./taxonomy.js";

/**
 * A speaking character in a scenario. `role` is the machine key the role-play
 * activity refers to; `name`/`avatar` are presentation.
 */
export interface DialogueRole {
  role: string;
  name: LocalizedText;
  /** Emoji or asset token. Presentation only. */
  avatar?: string;
}

/**
 * Something the learner can mean at a given point in a conversation. In
 * model-free mode the learner *selects* an intent (or speaks and self-checks
 * against it); a future SpeechRecognitionProvider can resolve it from audio
 * without any change to the state machine.
 */
export interface DialogueIntentOption {
  intent: string;
  /** Gloss shown on the choice card, in the learner's language. */
  label: LocalizedText;
  /** Sentence the learner is expected to produce for this intent. */
  sentenceId: ContentId;
  /** Pattern used to check a spoken/typed-free attempt deterministically. */
  patternId?: ContentId;
}

/**
 * One node of the conversation.
 *
 * `npcLine` is what the other party says on entering the state. When
 * `learnerTurn` is true the engine waits for an intent; `transitions` maps
 * intent -> next state id. `recoveryStateId` is where the engine goes when the
 * learner fails repeatedly, so a role-play can never dead-end.
 */
export interface DialogueStateV2 {
  id: ContentId;
  /** Which role speaks the `npcLine`. Omitted for pure learner-turn states. */
  speakerRole?: string;
  /** Sentence id of the other party's line. Always has audio. */
  npcLineSentenceId?: ContentId;
  learnerTurn: boolean;
  /** Intents accepted here, in display order. */
  acceptedIntents: DialogueIntentOption[];
  /** Intent id -> next state id. Must cover every accepted intent. */
  transitions: Record<string, ContentId>;
  /** Progressive hints, revealed one at a time on request. */
  hints: LocalizedText[];
  /** Where to go after repeated failure. Must itself be reachable forward. */
  recoveryStateId?: ContentId;
  terminal: boolean;
}

/**
 * Deterministic conversation graph. No free-speech understanding is implied:
 * the engine only ever moves on an intent the content author declared.
 */
export interface DialogueScenarioV2 {
  id: ContentId;
  language: LanguageTag;
  title: LocalizedText;
  /** Scene description shown above the transcript. */
  setting: LocalizedText;
  level: LingozaLevel;
  topics: ContentId[];
  roles: DialogueRole[];
  /** Role the learner performs by default. */
  learnerRole: string;
  initialState: ContentId;
  states: DialogueStateV2[];
  /** Concepts a completed run gives evidence for. */
  conceptIds: ContentId[];
  /** Max consecutive failures before routing to `recoveryStateId`. */
  maxFailuresBeforeRecovery: number;
  provenance: Provenance;
}
