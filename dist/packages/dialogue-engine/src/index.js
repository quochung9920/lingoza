export function startDialogue(scenario) {
    return { scenarioId: scenario.id, stateId: scenario.initialState, history: [] };
}
export function advanceDialogue(scenario, session, intent) {
    const state = scenario.states.find((item) => item.id === session.stateId);
    if (!state)
        throw new Error(`Unknown dialogue state: ${session.stateId}`);
    if (!state.acceptedIntents.includes(intent)) {
        throw new Error(`Intent ${intent} is not accepted in state ${state.id}`);
    }
    const nextState = state.transitions[intent];
    if (!nextState)
        throw new Error(`No transition for intent ${intent} from ${state.id}`);
    return {
        ...session,
        stateId: nextState,
        history: [...session.history, { stateId: state.id, intent }]
    };
}
