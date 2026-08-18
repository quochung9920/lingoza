import { clamp01 } from "../../content-schema/src/index.js";

/**
 * `@lingoza/pronunciation-engine` -- honest, model-free speech feedback.
 *
 * ## What this package will and will not claim
 *
 * Lingoza ships no speech recognizer and no acoustic model, so it cannot know
 * which phonemes a learner produced. It therefore never reports "pronunciation
 * accuracy". What it *can* measure from a waveform, without any model, is
 * prosody: how the pitch moved, how the energy was distributed in time, how
 * long the utterance took, and where the silences fell. Those are real signals,
 * they matter enormously for tonal languages, and they are all this package
 * reports.
 *
 * `SpeechEvaluationProvider` is the seam. `ModelFreeSpeechEvaluator` is the
 * default implementation; a future recognizer-backed provider can be dropped in
 * without the learning core changing, because activities depend on the
 * interface and on `SpeechMetric`, not on how a score was obtained.
 */

/* ------------------------------------------------------------------ */
/* Feature input                                                       */
/* ------------------------------------------------------------------ */

/**
 * Frame-level acoustic features extracted from a recording.
 *
 * Extraction is the app's job (Web Audio autocorrelation for pitch, RMS for
 * energy); this package is pure maths over the resulting arrays so it stays
 * testable and platform-independent.
 */
export interface AudioFeatures {
  /** Fundamental frequency per frame in Hz. 0 marks an unvoiced/silent frame. */
  pitchHz: number[];
  /** RMS energy per frame, 0..1. Same length as `pitchHz`. */
  energy: number[];
  /** Milliseconds covered by one frame. */
  frameMs: number;
  durationMs: number;
}

/** What the reference recording and the learner's attempt look like together. */
export interface SpeechAttempt {
  reference: AudioFeatures;
  learner: AudioFeatures;
  /** Set by the language pack; gates whether tone is reported at all. */
  tonal: boolean;
}

/* ------------------------------------------------------------------ */
/* Metric output                                                       */
/* ------------------------------------------------------------------ */

/**
 * The measurable dimensions. Each maps to something a learner can act on --
 * "your pitch fell where it should have risen" is coachable in a way that a
 * single opaque percentage is not.
 */
export type SpeechMetricId = "toneContour" | "rhythm" | "pace" | "pausing";

/** Qualitative band. Preferred over raw numbers for anything imprecise. */
export type MetricBand = "needs-work" | "fair" | "good" | "excellent";

export interface SpeechMetric {
  id: SpeechMetricId;
  /** Normalized 0..1. */
  value: number;
  band: MetricBand;
  /**
   * Whether this metric should be shown as a percentage. False for metrics
   * whose underlying measurement is too coarse to justify a number, which the
   * UI renders as a band label instead.
   */
  precise: boolean;
  /** Machine-readable coaching key; the UI owns the wording per locale. */
  adviceKey: string;
}

export interface SpeechEvaluation {
  metrics: SpeechMetric[];
  /** Mean of available metrics. Used for mastery, never shown as "accuracy". */
  overall: number;
  /**
   * Metrics that could not be computed, with a reason. Surfaced so the UI can
   * say "we couldn't hear that clearly" rather than silently scoring zero.
   */
  unavailable: Array<{ id: SpeechMetricId; reason: "no-voiced-frames" | "too-short" | "not-applicable" }>;
}

/**
 * The extension seam. Any future provider -- an on-device recognizer, a server
 * scorer -- implements this and the learning core is unaffected.
 */
export interface SpeechEvaluationProvider {
  readonly id: string;
  /** False for `ModelFreeSpeechEvaluator`; gates any phoneme-level UI. */
  readonly supportsPhonemeScoring: boolean;
  evaluate(attempt: SpeechAttempt): SpeechEvaluation;
}

/* ------------------------------------------------------------------ */
/* Signal helpers                                                      */
/* ------------------------------------------------------------------ */

export function bandFor(value: number): MetricBand {
  if (value >= 0.85) return "excellent";
  if (value >= 0.7) return "good";
  if (value >= 0.5) return "fair";
  return "needs-work";
}

/** Resamples a series to `length` points by linear interpolation. */
function resample(series: readonly number[], length: number): number[] {
  if (series.length === 0) return new Array<number>(length).fill(0);
  if (series.length === 1) return new Array<number>(length).fill(series[0]);

  const out = new Array<number>(length);
  for (let i = 0; i < length; i += 1) {
    const position = (i * (series.length - 1)) / (length - 1);
    const low = Math.floor(position);
    const high = Math.min(series.length - 1, low + 1);
    out[i] = series[low] + (series[high] - series[low]) * (position - low);
  }
  return out;
}

/** Converts Hz to semitones relative to the series' own mean. */
function toRelativeSemitones(pitchHz: readonly number[]): number[] {
  const voiced = pitchHz.filter((hz) => hz > 0);
  if (voiced.length === 0) return [];
  const mean = voiced.reduce((sum, hz) => sum + hz, 0) / voiced.length;
  // Speaker-relative on purpose: a learner with a lower voice than the speaker
  // is not mispronouncing anything, so absolute pitch must not be scored.
  return pitchHz.map((hz) => (hz > 0 ? 12 * Math.log2(hz / mean) : Number.NaN));
}

function pearson(a: readonly number[], b: readonly number[]): number | null {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) pairs.push([a[i], b[i]]);
  }
  if (pairs.length < 3) return null;

  const meanA = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length;
  const meanB = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length;

  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (const [x, y] of pairs) {
    const dx = x - meanA;
    const dy = y - meanB;
    covariance += dx * dy;
    varianceA += dx * dx;
    varianceB += dy * dy;
  }
  if (varianceA === 0 || varianceB === 0) return null;
  return covariance / Math.sqrt(varianceA * varianceB);
}

/** Frames whose energy sits below a fraction of the utterance's peak. */
function silenceMask(energy: readonly number[], relativeFloor = 0.15): boolean[] {
  const peak = energy.reduce((max, value) => Math.max(max, value), 0);
  if (peak <= 0) return energy.map(() => true);
  return energy.map((value) => value < peak * relativeFloor);
}

/* ------------------------------------------------------------------ */
/* The default provider                                                */
/* ------------------------------------------------------------------ */

export interface ModelFreeOptions {
  /** Utterances shorter than this are rejected as unmeasurable. */
  minDurationMs: number;
  /** Duration ratio within which pace counts as on target. */
  paceTolerance: number;
}

export const DEFAULT_MODEL_FREE_OPTIONS: ModelFreeOptions = {
  minDurationMs: 250,
  paceTolerance: 0.25
};

/**
 * Prosody-only evaluator.
 *
 * Both recordings are time-normalized to a common frame count before
 * comparison, so a learner speaking more slowly is judged on the *shape* of
 * their pitch and energy rather than penalised twice -- pace is scored
 * separately and explicitly.
 */
export class ModelFreeSpeechEvaluator implements SpeechEvaluationProvider {
  readonly id = "model-free-prosody";

  /** No acoustic model means no phoneme scoring. Stated, not implied. */
  readonly supportsPhonemeScoring = false;

  constructor(private readonly options: ModelFreeOptions = DEFAULT_MODEL_FREE_OPTIONS) {}

  evaluate(attempt: SpeechAttempt): SpeechEvaluation {
    const metrics: SpeechMetric[] = [];
    const unavailable: SpeechEvaluation["unavailable"] = [];
    const { reference, learner } = attempt;

    if (learner.durationMs < this.options.minDurationMs) {
      return {
        metrics: [],
        overall: 0,
        unavailable: (["toneContour", "rhythm", "pace", "pausing"] as SpeechMetricId[]).map(
          (id) => ({ id, reason: "too-short" as const })
        )
      };
    }

    const frames = Math.max(
      16,
      Math.min(200, Math.round(Math.max(reference.durationMs, learner.durationMs) / 20))
    );

    /* Tone contour -------------------------------------------------- */
    if (!attempt.tonal) {
      unavailable.push({ id: "toneContour", reason: "not-applicable" });
    } else {
      const referenceTone = toRelativeSemitones(reference.pitchHz);
      const learnerTone = toRelativeSemitones(learner.pitchHz);
      if (referenceTone.length === 0 || learnerTone.length === 0) {
        unavailable.push({ id: "toneContour", reason: "no-voiced-frames" });
      } else {
        const correlation = pearson(
          resample(referenceTone, frames),
          resample(learnerTone, frames)
        );
        if (correlation === null) {
          unavailable.push({ id: "toneContour", reason: "no-voiced-frames" });
        } else {
          // Map [-1, 1] onto [0, 1]: an inverted contour (rising where the
          // reference falls) is a real tone error and must not score as 0.5.
          const value = clamp01((correlation + 1) / 2);
          metrics.push({
            id: "toneContour",
            value,
            band: bandFor(value),
            precise: true,
            adviceKey: value >= 0.7 ? "tone.ok" : "tone.followContour"
          });
        }
      }
    }

    /* Rhythm -------------------------------------------------------- */
    const rhythmCorrelation = pearson(
      resample(reference.energy, frames),
      resample(learner.energy, frames)
    );
    if (rhythmCorrelation === null) {
      unavailable.push({ id: "rhythm", reason: "no-voiced-frames" });
    } else {
      const value = clamp01((rhythmCorrelation + 1) / 2);
      metrics.push({
        id: "rhythm",
        value,
        band: bandFor(value),
        precise: true,
        adviceKey: value >= 0.7 ? "rhythm.ok" : "rhythm.stressPattern"
      });
    }

    /* Pace ---------------------------------------------------------- */
    const ratio = reference.durationMs > 0 ? learner.durationMs / reference.durationMs : 1;
    const deviation = Math.abs(Math.log(ratio || 1));
    const paceValue = clamp01(1 - deviation / (this.options.paceTolerance * 4));
    metrics.push({
      id: "pace",
      value: paceValue,
      band: bandFor(paceValue),
      // Duration ratio is a blunt instrument; a percentage would overstate it.
      precise: false,
      adviceKey: ratio > 1 + this.options.paceTolerance
        ? "pace.tooSlow"
        : ratio < 1 - this.options.paceTolerance
          ? "pace.tooFast"
          : "pace.ok"
    });

    /* Pausing ------------------------------------------------------- */
    const referencePauses = resample(
      silenceMask(reference.energy).map((silent) => (silent ? 1 : 0)),
      frames
    );
    const learnerPauses = resample(
      silenceMask(learner.energy).map((silent) => (silent ? 1 : 0)),
      frames
    );
    let agreement = 0;
    for (let i = 0; i < frames; i += 1) {
      agreement += 1 - Math.abs(referencePauses[i] - learnerPauses[i]);
    }
    const pauseValue = clamp01(agreement / frames);
    metrics.push({
      id: "pausing",
      value: pauseValue,
      band: bandFor(pauseValue),
      precise: false,
      adviceKey: pauseValue >= 0.7 ? "pausing.ok" : "pausing.phraseBreaks"
    });

    const overall =
      metrics.length === 0
        ? 0
        : metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;

    return { metrics, overall, unavailable };
  }
}

/** Shared default instance; the evaluator is stateless. */
export const modelFreeSpeechEvaluator = new ModelFreeSpeechEvaluator();
