import type { DialogueScenario } from "../../content-schema/src/index.js";
export interface DialogueSession {
    scenarioId: string;
    stateId: string;
    history: Array<{
        stateId: string;
        intent: string;
    }>;
}
export declare function startDialogue(scenario: DialogueScenario): DialogueSession;
export declare function advanceDialogue(scenario: DialogueScenario, session: DialogueSession, intent: string): DialogueSession;
