import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AudioAsset, ContentId } from "../../../../packages/content-schema/src/index";
import type {
  SpeechEvaluation,
  SpeechMetricId
} from "../../../../packages/pronunciation-engine/src/index";
import { modelFreeSpeechEvaluator } from "../../../../packages/pronunciation-engine/src/index";
import { useAudio } from "../app/audio-provider";
import { useLearner } from "../app/learner-provider";
import {
  createSpeechRecorder,
  disposeRecording,
  isRecordingSupported,
  referenceFeaturesFromMetadata,
  type Recording
} from "../audio/recorder";
import { ct } from "../lib/i18n";
import { AudioButton } from "./audio";
import { FeedbackPanel, PrimaryButton, SecondaryButton } from "./primitives";

/**
 * The speaking surface: microphone, waveforms, prosody feedback.
 *
 * Everything technical is hidden. The learner sees a microphone, two
 * waveforms, and four plain-language readings. They never see "uploading",
 * "encoding" or a codec name, because none of those are decisions they can act
 * on. Errors are the exception -- a denied permission is something only they
 * can fix, so that one is stated plainly.
 */

export type RecorderPhase = "idle" | "recording" | "processing" | "reviewed" | "denied" | "unsupported";

/* ------------------------------------------------------------------ */
/* Waveform                                                            */
/* ------------------------------------------------------------------ */

/**
 * Amplitude bars.
 *
 * Purely decorative in the accessibility tree: the information a learner acts
 * on is in the metrics below, and a screen reader announcing 48 bar heights
 * would be noise, not access.
 */
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

/* ------------------------------------------------------------------ */
/* Microphone                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

const METRIC_LABEL: Record<SpeechMetricId, Parameters<typeof ct>[0]> = {
  toneContour: "metric.toneContour",
  rhythm: "metric.rhythm",
  pace: "metric.pace",
  pausing: "metric.pausing"
};

/**
 * Prosody readings.
 *
 * A metric only shows a percentage when the underlying measurement justifies
 * one (`precise`). Pace and pausing are derived from coarse duration and
 * silence comparisons, so they show a qualitative band instead -- printing
 * "pace: 87%" would imply a precision the measurement does not have, and the
 * product would be making the exact claim it set out not to make.
 */
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
        .filter((entry) => entry.reason !== "not-applicable")
        .map((entry) => (
          <p className="lz-muted" key={entry.id}>
            {ct(METRIC_LABEL[entry.id])}: {ct("metric.unavailable")}
          </p>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recorder panel                                                      */
/* ------------------------------------------------------------------ */

export interface RecorderPanelProps {
  /** Reference clip the learner is imitating. */
  targetId: ContentId;
  targetText: string;
  targetAsset: AudioAsset | undefined;
  /** Whether the target language is tonal; gates tone reporting. */
  tonal?: boolean;
  /** Called once the learner accepts the attempt and moves on. */
  onComplete: (score: number) => void;
  continueLabel?: string;
}

/**
 * Record → compare → continue.
 *
 * Microphone permission is requested on the first tap of the button, never
 * before. The attempt's audio is held only as an object URL for playback and
 * is revoked the moment the learner records again or moves on, unless they
 * have explicitly opted into keeping recordings locally.
 */
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
  const [phase, setPhase] = useState<RecorderPhase>(() =>
    isRecordingSupported() ? "idle" : "unsupported"
  );
  const [recording, setRecording] = useState<Recording | null>(null);
  const [evaluation, setEvaluation] = useState<SpeechEvaluation | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  const keepRecordings = snapshot.profile.privacy.keepRecordingsLocally;

  const discard = useCallback(
    (current: Recording | null) => {
      if (current && !keepRecordings) disposeRecording(current);
    },
    [keepRecordings]
  );

  useEffect(
    () => () => {
      recorder.cancel();
      playbackRef.current?.pause();
      discard(recording);
    },
    [recorder, recording, discard]
  );

  const referenceEnvelope = useMemo(() => {
    // Until real recordings exist, the reference waveform is drawn from the
    // authored segment structure rather than invented amplitudes.
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

    try {
      await recorder.start();
      if (!snapshot.profile.privacy.microphoneConsentGrantedAt) grantMicrophoneConsent();
      setPhase("recording");
    } catch {
      setPhase(isRecordingSupported() ? "denied" : "unsupported");
    }
  }, [manager, recorder, recording, discard, snapshot.profile.privacy.microphoneConsentGrantedAt, grantMicrophoneConsent]);

  const handleStop = useCallback(async () => {
    setPhase("processing");
    try {
      const result = await recorder.stop();
      if (!result) {
        setPhase("idle");
        return;
      }
      setRecording(result);
      setEvaluation(
        modelFreeSpeechEvaluator.evaluate({
          reference: referenceFeaturesFromMetadata(
            targetAsset?.normal.durationMs ?? result.durationMs,
            targetAsset?.normal.segments
          ),
          learner: result.features,
          tonal
        })
      );
      setPhase("reviewed");
    } catch {
      setPhase("idle");
    }
  }, [recorder, targetAsset, tonal]);

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

          <SpeechMetrics evaluation={evaluation} />

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
