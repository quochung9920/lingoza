import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  Activity,
  AssessmentResponse,
  ContentId,
  ExampleSentence,
  LocalizedText
} from "../../../../packages/content-schema/src/index";
import { evaluateChoice } from "../../../../packages/evaluation-engine/src/index";
import { scoreAssessment, selectItems } from "../../../../packages/assessment-engine/src/index";
import { useAudio } from "../app/audio-provider";
import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import { AudioControls, ItemText, SentenceText } from "../components/audio";
import { DialogueRunner } from "../components/dialogue-runner";
import {
  BottomSheet,
  Card,
  EmptyState,
  FeedbackPanel,
  PrimaryButton,
  SecondaryButton
} from "../components/primitives";
import { RecorderPanel } from "../components/speaking";
import { ct, t } from "../lib/i18n";

/**
 * Renders one activity and reports a normalized score when it finishes.
 *
 * Every branch ends in exactly one call to `onComplete(score)`; the lesson
 * player owns sequencing and the mastery engine owns what the score means.
 * Keeping scoring out of here is what stops each activity type inventing its
 * own idea of "good".
 *
 * Notice what is absent: there is no text input anywhere in this file. Where a
 * learner would type in another product, they either speak or choose.
 */

export interface ActivityViewProps {
  activity: Activity;
  onComplete: (score: number) => void;
}

export function ActivityView({ activity, onComplete }: ActivityViewProps) {
  switch (activity.kind) {
    case "LISTEN_UNDERSTAND":
      return (
        <ChoiceActivity
          promptSentenceId={activity.sentenceId}
          choices={activity.choices}
          correctIndex={activity.correctChoiceIndex}
          onComplete={onComplete}
        />
      );
    case "LISTEN_CHOOSE":
      return <ListenChooseView activity={activity} onComplete={onComplete} />;
    case "LISTEN_REPEAT":
      return <ListenRepeatView activity={activity} onComplete={onComplete} />;
    case "SHADOWING":
      return <ShadowingView activity={activity} onComplete={onComplete} />;
    case "PRONUNCIATION_DRILL":
      return <PronunciationDrillView activity={activity} onComplete={onComplete} />;
    case "QUICK_RESPONSE":
      return <QuickResponseView activity={activity} onComplete={onComplete} />;
    case "GUIDED_SPEAKING":
      return <GuidedSpeakingView activity={activity} onComplete={onComplete} />;
    case "SUBSTITUTION_DRILL":
      return <SubstitutionDrillView activity={activity} onComplete={onComplete} />;
    case "DIALOGUE":
    case "ROLE_PLAY":
      return <ScenarioView activity={activity} onComplete={onComplete} />;
    case "LISTENING_CHALLENGE":
      return <ListeningChallengeView activity={activity} onComplete={onComplete} />;
    case "VOCABULARY_REVIEW":
      return <VocabularyReviewView activity={activity} onComplete={onComplete} />;
    case "PATTERN_REVIEW":
      return <PatternReviewView activity={activity} onComplete={onComplete} />;
    case "UNIT_CHECKPOINT":
    case "LEVEL_ASSESSMENT":
      return <AssessmentView activity={activity} onComplete={onComplete} />;
    default:
      return <EmptyState title="Hoạt động chưa hỗ trợ" />;
  }
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** Plays a sentence once on mount, unless the learner turned autoplay off. */
function useAutoplay(sentence: ExampleSentence | undefined) {
  const { manager } = useAudio();
  const { snapshot } = useLearner();
  const autoplay = snapshot.profile.preferences.autoplayAudio;
  const slow = snapshot.profile.preferences.preferSlowAudio;

  useEffect(() => {
    if (!sentence || !autoplay) return;
    void manager.play({
      ownerId: sentence.id,
      asset: sentence.audio,
      speed: slow ? "slow" : "normal"
    });
  }, [sentence, autoplay, slow, manager]);
}

function ListenGlyph() {
  return (
    <span className="lz-player__glyph" aria-hidden="true">
      🎧
    </span>
  );
}

/**
 * Multiple choice over meanings in the learner's language.
 *
 * The verdict is shown, then the learner taps on. Auto-advancing on a correct
 * answer would rush past the one moment they are actually looking at the
 * feedback.
 */
function ChoiceActivity({
  promptSentenceId,
  choices,
  correctIndex,
  onComplete
}: {
  promptSentenceId: ContentId;
  choices: LocalizedText[];
  correctIndex: number;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const sentence = content.sentence(promptSentenceId);
  const [chosen, setChosen] = useState<number | null>(null);
  useAutoplay(sentence);

  const score = chosen === null ? 0 : evaluateChoice(chosen, correctIndex);

  return (
    <div className="lz-stack">
      <div className="lz-player__prompt">
        <ListenGlyph />
        {sentence ? (
          <>
            <SentenceText sentence={sentence} size="lg" forceSupport={chosen !== null} />
            <AudioControls
              ownerId={sentence.id}
              asset={sentence.audio}
              text={sentence.text}
            />
          </>
        ) : null}
      </div>

      <div className="lz-stack lz-stack--tight">
        {choices.map((choice, index) => (
          <button
            key={index}
            type="button"
            className="lz-choice"
            disabled={chosen !== null}
            data-verdict={
              chosen === null
                ? undefined
                : index === correctIndex
                  ? "correct"
                  : index === chosen
                    ? "incorrect"
                    : undefined
            }
            onClick={() => setChosen(index)}
          >
            <span className="lz-choice__body">{t(choice)}</span>
          </button>
        ))}
      </div>

      {chosen !== null ? (
        <PrimaryButton onClick={() => onComplete(score)}>{ct("common.continue")}</PrimaryButton>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Listening                                                           */
/* ------------------------------------------------------------------ */

function ListenChooseView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "LISTEN_CHOOSE" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const sentence = content.sentence(activity.promptSentenceId);
  const [chosen, setChosen] = useState<ContentId | null>(null);
  useAutoplay(sentence);

  return (
    <div className="lz-stack">
      <div className="lz-player__prompt">
        <ListenGlyph />
        {sentence ? (
          <AudioControls ownerId={sentence.id} asset={sentence.audio} text={sentence.text} />
        ) : null}
      </div>

      <div className="lz-stack lz-stack--tight">
        {activity.optionItemIds.map((itemId) => {
          const item = content.item(itemId);
          if (!item) return null;
          return (
            <div
              key={itemId}
              className="lz-choice"
              data-verdict={
                chosen === null
                  ? undefined
                  : itemId === activity.correctItemId
                    ? "correct"
                    : itemId === chosen
                      ? "incorrect"
                      : undefined
              }
            >
              {/* Each option is itself playable: choosing between spoken forms
                  requires hearing them, not reading them. */}
              <span className="lz-choice__body">
                <ItemText item={item} size="sm" />
              </span>
              <SecondaryButton disabled={chosen !== null} onClick={() => setChosen(itemId)}>
                Chọn
              </SecondaryButton>
            </div>
          );
        })}
      </div>

      {chosen !== null ? (
        <PrimaryButton onClick={() => onComplete(chosen === activity.correctItemId ? 1 : 0)}>
          {ct("common.continue")}
        </PrimaryButton>
      ) : null}
    </div>
  );
}

function ListenRepeatView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "LISTEN_REPEAT" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const { manager } = useAudio();

  const target =
    activity.targetType === "sentence"
      ? content.sentence(activity.targetId)
      : content.item(activity.targetId);

  useEffect(() => {
    if (!target) return;
    void manager.play({
      ownerId: target.id,
      asset: target.audio,
      speed: activity.slowFirst ? "slow" : "normal"
    });
  }, [target, activity.slowFirst, manager]);

  if (!target) return <EmptyState title="Thiếu nội dung" />;

  return (
    <div className="lz-stack">
      <div className="lz-player__prompt">
        <ListenGlyph />
        {activity.targetType === "sentence" ? (
          <SentenceText sentence={content.sentence(activity.targetId)} size="lg" />
        ) : (
          <ItemText item={content.item(activity.targetId)} size="lg" />
        )}
        <AudioControls ownerId={target.id} asset={target.audio} text={target.text} />
      </div>

      <RecorderPanel
        targetId={target.id}
        targetText={target.text}
        targetAsset={target.audio}
        onComplete={onComplete}
      />
    </div>
  );
}

/**
 * Shadowing: the sentence is rebuilt one phrase at a time.
 *
 * Segments come from authored audio boundaries rather than character counts,
 * so the build-up follows real phrase structure instead of chopping a word in
 * half.
 */
function ShadowingView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "SHADOWING" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const { manager } = useAudio();
  const sentence = content.sentence(activity.sentenceId);
  const [step, setStep] = useState(0);

  const segments = useMemo(
    () =>
      activity.segmentOrder
        .map((segmentId) => sentence?.audio.normal.segments?.find((seg) => seg.id === segmentId))
        .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment)),
    [activity.segmentOrder, sentence]
  );

  if (!sentence) return <EmptyState title="Thiếu nội dung" />;

  const atFullSentence = step >= segments.length;
  const currentSegment = segments[step];

  return (
    <div className="lz-stack">
      <div className="lz-player__prompt">
        <span className="lz-player__glyph" aria-hidden="true">
          🗣️
        </span>
        <p className="lz-target lz-target--lg" lang="zh-CN">
          {atFullSentence ? sentence.text : currentSegment?.text}
        </p>
        <p className="lz-muted">
          {atFullSentence ? t(sentence.translation) : `${step + 1} / ${segments.length + 1}`}
        </p>

        <div className="lz-audio-controls">
          <button
            type="button"
            className="lz-chip-btn"
            aria-label={`${ct("audio.play")}: ${atFullSentence ? sentence.text : currentSegment?.text}`}
            onClick={() =>
              void manager.play({
                ownerId: sentence.id,
                asset: sentence.audio,
                segmentId: atFullSentence ? undefined : currentSegment?.id
              })
            }
          >
            🔊 {ct("audio.play")}
          </button>
          <button
            type="button"
            className="lz-chip-btn"
            aria-label={`${ct("audio.playSlow")}: ${sentence.text}`}
            onClick={() => void manager.play({ ownerId: sentence.id, asset: sentence.audio, speed: "slow" })}
          >
            🐢 {ct("audio.slowLabel")}
          </button>
        </div>
      </div>

      {atFullSentence ? (
        <RecorderPanel
          targetId={sentence.id}
          targetText={sentence.text}
          targetAsset={sentence.audio}
          onComplete={onComplete}
        />
      ) : (
        <PrimaryButton onClick={() => setStep((value) => value + 1)}>
          {ct("common.continue")}
        </PrimaryButton>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Speaking                                                            */
/* ------------------------------------------------------------------ */

function PronunciationDrillView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "PRONUNCIATION_DRILL" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);

  const targetId = activity.targetIds[index];
  const target =
    activity.targetType === "sentence" ? content.sentence(targetId) : content.item(targetId);

  const handleScore = useCallback(
    (score: number) => {
      const next = [...scores, score];
      if (index + 1 >= activity.targetIds.length) {
        onComplete(next.reduce((sum, value) => sum + value, 0) / next.length);
        return;
      }
      setScores(next);
      setIndex(index + 1);
    },
    [scores, index, activity.targetIds.length, onComplete]
  );

  if (!target) return <EmptyState title="Thiếu nội dung" />;

  return (
    <div className="lz-stack">
      <p className="lz-eyebrow" style={{ textAlign: "center" }}>
        {index + 1} / {activity.targetIds.length}
      </p>
      <div className="lz-player__prompt">
        {activity.targetType === "sentence" ? (
          <SentenceText sentence={content.sentence(targetId)} size="lg" forceSupport />
        ) : (
          <ItemText item={content.item(targetId)} size="lg" forceSupport />
        )}
        <AudioControls ownerId={target.id} asset={target.audio} text={target.text} />
      </div>
      <RecorderPanel
        key={targetId}
        targetId={target.id}
        targetText={target.text}
        targetAsset={target.audio}
        onComplete={handleScore}
      />
    </div>
  );
}

/**
 * Quick response: hear a question, answer before the countdown runs out.
 *
 * The countdown is pressure, not a gate -- it expiring reveals the hint rather
 * than failing the activity, because the goal is to build reflex and a
 * punishing timer teaches avoidance instead.
 */
function QuickResponseView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "QUICK_RESPONSE" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const prompt = content.sentence(activity.promptSentenceId);
  const hint = content.sentence(activity.hintSentenceIds[0]);

  const [remaining, setRemaining] = useState(Math.ceil(activity.responseWindowMs / 1000));
  const [showHint, setShowHint] = useState(false);
  const [started, setStarted] = useState(false);
  useAutoplay(prompt);

  useEffect(() => {
    if (started || remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, started]);

  return (
    <div className="lz-stack">
      <div className="lz-player__prompt">
        <ListenGlyph />
        {prompt ? (
          <>
            <SentenceText sentence={prompt} size="lg" />
            <AudioControls ownerId={prompt.id} asset={prompt.audio} text={prompt.text} />
          </>
        ) : null}
        {!started && remaining > 0 ? (
          <span className="lz-countdown" aria-live="off">
            {remaining}
          </span>
        ) : null}
      </div>

      {prompt ? (
        <div onFocus={() => setStarted(true)} onClick={() => setStarted(true)}>
          <RecorderPanel
            targetId={hint?.id ?? prompt.id}
            targetText={hint?.text ?? prompt.text}
            targetAsset={hint?.audio ?? prompt.audio}
            onComplete={onComplete}
          />
        </div>
      ) : null}

      <SecondaryButton block onClick={() => setShowHint(true)}>
        💡 {ct("hint.show")}
      </SecondaryButton>

      <BottomSheet open={showHint} title={ct("hint.label")} onClose={() => setShowHint(false)}>
        {activity.hintSentenceIds.map((id) => (
          <SentenceText key={id} sentence={content.sentence(id)} forceSupport />
        ))}
      </BottomSheet>
    </div>
  );
}

function GuidedSpeakingView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "GUIDED_SPEAKING" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const target = content.sentence(activity.targetSentenceId);
  const [revealed, setRevealed] = useState(false);

  if (!target) return <EmptyState title="Thiếu nội dung" />;

  return (
    <div className="lz-stack">
      <div className="lz-player__prompt">
        <span className="lz-player__glyph" aria-hidden="true">
          💬
        </span>
        <p className="lz-section-title" style={{ textAlign: "center" }}>
          {t(activity.prompt)}
        </p>
        {/* The model answer stays hidden until asked for: producing it from
            meaning is the exercise, reading it aloud is not. */}
        {revealed ? (
          <>
            <SentenceText sentence={target} size="lg" forceSupport />
            <AudioControls ownerId={target.id} asset={target.audio} text={target.text} />
          </>
        ) : (
          <SecondaryButton onClick={() => setRevealed(true)}>💡 {ct("hint.show")}</SecondaryButton>
        )}
      </div>

      <RecorderPanel
        targetId={target.id}
        targetText={target.text}
        targetAsset={target.audio}
        onComplete={onComplete}
      />
    </div>
  );
}

/**
 * Substitution drill.
 *
 * The realized sentence is deliberately not rendered as text. Lingoza only
 * displays target-language strings that have a recording, and a sentence
 * generated at runtime by swapping a slot has none -- so the drill shows the
 * pattern skeleton plus the swapped-in word, both of which are audible.
 */
function SubstitutionDrillView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "SUBSTITUTION_DRILL" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const pattern = content.pattern(activity.patternId);
  const model = content.sentence(pattern?.exampleSentenceIds[0] ?? "");
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);

  const itemId = activity.substitutionItemIds[index];
  const item = content.item(itemId);

  const handleScore = useCallback(
    (score: number) => {
      const next = [...scores, score];
      if (index + 1 >= activity.substitutionItemIds.length) {
        onComplete(next.reduce((sum, value) => sum + value, 0) / next.length);
        return;
      }
      setScores(next);
      setIndex(index + 1);
    },
    [scores, index, activity.substitutionItemIds.length, onComplete]
  );

  if (!pattern || !item) return <EmptyState title="Thiếu nội dung" />;

  return (
    <div className="lz-stack">
      <p className="lz-eyebrow" style={{ textAlign: "center" }}>
        {index + 1} / {activity.substitutionItemIds.length}
      </p>

      <Card variant="muted">
        <p className="lz-eyebrow">MẪU CÂU</p>
        <p className="lz-target lz-target--sm" lang="zh-CN">
          {pattern.skeleton}
        </p>
        {model ? <SentenceText sentence={model} size="sm" /> : null}
      </Card>

      <div className="lz-player__prompt">
        <p className="lz-muted">Thay bằng:</p>
        <ItemText item={item} size="lg" forceSupport />
      </div>

      <RecorderPanel
        key={itemId}
        targetId={model?.id ?? item.id}
        targetText={model?.text ?? item.text}
        targetAsset={model?.audio ?? item.audio}
        onComplete={handleScore}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Conversation                                                        */
/* ------------------------------------------------------------------ */

function ScenarioView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "DIALOGUE" | "ROLE_PLAY" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const scenario = content.scenario(activity.scenarioId);
  if (!scenario) return <EmptyState title="Thiếu hội thoại" />;

  return (
    <DialogueRunner
      scenario={scenario}
      mode={activity.kind === "DIALOGUE" ? "listen-through" : "role-play"}
      onFinished={onComplete}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Review & assessment                                                 */
/* ------------------------------------------------------------------ */

function ListeningChallengeView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "LISTENING_CHALLENGE" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answered = Object.keys(answers).length;

  return (
    <div className="lz-stack">
      <div className="lz-player__prompt">
        <ListenGlyph />
        {activity.sentenceIds.map((id) => (
          <SentenceText key={id} sentence={content.sentence(id)} size="sm" />
        ))}
      </div>

      {activity.questions.map((question) => (
        <Card key={question.id}>
          <p style={{ marginTop: 0 }}>{t(question.prompt)}</p>
          <div className="lz-stack lz-stack--tight">
            {question.choices.map((choice, index) => (
              <button
                key={index}
                type="button"
                className="lz-choice"
                disabled={answers[question.id] !== undefined}
                data-verdict={
                  answers[question.id] === undefined
                    ? undefined
                    : index === question.correctChoiceIndex
                      ? "correct"
                      : index === answers[question.id]
                        ? "incorrect"
                        : undefined
                }
                onClick={() => setAnswers((previous) => ({ ...previous, [question.id]: index }))}
              >
                <span className="lz-choice__body">{t(choice)}</span>
              </button>
            ))}
          </div>
        </Card>
      ))}

      {answered === activity.questions.length ? (
        <PrimaryButton
          onClick={() =>
            onComplete(
              activity.questions.filter(
                (question) => answers[question.id] === question.correctChoiceIndex
              ).length / Math.max(1, activity.questions.length)
            )
          }
        >
          {ct("common.continue")}
        </PrimaryButton>
      ) : null}
    </div>
  );
}

/** Vocabulary card stack: word → collocation → sentence, all audible. */
function VocabularyReviewView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "VOCABULARY_REVIEW" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();

  return (
    <div className="lz-stack">
      {activity.itemIds.map((itemId) => {
        const item = content.item(itemId);
        if (!item) return null;
        return (
          <Card key={itemId}>
            <ItemText item={item} forceSupport />
            <div className="lz-stack lz-stack--tight" style={{ marginTop: 12 }}>
              {item.collocations.map((collocationId) => (
                <ItemText key={collocationId} item={content.item(collocationId)} size="sm" forceSupport />
              ))}
              {item.exampleSentenceIds.slice(0, 1).map((sentenceId) => (
                <SentenceText key={sentenceId} sentence={content.sentence(sentenceId)} size="sm" forceSupport />
              ))}
            </div>
          </Card>
        );
      })}
      <PrimaryButton onClick={() => onComplete(0.8)}>{ct("common.continue")}</PrimaryButton>
    </div>
  );
}

function PatternReviewView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "PATTERN_REVIEW" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();

  return (
    <div className="lz-stack">
      {activity.patternIds.map((patternId) => {
        const pattern = content.pattern(patternId);
        if (!pattern) return null;
        return (
          <Card key={patternId} variant="panel">
            <p className="lz-eyebrow">MẪU CÂU</p>
            <p className="lz-target lz-target--sm" lang="zh-CN" style={{ marginBottom: 4 }}>
              {pattern.skeleton}
            </p>
            <p className="lz-muted" style={{ marginBottom: 16 }}>
              {t(pattern.name)}
            </p>

            {/* Examples first, explanation after: the pattern is learned by ear. */}
            <div className="lz-stack lz-stack--tight">
              {pattern.exampleSentenceIds.map((sentenceId) => (
                <SentenceText key={sentenceId} sentence={content.sentence(sentenceId)} size="sm" forceSupport />
              ))}
            </div>

            <p className="lz-muted" style={{ marginTop: 16 }}>
              {t(pattern.explanation)}
            </p>
          </Card>
        );
      })}
      <PrimaryButton onClick={() => onComplete(0.8)}>{ct("common.continue")}</PrimaryButton>
    </div>
  );
}

/**
 * Runs a checkpoint through the assessment engine.
 *
 * Items are selected with a seed derived from the learner and the assessment,
 * so resuming a checkpoint serves the same sitting rather than reshuffling it.
 */
function AssessmentView({
  activity,
  onComplete
}: {
  activity: Extract<Activity, { kind: "UNIT_CHECKPOINT" | "LEVEL_ASSESSMENT" }>;
  onComplete: (score: number) => void;
}) {
  const content = useContent();
  const { snapshot } = useLearner();
  const assessment = content.assessment(activity.assessmentId);

  const items = useMemo(
    () =>
      assessment
        ? selectItems(assessment, { seed: `${snapshot.profile.learnerRef}:${assessment.id}` })
        : [],
    [assessment, snapshot.profile.learnerRef]
  );

  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [finished, setFinished] = useState<ReturnType<typeof scoreAssessment> | null>(null);

  const submit = useCallback(
    (response: AssessmentResponse) => {
      const next = [...responses, response];
      if (index + 1 >= items.length) {
        setResponses(next);
        if (assessment) {
          setFinished(
            scoreAssessment(assessment, items, next, { completedAt: new Date().toISOString() })
          );
        }
        return;
      }
      setResponses(next);
      setIndex(index + 1);
    },
    [responses, index, items, assessment]
  );

  if (!assessment || items.length === 0) return <EmptyState title="Chưa có bài kiểm tra" />;

  if (finished) {
    return (
      <div className="lz-stack">
        <FeedbackPanel
          tone={finished.passed ? "positive" : "attention"}
          title={finished.passed ? "Đạt! 🎉" : "Gần được rồi"}
        >
          <div className="lz-metrics" style={{ marginTop: 8 }}>
            {finished.skillResults.map((result) => (
              <div className="lz-metric" key={result.skill}>
                <span>{ct(`skill.${result.skill}`)}</span>
                <div className="lz-progress">
                  <span className="lz-progress__fill" style={{ width: `${Math.round(result.score * 100)}%` }} />
                </div>
                <span className="lz-metric__value">{Math.round(result.score * 100)}%</span>
              </div>
            ))}
          </div>
        </FeedbackPanel>
        <PrimaryButton onClick={() => onComplete(finished.overallScore)}>
          {ct("common.continue")}
        </PrimaryButton>
      </div>
    );
  }

  const item = items[index];
  const prompt = content.sentence(item.promptSentenceId);

  return (
    <div className="lz-stack">
      <p className="lz-eyebrow" style={{ textAlign: "center" }}>
        {index + 1} / {items.length}
      </p>

      <div className="lz-player__prompt">
        <ListenGlyph />
        {prompt ? (
          <>
            <SentenceText sentence={prompt} size="lg" />
            <AudioControls ownerId={prompt.id} asset={prompt.audio} text={prompt.text} />
          </>
        ) : null}
        {item.instruction ? <p className="lz-muted">{t(item.instruction)}</p> : null}
      </div>

      {item.responseMode === "speak" && prompt ? (
        <RecorderPanel
          key={item.id}
          targetId={prompt.id}
          targetText={prompt.text}
          targetAsset={prompt.audio}
          onComplete={(score) => submit({ itemId: item.id, spokenScore: score, elapsedMs: 0 })}
        />
      ) : (
        <div className="lz-stack lz-stack--tight">
          {(item.choices ?? []).map((choice, choiceIndex) => (
            <button
              key={choiceIndex}
              type="button"
              className="lz-choice"
              onClick={() => submit({ itemId: item.id, choiceIndex, elapsedMs: 0 })}
            >
              <span className="lz-choice__body">{t(choice)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
