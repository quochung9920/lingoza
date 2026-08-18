import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ContentId,
  DialogueScenarioV2,
  DialogueStateV2
} from "../../../../packages/content-schema/src/index";
import {
  advanceDialogueV2,
  conversationScore,
  currentState,
  startDialogueV2,
  type DialogueSessionV2
} from "../../../../packages/dialogue-engine/src/index";
import { useAudio } from "../app/audio-provider";
import { useContent } from "../app/content-provider";
import { ct, t } from "../lib/i18n";
import { SentenceText } from "./audio";
import { Card, FeedbackPanel, PrimaryButton, SecondaryButton } from "./primitives";
import { RecorderPanel } from "./speaking";

/**
 * Runs a scenario against the deterministic dialogue engine.
 *
 * The learner picks *what they mean* from the intents the author declared,
 * then says the line and hears themselves back. That ordering is the honest
 * one for a model-free product: Lingoza cannot know what was said, so it never
 * pretends to -- it knows what the learner set out to say, and it can measure
 * how they said it.
 *
 * Shared by the `ROLE_PLAY` activity and the standalone conversation screen so
 * a role-play behaves identically wherever it is entered from.
 */

interface TranscriptEntry {
  id: string;
  role: "npc" | "learner";
  sentenceId: ContentId;
  speakerLabel: string;
}

export function DialogueRunner({
  scenario,
  mode,
  onFinished
}: {
  scenario: DialogueScenarioV2;
  /** `listen-through` plays the scripted path with no microphone. */
  mode: "listen-through" | "role-play";
  onFinished: (score: number) => void;
}) {
  const content = useContent();
  const { manager } = useAudio();

  const [session, setSession] = useState<DialogueSessionV2>(() => startDialogueV2(scenario));
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const state = currentState(scenario, session);

  const labelFor = useCallback(
    (roleId: string | undefined) => {
      const role = scenario.roles.find((candidate) => candidate.role === roleId);
      return role ? t(role.name) : "";
    },
    [scenario]
  );

  const avatarFor = useCallback(
    (roleId: string | undefined) =>
      scenario.roles.find((candidate) => candidate.role === roleId)?.avatar ?? "🙂",
    [scenario]
  );

  /* Append the NPC line whenever we enter a state that has one. */
  useEffect(() => {
    if (!state?.npcLineSentenceId) return;
    const entryId = `${state.id}:${transcript.length}`;
    setTranscript((previous) => {
      const last = previous[previous.length - 1];
      if (last?.role === "npc" && last.sentenceId === state.npcLineSentenceId) return previous;
      return [
        ...previous,
        {
          id: entryId,
          role: "npc",
          sentenceId: state.npcLineSentenceId as ContentId,
          speakerLabel: labelFor(state.speakerRole)
        }
      ];
    });

    const sentence = content.sentence(state.npcLineSentenceId);
    if (sentence) {
      void manager.play({ ownerId: sentence.id, asset: sentence.audio });
    }
    // Only re-run when the conversation actually moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.id]);

  const applyIntent = useCallback(
    (intent: string, score: number) => {
      const option = state?.acceptedIntents.find((candidate) => candidate.intent === intent);
      if (option) {
        setTranscript((previous) => [
          ...previous,
          {
            id: `${option.intent}:${previous.length}`,
            role: "learner",
            sentenceId: option.sentenceId,
            speakerLabel: labelFor(scenario.learnerRole)
          }
        ]);
      }

      const result = advanceDialogueV2(scenario, session, intent, { score });
      setSession(result.session);
      setSelectedIntent(null);
      setHint(null);

      if (result.outcome === "completed") {
        onFinished(conversationScore(result.session));
      }
    },
    [state, scenario, session, labelFor, onFinished]
  );

  /* Listen-through: walk the first declared intent at each turn, no mic. */
  const advanceListenThrough = useCallback(() => {
    if (!state) return;
    if (state.terminal) {
      onFinished(1);
      return;
    }
    const first = state.acceptedIntents[0];
    if (first) applyIntent(first.intent, 1);
  }, [state, applyIntent, onFinished]);

  const activeOption = useMemo(
    () => state?.acceptedIntents.find((option) => option.intent === selectedIntent) ?? null,
    [state, selectedIntent]
  );
  const targetSentence = activeOption ? content.sentence(activeOption.sentenceId) : undefined;

  if (!state) return null;

  return (
    <div className="lz-stack">
      <p className="lz-eyebrow">
        {t(scenario.title)} · {mode === "role-play" ? "ROLE PLAY" : "NGHE"}
      </p>

      <div className="lz-stack">
        {transcript.map((entry) => {
          const sentence = content.sentence(entry.sentenceId);
          return (
            <div
              key={entry.id}
              className={`lz-bubble${entry.role === "learner" ? " lz-bubble--learner" : ""}`}
            >
              <span className="lz-bubble__avatar" aria-hidden="true">
                {entry.role === "learner"
                  ? avatarFor(scenario.learnerRole)
                  : avatarFor(state.speakerRole)}
              </span>
              <div className="lz-bubble__body">
                <span className="lz-bubble__speaker">{entry.speakerLabel}</span>
                <SentenceText sentence={sentence} size="sm" />
              </div>
            </div>
          );
        })}
      </div>

      {state.terminal ? (
        <div className="lz-stack">
          <FeedbackPanel tone="positive" title={ct("conversation.finished")} />
          <PrimaryButton onClick={() => onFinished(conversationScore(session) || 1)}>
            {ct("common.continue")}
          </PrimaryButton>
        </div>
      ) : mode === "listen-through" ? (
        <PrimaryButton onClick={advanceListenThrough}>{ct("common.continue")}</PrimaryButton>
      ) : (
        <LearnerTurn
          state={state}
          selectedIntent={selectedIntent}
          onSelectIntent={setSelectedIntent}
          hint={hint}
          onRequestHint={() =>
            setHint(t(state.hints[Math.min(session.hintsRevealed, state.hints.length - 1)]))
          }
          targetSentenceId={targetSentence?.id}
          targetText={targetSentence?.text ?? ""}
          targetAsset={targetSentence?.audio}
          onSpoken={(score) => activeOption && applyIntent(activeOption.intent, score)}
        />
      )}
    </div>
  );
}

function LearnerTurn({
  state,
  selectedIntent,
  onSelectIntent,
  hint,
  onRequestHint,
  targetSentenceId,
  targetText,
  targetAsset,
  onSpoken
}: {
  state: DialogueStateV2;
  selectedIntent: string | null;
  onSelectIntent: (intent: string) => void;
  hint: string | null;
  onRequestHint: () => void;
  targetSentenceId: ContentId | undefined;
  targetText: string;
  targetAsset: Parameters<typeof RecorderPanel>[0]["targetAsset"];
  onSpoken: (score: number) => void;
}) {
  const content = useContent();

  if (!selectedIntent) {
    return (
      <Card variant="muted">
        <p className="lz-eyebrow" style={{ marginBottom: 12 }}>
          {ct("conversation.yourTurn")} · {ct("conversation.chooseIntent")}
        </p>
        <div className="lz-stack lz-stack--tight">
          {state.acceptedIntents.map((option) => (
            <button
              key={option.intent}
              type="button"
              className="lz-choice"
              onClick={() => onSelectIntent(option.intent)}
            >
              <span className="lz-choice__body">💬 {t(option.label)}</span>
            </button>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="lz-stack">
      <Card variant="muted">
        <p className="lz-eyebrow" style={{ marginBottom: 10 }}>
          {ct("conversation.yourTurn")}
        </p>
        <SentenceText sentence={targetSentenceId ? content.sentence(targetSentenceId) : undefined} />
      </Card>

      {hint ? <FeedbackPanel tone="neutral" title={ct("hint.label")}>{hint}</FeedbackPanel> : null}

      {targetSentenceId ? (
        <RecorderPanel
          targetId={targetSentenceId}
          targetText={targetText}
          targetAsset={targetAsset}
          onComplete={onSpoken}
        />
      ) : null}

      {state.hints.length > 0 && !hint ? (
        <SecondaryButton block onClick={onRequestHint}>
          💡 {ct("hint.show")}
        </SecondaryButton>
      ) : null}
    </div>
  );
}
