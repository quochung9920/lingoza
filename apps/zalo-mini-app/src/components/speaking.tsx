import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AudioAsset, ContentId } from "../../../../packages/content-schema/src/index";
import type {
  SpeechEvaluation,
  SpeechMetricId
} from "../../../../packages/pronunciation-engine/src/index";
import { hybridSpeechEvaluator } from "../../../../packages/pronunciation-engine/src/index";
import { useAudio } from "../app/audio-provider";
import { useLearner } from "../app/learner-provider";
import {
  assessPronunciationWithGateway,
  isAdvancedPronunciationConfigured,
  type PronunciationGatewayResult
} from "../audio/pronunciation-assessment";
import {
  createSpeechRecorder,
  disposeRecording,
  isRecordingSupported,
  referenceFeaturesFromMetadata,
  type Recording
} from "../audio/recorder";
import {
  createBrowserSpeechVerifier,
  isBrowserSpeechRecognitionSupported
} from "../audio/speech-recognition";
import { ct } from "../lib/i18n";
import { AudioButton } from "./audio";
import { FeedbackPanel, PrimaryButton, SecondaryButton } from "./primitives";

/**
 * Speaking surface: record, verify target content, collect optional phoneme
 * evidence, then combine it with deterministic local prosody feedback.
 *
 * Evidence boundaries are explicit:
 * - local signal analysis never claims phoneme accuracy;
 * - browser recognition verifies text only;
 * - the opt-in speech gateway may provide phoneme evidence;
 * - missing providers degrade to the strongest evidence still available.
 */

export type RecorderPhase = "idle" | "recording" | "processing" | "reviewed" | "denied" | "unsupported";

export function Waveform({ envelope, variant }: { envelope: number[]; variant?: "learner" }) {
  const bars = envelope.length > 0 ? envelope : new Array<number>(24).fill(0.12);
  return (
    <div className={`lz-waveform${variant === "learner" ? " lz-waveform--learner" : ""}`} aria-hidden="true">
      {bars.map((value, index) => (
        <span
          key={index}
          className="lz-waveform__bar"
          style={{ height: `${Math.max(8, Math.min(100, value * 100))}%` }}
        />
      ))}
    </div>
  );
}

export function MicrophoneButton({
  phase,
  onStart,
  onStop,
  disabled
}: {
  phase: RecorderPhase;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}) {
  const recording = phase === "recording";
  const label = recording
    ? ct("speak.recording")
    : phase === "processing"
      ? ct("speak.processing")
      : ct("speak.tapToSpeak");

  return (
    <button
      type="button"
      className="lz-mic"
      data-state={phase === "unsupported" ? "unsupported" : recording ? "recording" : "idle"}
      aria-label={label}
      aria-pressed={recording}
      disabled={disabled || phase === "processing" || phase === "unsupported"}
      onClick={recording ? onStop : onStart}
    >
      <span className="lz-mic__disc" aria-hidden="true">
        {recording ? "⏹" : "🎤"}
      </span>
      <span className="lz-mic__label">{label}</span>
    </button>
  );
}

const METRIC_LABEL: Record<SpeechMetricId, Parameters<typeof ct>[0]> = {
  contentMatch: "metric.contentMatch",
  phonemeAccuracy: "metric.phonemeAccuracy",
  toneContour: "metric.toneContour",
  rhythm: "metric.rhythm",
  pace: "metric.pace",
  pausing: "metric.pausing"
};

export function SpeechMetrics({ evaluation }: { evaluation: SpeechEvaluation }) {
  if (evaluation.metrics.length === 0) {
    return <p className="lz-muted">{ct("metric.unavailable")}</p>;
  }

  return (
    <div className="lz-metrics">
      {evaluation.metrics.map((metric) => (
        <div className="lz-metric" key={metric.id}>
          <span>{ct(METRIC_LABEL[metric.id])}</span>
          <div
            className="lz-progress"
            role="progressbar"
            aria-label={ct(METRIC_LABEL[metric.id])}
            aria-valuenow={Math.round(metric.value * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={metric.precise ? undefined : ct(`band.${metric.band}`)}
          >
            <span className="lz-progress__fill" style={{ width: `${Math.round(metric.value * 100)}%` }} />
          </div>
          <span className="lz-metric__value">
            {metric.precise ? `${Math.round(metric.value * 100)}%` : ct(`band.${metric.band}`)}
          </span>
        </div>
      ))}
      {evaluation.unavailable
        .filter((entry) => entry.reason !== "not-applicable" && entry.reason !== "provider-unavailable")
        .map((entry) => (
          <p className="lz-muted" key={entry.id}>
            {ct(METRIC_LABEL[entry.id])}: {ct("metric.unavailable")}
          </p>
        ))}
    </div>
  );
}

function VerificationFeedback({
  evaluation,
  advancedRequested,
  advancedConfigured,
  browserRecognitionRequested,
  browserRecognitionSupported
}: {
  evaluation: SpeechEvaluation;
  advancedRequested: boolean;
  advancedConfigured: boolean;
  browserRecognitionRequested: boolean;
  browserRecognitionSupported: boolean;
}) {
  const verification = evaluation.verification;

  if (verification.content === "matched") {
    return (
      <FeedbackPanel tone="positive" title={ct("speak.contentMatched")}>
        {verification.recognizedText ? (
          <p className="lz-muted">
            {ct("speak.recognizedAs")}: <strong lang="zh-CN">{verification.recognizedText}</strong>
          </p>
        ) : null}
        <p className="lz-muted">
          {verification.pronunciation === "phoneme-verified"
            ? ct("speak.phonemeVerified")
            : ct("speak.prosodyOnly")}
        </p>
      </FeedbackPanel>
    );
  }

  if (verification.content === "mismatch") {
    return (
      <FeedbackPanel tone="attention" title={ct("speak.contentMismatch")}>
        {verification.recognizedText ? (
          <p className="lz-muted">
            {ct("speak.recognizedAs")}: <strong lang="zh-CN">{verification.recognizedText}</strong>
          </p>
        ) : null}
        <p className="lz-muted">
          {verification.pronunciation === "phoneme-verified"
            ? ct("speak.phonemeVerified")
            : ct("speak.prosodyOnly")}
        </p>
      </FeedbackPanel>
    );
  }

  const noAdvancedGateway = advancedRequested && !advancedConfigured;
  const noBrowserRecognition = browserRecognitionRequested && !browserRecognitionSupported;

  return (
    <FeedbackPanel tone="neutral" title={ct("speak.contentUnverified")}>
      <p className="lz-muted">
        {noAdvancedGateway || noBrowserRecognition
          ? ct("speak.recognitionUnavailable")
          : ct("speak.prosodyOnly")}
      </p>
    </FeedbackPanel>
  );
}

function WordPronunciationDetails({ result }: { result: PronunciationGatewayResult | null }) {
  const words = result?.words?.filter((word) => word.accuracy !== undefined) ?? [];
  if (words.length === 0) return null;

  return (
    <div className="lz-stack lz-stack--tight">
      <p className="lz-eyebrow">CHI TIẾT TỪNG TỪ</p>
      {words.map((word, index) => {
        const accuracy = word.accuracy ?? 0;
        return (
          <div className="lz-metric" key={`${word.text}-${index}`}>
            <strong lang="zh-CN">{word.text}</strong>
            <div
              className="lz-progress"
              role="progressbar"
              aria-label={`${word.text}: ${Math.round(accuracy * 100)}%`}
              aria-valuenow={Math.round(accuracy * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="lz-progress__fill" style={{ width: `${Math.round(accuracy * 100)}%` }} />
            </div>
            <span className="lz-metric__value">{Math.round(accuracy * 100)}%</span>
          </div>
        );
      })}
    </div>
  );
}

export interface RecorderPanelProps {
  targetId: ContentId;
  targetText: string;
  targetAsset: AudioAsset | undefined;
  tonal?: boolean;
  onComplete: (score: number) => void;
  continueLabel?: string;
}

/** Record → optional provider assessment → local prosody → continue. */
export function RecorderPanel({
  targetId,
  targetText,
  targetAsset,
  tonal = true,
  onComplete,
  continueLabel
}: RecorderPanelProps) {
  const { snapshot, grantMicrophoneConsent } = useLearner();
  const { manager } = useAudio();

  const recorder = useMemo(() => createSpeechRecorder(), []);
  const verifier = useMemo(
    () => createBrowserSpeechVerifier(snapshot.profile.activeLanguage),
    [snapshot.profile.activeLanguage]
  );
  const [phase, setPhase] = useState<RecorderPhase>(() =>
    isRecordingSupported() ? "idle" : "unsupported"
  );
  const [recording, setRecording] = useState<Recording | null>(null);
  const [evaluation, setEvaluation] = useState<SpeechEvaluation | null>(null);
  const [gatewayResult, setGatewayResult] = useState<PronunciationGatewayResult | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  const keepRecordings = snapshot.profile.privacy.keepRecordingsLocally;
  const advancedRequested = snapshot.profile.privacy.advancedPronunciationOptIn;
  const advancedConfigured = isAdvancedPronunciationConfigured();
  const browserRecognitionRequested =
    snapshot.profile.privacy.speechRecognitionOptIn && !(advancedRequested && advancedConfigured);
  const browserRecognitionSupported = isBrowserSpeechRecognitionSupported();

  const discard = useCallback(
    (current: Recording | null) => {
      if (current && !keepRecordings) disposeRecording(current);
    },
    [keepRecordings]
  );

  useEffect(
    () => () => {
      recorder.cancel();
      verifier.cancel();
      playbackRef.current?.pause();
      discard(recording);
    },
    [recorder, verifier, recording, discard]
  );

  const referenceEnvelope = useMemo(() => {
    const segments = targetAsset?.normal.segments;
    if (!segments || segments.length === 0) return new Array<number>(24).fill(0.55);
    const total = targetAsset?.normal.durationMs ?? 1600;
    return Array.from({ length: 32 }, (_, index) => {
      const atMs = (index / 32) * total;
      const inGap = segments.some(
        (segment, i) => i > 0 && atMs > segments[i - 1].endMs && atMs < segment.startMs
      );
      return inGap ? 0.1 : 0.6;
    });
  }, [targetAsset]);

  const handleStart = useCallback(async () => {
    manager.stop();
    discard(recording);
    setRecording(null);
    setEvaluation(null);
    setGatewayResult(null);
    verifier.cancel();

    try {
      await recorder.start();
      if (browserRecognitionRequested && verifier.supported) verifier.start();
      if (!snapshot.profile.privacy.microphoneConsentGrantedAt) grantMicrophoneConsent();
      setPhase("recording");
    } catch {
      verifier.cancel();
      setPhase(isRecordingSupported() ? "denied" : "unsupported");
    }
  }, [
    manager,
    recorder,
    verifier,
    recording,
    discard,
    browserRecognitionRequested,
    snapshot.profile.privacy.microphoneConsentGrantedAt,
    grantMicrophoneConsent
  ]);

  const handleStop = useCallback(async () => {
    setPhase("processing");
    try {
      const result = await recorder.stop();
      if (!result) {
        verifier.cancel();
        setPhase("idle");
        return;
      }

      const [advanced, browserRecognition] = await Promise.all([
        advancedRequested && advancedConfigured
          ? assessPronunciationWithGateway({
              audio: result.assessmentAudio,
              targetText,
              language: snapshot.profile.activeLanguage,
              targetId
            }).catch(() => null)
          : Promise.resolve(null),
        browserRecognitionRequested && verifier.supported
          ? verifier.stop(targetText)
          : Promise.resolve(null)
      ]);

      setRecording(result);
      setGatewayResult(advanced);
      setEvaluation(
        hybridSpeechEvaluator.evaluate({
          reference: referenceFeaturesFromMetadata(
            targetAsset?.normal.durationMs ?? result.durationMs,
            targetAsset?.normal.segments
          ),
          learner: result.features,
          tonal,
          recognition: advanced?.recognition ?? browserRecognition ?? undefined,
          phonemes: advanced?.phonemes
        })
      );
      setPhase("reviewed");
    } catch {
      verifier.cancel();
      setPhase("idle");
    }
  }, [
    recorder,
    verifier,
    advancedRequested,
    advancedConfigured,
    browserRecognitionRequested,
    targetText,
    targetId,
    targetAsset,
    tonal,
    snapshot.profile.activeLanguage
  ]);

  const playBack = useCallback(() => {
    if (!recording) return;
    manager.stop();
    playbackRef.current?.pause();
    const element = new Audio(recording.url);
    playbackRef.current = element;
    void element.play().catch(() => undefined);
  }, [recording, manager]);

  if (phase === "unsupported") {
    return (
      <div className="lz-stack">
        <FeedbackPanel tone="neutral" title={ct("speak.unsupported")} />
        <PrimaryButton onClick={() => onComplete(0.6)}>
          {continueLabel ?? ct("common.continue")}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="lz-stack">
      {phase === "denied" ? (
        <FeedbackPanel tone="attention" title={ct("speak.permissionTitle")}>
          <p className="lz-muted">{ct("speak.permissionDenied")}</p>
        </FeedbackPanel>
      ) : null}

      {phase !== "reviewed" ? (
        <div style={{ display: "grid", placeItems: "center" }}>
          <MicrophoneButton phase={phase} onStart={() => void handleStart()} onStop={() => void handleStop()} />
          {!snapshot.profile.privacy.microphoneConsentGrantedAt && phase === "idle" ? (
            <p className="lz-muted" style={{ textAlign: "center", maxWidth: 280 }}>
              {ct("speak.permissionBody")}
            </p>
          ) : null}
          {phase === "idle" && advancedRequested && !advancedConfigured ? (
            <p className="lz-muted" style={{ textAlign: "center", maxWidth: 320 }}>
              {ct("speak.advancedUnavailable")}
            </p>
          ) : null}
          {phase === "idle" && browserRecognitionRequested && !browserRecognitionSupported ? (
            <p className="lz-muted" style={{ textAlign: "center", maxWidth: 320 }}>
              {ct("speak.recognitionUnavailable")}
            </p>
          ) : null}
        </div>
      ) : null}

      {phase === "reviewed" && recording && evaluation ? (
        <div className="lz-stack">
          <div className="lz-playback-row">
            <span className="lz-playback-row__label">{ct("speak.native")}</span>
            <AudioButton ownerId={targetId} asset={targetAsset} text={targetText} />
            <Waveform envelope={referenceEnvelope} />
          </div>

          <div className="lz-playback-row">
            <span className="lz-playback-row__label">{ct("speak.you")}</span>
            <button
              type="button"
              className="lz-audio-btn"
              aria-label={`${ct("audio.play")}: ${ct("speak.you")}`}
              onClick={playBack}
            >
              <span className="lz-audio-btn__disc" aria-hidden="true">
                ▶
              </span>
            </button>
            <Waveform envelope={recording.envelope} variant="learner" />
          </div>

          <VerificationFeedback
            evaluation={evaluation}
            advancedRequested={advancedRequested}
            advancedConfigured={advancedConfigured}
            browserRecognitionRequested={browserRecognitionRequested}
            browserRecognitionSupported={browserRecognitionSupported}
          />
          <SpeechMetrics evaluation={evaluation} />
          <WordPronunciationDetails result={gatewayResult} />

          <div className="lz-stack lz-stack--tight">
            <PrimaryButton onClick={() => onComplete(evaluation.overall)}>
              {continueLabel ?? ct("common.continue")}
            </PrimaryButton>
            <SecondaryButton block onClick={() => void handleStart()}>
              {ct("speak.again")}
            </SecondaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
