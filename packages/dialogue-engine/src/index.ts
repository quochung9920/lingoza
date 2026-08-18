import type { DialogueScenario } from "../../content-schema/src/index.js";

export interface DialogueSession {
  scenarioId: string;
  stateId: string;
  history: Array<{ stateId: string; intent: string }>;
}

export function startDialogue(scenario: DialogueScenario): DialogueSession {
  return { scenarioId: scenario.id, stateId: scenario.initialState, history: [] };
}

export function advanceDialogue(
  scenario: DialogueScenario,
  session: DialogueSession,
  intent: string
): DialogueSession {
  const state = scenario.states.find((item) => item.id === session.stateId);
  if (!state) throw new Error(`Unknown dialogue state: ${session.stateId}`);
  if (!state.acceptedIntents.includes(intent)) {
    throw new Error(`Intent ${intent} is not accepted in state ${state.id}`);
  }
  const nextState = state.transitions[intent];
  if (!nextState) throw new Error(`No transition for intent ${intent} from ${state.id}`);
  return {
    ...session,
    stateId: nextState,
    history: [...session.history, { stateId: state.id, intent }]
  };
}
