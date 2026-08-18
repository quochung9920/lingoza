import type {
  ContentId,
  DialogueScenarioV2,
  DialogueStateV2,
  LegacyDialogueScenario
} from "../../content-schema/src/index.js";

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

export function startDialogueV2(scenario: DialogueScenarioV2): DialogueSessionV2 {
  return {
    scenarioId: scenario.id,
    stateId: scenario.initialState,
    history: [],
    consecutiveFailures: 0,
    hintsRevealed: 0,
    completed: false
  };
}

export function currentState(
  scenario: DialogueScenarioV2,
  session: DialogueSessionV2
): DialogueStateV2 | undefined {
  return scenario.states.find((state) => state.id === session.stateId);
}

export type DialogueAdvanceOutcome =
  /** Intent accepted, moved to the next state. */
  | "advanced"
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
export function advanceDialogueV2(
  scenario: DialogueScenarioV2,
  session: DialogueSessionV2,
  intent: string,
  options: { score?: number; at?: string } = {}
): DialogueAdvanceResult {
  const state = currentState(scenario, session);
  if (!state) {
    throw new Error(`Unknown dialogue state: ${session.stateId} in ${scenario.id}`);
  }

  const accepted = state.acceptedIntents.some((option) => option.intent === intent);
  const nextStateId = state.transitions[intent];

  if (!accepted || !nextStateId) {
    const failures = session.consecutiveFailures + 1;

    if (failures >= scenario.maxFailuresBeforeRecovery && state.recoveryStateId) {
      const recovered: DialogueSessionV2 = {
        ...session,
        stateId: state.recoveryStateId,
        consecutiveFailures: 0,
        hintsRevealed: 0
      };
      return {
        outcome: "recovered",
        session: recovered,
        state: currentState(scenario, recovered)
      };
    }

    const hintsRevealed = Math.min(session.hintsRevealed + 1, state.hints.length);
    return {
      outcome: "rejected",
      session: { ...session, consecutiveFailures: failures, hintsRevealed },
      state,
      hint: state.hints[hintsRevealed - 1]
    };
  }

  const nextState = scenario.states.find((candidate) => candidate.id === nextStateId);
  if (!nextState) {
    throw new Error(`Dialogue ${scenario.id} transitions to unknown state ${nextStateId}`);
  }

  const advanced: DialogueSessionV2 = {
    ...session,
    stateId: nextState.id,
    consecutiveFailures: 0,
    hintsRevealed: 0,
    completed: nextState.terminal,
    history: [
      ...session.history,
      {
        stateId: state.id,
        intent,
        score: options.score ?? 1,
        at: options.at ?? new Date().toISOString()
      }
    ]
  };

  return {
    outcome: nextState.terminal ? "completed" : "advanced",
    session: advanced,
    state: nextState
  };
}

/** Mean turn score of a finished run. Feeds `conversation` mastery. */
export function conversationScore(session: DialogueSessionV2): number {
  if (session.history.length === 0) return 0;
  const total = session.history.reduce((sum, turn) => sum + turn.score, 0);
  return total / session.history.length;
}

/* ------------------------------------------------------------------ */
/* Graph analysis (used by the content validator)                      */
/* ------------------------------------------------------------------ */

/** State ids reachable from the initial state by following transitions. */
export function reachableStates(scenario: DialogueScenarioV2): Set<ContentId> {
  const reachable = new Set<ContentId>();
  const frontier = [scenario.initialState];

  while (frontier.length > 0) {
    const id = frontier.pop() as ContentId;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const state = scenario.states.find((candidate) => candidate.id === id);
    if (!state) continue;
    frontier.push(...Object.values(state.transitions));
    if (state.recoveryStateId) frontier.push(state.recoveryStateId);
  }

  return reachable;
}

/**
 * States that are neither terminal nor able to move anywhere: a learner
 * arriving here would be stuck with no way to finish the conversation.
 */
export function deadEndStates(scenario: DialogueScenarioV2): DialogueStateV2[] {
  return scenario.states.filter(
    (state) =>
      !state.terminal &&
      Object.keys(state.transitions).length === 0 &&
      !state.recoveryStateId
  );
}

/* ------------------------------------------------------------------ */
/* v1 compatibility                                                    */
/* ------------------------------------------------------------------ */

export interface DialogueSession {
  scenarioId: string;
  stateId: string;
  history: Array<{ stateId: string; intent: string }>;
}

/** @deprecated Use `startDialogueV2`. */
export function startDialogue(scenario: LegacyDialogueScenario): DialogueSession {
  return { scenarioId: scenario.id, stateId: scenario.initialState, history: [] };
}

/** @deprecated Use `advanceDialogueV2`, which reports failure instead of throwing. */
export function advanceDialogue(
  scenario: LegacyDialogueScenario,
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

/**
 * Projects a v2 scenario onto the flat v1 shape.
 *
 * Kept so the migration is verifiable: the v1 tests run against content that is
 * now authored in v2, which proves the new graph preserves the old transitions
 * rather than merely replacing them.
 */
export function toLegacyScenario(
  scenario: DialogueScenarioV2,
  promptResolver: (sentenceId: ContentId) => string
): LegacyDialogueScenario {
  return {
    id: scenario.id,
    topic: scenario.topics[0] ?? "",
    initialState: scenario.initialState,
    states: scenario.states.map((state) => ({
      id: state.id,
      prompt: state.npcLineSentenceId ? promptResolver(state.npcLineSentenceId) : "",
      acceptedIntents: state.acceptedIntents.map((option) => option.intent),
      transitions: { ...state.transitions },
      terminal: state.terminal
    }))
  };
}
