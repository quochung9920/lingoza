import type { ContentId, DialogueScenarioV2, DialogueStateV2, LegacyDialogueScenario } from "../../content-schema/src/index.js";
/**
 * `@lingoza/dialogue-engine` -- a deterministic conversation state machine.
 *
 * The engine never guesses what the learner said. It advances only on an
 * intent that the content author declared for the current state, which the app
 * supplies either from an intent choice or from a spoken attempt checked
 * against that intent's pattern by `evaluation-engine`. When a real
 * `SpeechRecognitionProvider` arrives it becomes another way to produce that
 * same intent -- no change here.
 */
export interface DialogueTurnRecord {
    stateId: ContentId;
    intent: string;
    /** Normalized score of the learner's production for this turn. */
    score: number;
    at: string;
}
export interface DialogueSessionV2 {
    scenarioId: ContentId;
    stateId: ContentId;
    history: DialogueTurnRecord[];
    /** Consecutive rejected attempts in the current state. */
    consecutiveFailures: number;
    /** Hints revealed in the current state, so hint level never resets mid-turn. */
    hintsRevealed: number;
    completed: boolean;
}
export declare function startDialogueV2(scenario: DialogueScenarioV2): DialogueSessionV2;
export declare function currentState(scenario: DialogueScenarioV2, session: DialogueSessionV2): DialogueStateV2 | undefined;
export type DialogueAdvanceOutcome = 
/** Intent accepted, moved to the next state. */
"advanced"
/** Intent accepted and the conversation is over. */
 | "completed"
/** Intent not accepted here; stay put and offer another hint. */
 | "rejected"
/** Too many failures; routed to the scenario's recovery state. */
 | "recovered";
export interface DialogueAdvanceResult {
    outcome: DialogueAdvanceOutcome;
    session: DialogueSessionV2;
    /** State the learner is now in. */
    state: DialogueStateV2 | undefined;
    /** Next hint to surface after a rejection, if the author supplied one. */
    hint?: DialogueStateV2["hints"][number];
}
/**
 * Applies an intent to the session.
 *
 * Unlike the v1 helper this never throws on an unexpected intent. A learner
 * saying the wrong thing is ordinary conversation, not an exception -- the
 * engine returns `rejected` with the next hint, and after
 * `maxFailuresBeforeRecovery` attempts routes to the recovery state so a
 * role-play can never strand the learner.
 */
export declare function advanceDialogueV2(scenario: DialogueScenarioV2, session: DialogueSessionV2, intent: string, options?: {
    score?: number;
    at?: string;
}): DialogueAdvanceResult;
/** Mean turn score of a finished run. Feeds `conversation` mastery. */
export declare function conversationScore(session: DialogueSessionV2): number;
/** State ids reachable from the initial state by following transitions. */
export declare function reachableStates(scenario: DialogueScenarioV2): Set<ContentId>;
/**
 * States that are neither terminal nor able to move anywhere: a learner
 * arriving here would be stuck with no way to finish the conversation.
 */
export declare function deadEndStates(scenario: DialogueScenarioV2): DialogueStateV2[];
export interface DialogueSession {
    scenarioId: string;
    stateId: string;
    history: Array<{
        stateId: string;
        intent: string;
    }>;
}
/** @deprecated Use `startDialogueV2`. */
export declare function startDialogue(scenario: LegacyDialogueScenario): DialogueSession;
/** @deprecated Use `advanceDialogueV2`, which reports failure instead of throwing. */
export declare function advanceDialogue(scenario: LegacyDialogueScenario, session: DialogueSession, intent: string): DialogueSession;
/**
 * Projects a v2 scenario onto the flat v1 shape.
 *
 * Kept so the migration is verifiable: the v1 tests run against content that is
 * now authored in v2, which proves the new graph preserves the old transitions
 * rather than merely replacing them.
 */
export declare function toLegacyScenario(scenario: DialogueScenarioV2, promptResolver: (sentenceId: ContentId) => string): LegacyDialogueScenario;
