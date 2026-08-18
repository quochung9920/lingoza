import { clamp01 } from "../../content-schema/src/index.js";

/**
 * `@lingoza/pronunciation-engine` -- speech feedback with explicit evidence levels.
 *
 * The engine keeps prosody scoring deterministic and can optionally combine it
 * with transcript and phoneme evidence produced by a specialised speech
 * provider. It never invents phoneme accuracy when that evidence is missing.
 */

/* ------------------------------------------------------------------ */
/* Feature input                                                       */
/* ------------------------------------------------------------------ */

/** Frame-level acoustic features extracted from a recording. */
export interface AudioFeatures {
  /** Fundamental frequency per frame in Hz. 0 marks an unvoiced/silent frame. */
  pitchHz: number[];
  /** RMS energy per frame, 0..1. Same length as `pitchHz`. */
  energy: number[];
  /** Milliseconds covered by one frame. */
  frameMs: number;
  durationMs: number;
}

/** Transcript evidence produced by a speech recognizer. */
export interface SpeechRecognitionEvidence {
  expectedText: string;
  recognizedText: string;
  /** 0..1 provider confidence when available. */
  confidence?: number;
  providerId: string;
}

/** Per-unit pronunciation evidence produced by an acoustic/forced-alignment provider. */
export interface PhonemeUnitEvidence {
  expected: string;
  observed?: string;
  /** Provider-normalized 0..1 score for this unit. */
  score: number;
  startMs?: number;
  endMs?: number;
}

export interface PhonemeEvidence {
  providerId: string;
  units: PhonemeUnitEvidence[];
}

/** What the reference recording and the learner's attempt look like together. */
export interface SpeechAttempt {
  reference: AudioFeatures;
  learner: AudioFeatures;
  /** Set by the language pack; gates whether tone is reported at all. */
  tonal: boolean;
  /** Optional recognizer result used to verify the learner said the target content. */
  recognition?: SpeechRecognitionEvidence;
  /** Optional phoneme/syllable evidence from a specialised pronunciation scorer. */
  phonemes?: PhonemeEvidence;
}

/* ------------------------------------------------------------------ */
/* Metric output                                                       */
/* ------------------------------------------------------------------ */

export type SpeechMetricId =
  | "contentMatch"
  | "phonemeAccuracy"
  | "toneContour"
  | "rhythm"
  | "pace"
  | "pausing";

/** Qualitative band. Preferred over raw numbers for anything imprecise. */
export type MetricBand = "needs-work" | "fair" | "good" | "excellent";

export interface SpeechMetric {
  id: SpeechMetricId;
  /** Normalized 0..1. */
  value: number;
  band: MetricBand;
  /** Whether the metric may honestly be shown as a percentage. */
  precise: boolean;
  /** Machine-readable coaching key; the UI owns localized wording. */
  adviceKey: string;
}

export type VerificationState = "unverified" | "matched" | "mismatch";
export type PronunciationEvidenceLevel = "prosody-only" | "phoneme-verified";

export interface SpeechVerification {
  content: VerificationState;
  pronunciation: PronunciationEvidenceLevel;
  recognizedText?: string;
  recognitionConfidence?: number;
  recognitionProviderId?: string;
  phonemeProviderId?: string;
}

export type UnavailableReason =
  | "no-voiced-frames"
  | "too-short"
  | "not-applicable"
  | "provider-unavailable";

export interface SpeechEvaluation {
  metrics: SpeechMetric[];
  /** Weighted evidence score. The UI must not label this "pronunciation accuracy" unless phoneme evidence exists. */
  overall: number;
  unavailable: Array<{ id: SpeechMetricId; reason: UnavailableReason }>;
  verification: SpeechVerification;
  phonemeUnits?: PhonemeUnitEvidence[];
}

/** Extension seam for model-free, browser-assisted or recognizer-backed scoring. */
export interface SpeechEvaluationProvider {
  readonly id: string;
  readonly supportsContentScoring: boolean;
  readonly supportsPhonemeScoring: boolean;
  evaluate(attempt: SpeechAttempt): SpeechEvaluation;
}

/* ------------------------------------------------------------------ */
/* Text verification                                                   */
/* ------------------------------------------------------------------ */

/** Removes punctuation/spacing while preserving letters, numbers and CJK text. */
export function normalizeSpeechText(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, "")
    .trim();
}

function levenshtein(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = new Array<number>(b.length + 1);
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}

/** Character/grapheme similarity used only for content match, not phoneme accuracy. */
export function speechTextSimilarity(expectedText: string, recognizedText: string): number {
  const expected = Array.from(normalizeSpeechText(expectedText));
  const recognized = Array.from(normalizeSpeechText(recognizedText));
  if (expected.length === 0 && recognized.length === 0) return 1;
  const denominator = Math.max(expected.length, recognized.length, 1);
  return clamp01(1 - levenshtein(expected, recognized) / denominator);
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
/* Model-free prosody provider                                         */
/* ------------------------------------------------------------------ */

export interface ModelFreeOptions {
  minDurationMs: number;
  paceTolerance: number;
}

export const DEFAULT_MODEL_FREE_OPTIONS: ModelFreeOptions = {
  minDurationMs: 250,
  paceTolerance: 0.25
};

export class ModelFreeSpeechEvaluator implements SpeechEvaluationProvider {
  readonly id = "model-free-prosody";
  readonly supportsContentScoring = false;
  readonly supportsPhonemeScoring = false;

  constructor(private readonly options: ModelFreeOptions = DEFAULT_MODEL_FREE_OPTIONS) {}

  evaluate(attempt: SpeechAttempt): SpeechEvaluation {
    const metrics: SpeechMetric[] = [];
    const unavailable: SpeechEvaluation["unavailable"] = [];
    const { reference, learner } = attempt;
    const verification: SpeechVerification = {
      content: "unverified",
      pronunciation: "prosody-only"
    };

    if (learner.durationMs < this.options.minDurationMs) {
      return {
        metrics: [],
        overall: 0,
        unavailable: (["toneContour", "rhythm", "pace", "pausing"] as SpeechMetricId[]).map(
          (id) => ({ id, reason: "too-short" as const })
        ),
        verification
      };
    }

    const frames = Math.max(
      16,
      Math.min(200, Math.round(Math.max(reference.durationMs, learner.durationMs) / 20))
    );

    if (!attempt.tonal) {
      unavailable.push({ id: "toneContour", reason: "not-applicable" });
    } else {
      const referenceTone = toRelativeSemitones(reference.pitchHz);
      const learnerTone = toRelativeSemitones(learner.pitchHz);
      if (referenceTone.length === 0 || learnerTone.length === 0) {
        unavailable.push({ id: "toneContour", reason: "no-voiced-frames" });
      } else {
        const correlation = pearson(resample(referenceTone, frames), resample(learnerTone, frames));
        if (correlation === null) {
          unavailable.push({ id: "toneContour", reason: "no-voiced-frames" });
        } else {
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

    const rhythmCorrelation = pearson(resample(reference.energy, frames), resample(learner.energy, frames));
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

    const ratio = reference.durationMs > 0 ? learner.durationMs / reference.durationMs : 1;
    const deviation = Math.abs(Math.log(ratio || 1));
    const paceValue = clamp01(1 - deviation / (this.options.paceTolerance * 4));
    metrics.push({
      id: "pace",
      value: paceValue,
      band: bandFor(paceValue),
      precise: false,
      adviceKey:
        ratio > 1 + this.options.paceTolerance
          ? "pace.tooSlow"
          : ratio < 1 - this.options.paceTolerance
            ? "pace.tooFast"
            : "pace.ok"
    });

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
      metrics.length === 0 ? 0 : metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;

    return { metrics, overall, unavailable, verification };
  }
}

/* ------------------------------------------------------------------ */
/* Hybrid verifier                                                     */
/* ------------------------------------------------------------------ */

const HYBRID_WEIGHT: Readonly<Record<SpeechMetricId, number>> = {
  contentMatch: 0.35,
  phonemeAccuracy: 0.3,
  toneContour: 0.15,
  rhythm: 0.08,
  pace: 0.06,
  pausing: 0.06
};

/**
 * Combines deterministic prosody with optional recognition/phoneme evidence.
 * Missing providers simply remove those dimensions; they are never replaced
 * with invented values.
 */
export class HybridSpeechEvaluator implements SpeechEvaluationProvider {
  readonly id = "hybrid-speech-verification";
  readonly supportsContentScoring = true;
  readonly supportsPhonemeScoring = true;

  constructor(private readonly prosody = new ModelFreeSpeechEvaluator()) {}

  evaluate(attempt: SpeechAttempt): SpeechEvaluation {
    const base = this.prosody.evaluate(attempt);
    const metrics = [...base.metrics];
    const unavailable = [...base.unavailable];
    const verification: SpeechVerification = { ...base.verification };

    if (attempt.recognition) {
      const value = speechTextSimilarity(
        attempt.recognition.expectedText,
        attempt.recognition.recognizedText
      );
      metrics.unshift({
        id: "contentMatch",
        value,
        band: bandFor(value),
        precise: true,
        adviceKey: value >= 0.9 ? "content.match" : "content.mismatch"
      });
      verification.content = value >= 0.9 ? "matched" : "mismatch";
      verification.recognizedText = attempt.recognition.recognizedText;
      verification.recognitionConfidence = attempt.recognition.confidence;
      verification.recognitionProviderId = attempt.recognition.providerId;
    } else {
      unavailable.push({ id: "contentMatch", reason: "provider-unavailable" });
    }

    if (attempt.phonemes && attempt.phonemes.units.length > 0) {
      const value = clamp01(
        attempt.phonemes.units.reduce((sum, unit) => sum + clamp01(unit.score), 0) /
          attempt.phonemes.units.length
      );
      metrics.splice(attempt.recognition ? 1 : 0, 0, {
        id: "phonemeAccuracy",
        value,
        band: bandFor(value),
        precise: true,
        adviceKey: value >= 0.8 ? "phoneme.ok" : "phoneme.retry"
      });
      verification.pronunciation = "phoneme-verified";
      verification.phonemeProviderId = attempt.phonemes.providerId;
    } else {
      unavailable.push({ id: "phonemeAccuracy", reason: "provider-unavailable" });
    }

    let weighted = 0;
    let totalWeight = 0;
    for (const metric of metrics) {
      const weight = HYBRID_WEIGHT[metric.id];
      weighted += metric.value * weight;
      totalWeight += weight;
    }
    const overall = totalWeight > 0 ? clamp01(weighted / totalWeight) : 0;

    return {
      metrics,
      overall,
      unavailable,
      verification,
      phonemeUnits: attempt.phonemes?.units
    };
  }
}

/** Shared default instances; evaluators are stateless. */
export const modelFreeSpeechEvaluator = new ModelFreeSpeechEvaluator();
export const hybridSpeechEvaluator = new HybridSpeechEvaluator(modelFreeSpeechEvaluator);
