import type { AudioFeatures } from "../../../../packages/pronunciation-engine/src/index";

/**
 * Microphone capture and acoustic feature extraction.
 *
 * The recorder exists to produce two things: a blob the learner can play back
 * to themselves, and an `AudioFeatures` frame series for the model-free
 * evaluator. Nothing is uploaded, and by default nothing is kept -- the blob's
 * object URL is revoked as soon as the attempt is discarded.
 *
 * Permission is requested at `start()`, i.e. the moment the learner taps the
 * microphone, never at app launch.
 */

export type RecorderStatus =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "processing"
  | "denied"
  | "unsupported";

export interface Recording {
  /** Object URL for learner playback. Revoke via `disposeRecording`. */
  url: string;
  blob: Blob;
  durationMs: number;
  features: AudioFeatures;
  /** Downsampled envelope for the waveform, 0..1. */
  envelope: number[];
}

const FRAME_MS = 20;
const WAVEFORM_BARS = 48;

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !==
      "undefined"
  );
}

/**
 * Autocorrelation pitch detection over one frame.
 *
 * Chosen over FFT-based methods because it is short, dependency-free, and
 * accurate enough for *contour* comparison, which is all the evaluator claims
 * to measure. It returns 0 for frames with too little energy or no clear
 * period, and those frames are treated as unvoiced rather than as pitch zero.
 */
function detectPitch(frame: Float32Array, sampleRate: number): number {
  const size = frame.length;

  let rms = 0;
  for (let i = 0; i < size; i += 1) rms += frame[i] * frame[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return 0;

  // Human speech f0 sits roughly in 70-400 Hz; searching outside that range
  // mostly finds octave errors.
  const minPeriod = Math.floor(sampleRate / 400);
  const maxPeriod = Math.floor(sampleRate / 70);

  let bestPeriod = -1;
  let bestCorrelation = 0;

  for (let period = minPeriod; period <= maxPeriod && period < size; period += 1) {
    let correlation = 0;
    for (let i = 0; i < size - period; i += 1) {
      correlation += frame[i] * frame[i + period];
    }
    correlation /= size - period;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  if (bestPeriod <= 0 || bestCorrelation < 0.01) return 0;
  return sampleRate / bestPeriod;
}

/** Decodes a recorded blob into per-frame pitch and energy. */
export async function extractFeatures(blob: Blob): Promise<{
  features: AudioFeatures;
  envelope: number[];
}> {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioCtor();

  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const frameSize = Math.floor((FRAME_MS / 1000) * sampleRate);
    const frameCount = Math.max(1, Math.floor(channel.length / frameSize));

    const pitchHz: number[] = [];
    const energy: number[] = [];
    let peak = 0;

    for (let f = 0; f < frameCount; f += 1) {
      const frame = channel.subarray(f * frameSize, (f + 1) * frameSize);
      let rms = 0;
      for (let i = 0; i < frame.length; i += 1) rms += frame[i] * frame[i];
      rms = Math.sqrt(rms / Math.max(1, frame.length));
      peak = Math.max(peak, rms);
      energy.push(rms);
      pitchHz.push(detectPitch(frame as Float32Array, sampleRate));
    }

    // Normalize energy against this recording's own peak so a quiet phone mic
    // is not scored as poor rhythm.
    const normalized = peak > 0 ? energy.map((value) => value / peak) : energy;

    const envelope: number[] = [];
    const bucket = Math.max(1, Math.floor(normalized.length / WAVEFORM_BARS));
    for (let i = 0; i < WAVEFORM_BARS; i += 1) {
      const slice = normalized.slice(i * bucket, (i + 1) * bucket);
      envelope.push(slice.length === 0 ? 0 : Math.max(...slice));
    }

    return {
      features: {
        pitchHz,
        energy: normalized,
        frameMs: FRAME_MS,
        durationMs: buffer.duration * 1000
      },
      envelope
    };
  } finally {
    void context.close();
  }
}

export interface SpeechRecorder {
  readonly supported: boolean;
  start(): Promise<void>;
  stop(): Promise<Recording | null>;
  cancel(): void;
}

/**
 * Creates a recorder bound to one microphone session.
 *
 * The media stream's tracks are stopped after every attempt rather than held
 * open between them. That costs a few hundred milliseconds on the next tap and
 * buys the learner a microphone indicator that is only lit while they are
 * actually being recorded.
 */
export function createSpeechRecorder(): SpeechRecorder {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;

  const releaseStream = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };

  return {
    supported: isRecordingSupported(),

    async start() {
      if (!isRecordingSupported()) throw new Error("recording-unsupported");
      chunks = [];
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      startedAt = Date.now();
      recorder.start();
    },

    async stop() {
      const active = recorder;
      if (!active || active.state === "inactive") {
        releaseStream();
        return null;
      }

      const blob = await new Promise<Blob>((resolve) => {
        active.addEventListener(
          "stop",
          () => resolve(new Blob(chunks, { type: active.mimeType || "audio/webm" })),
          { once: true }
        );
        active.stop();
      });

      releaseStream();
      recorder = null;

      const wallClockMs = Date.now() - startedAt;
      const { features, envelope } = await extractFeatures(blob);

      return {
        blob,
        url: URL.createObjectURL(blob),
        // Decoded duration is authoritative; wall clock is the fallback when a
        // container reports no duration, which some webviews do.
        durationMs: features.durationMs > 0 ? features.durationMs : wallClockMs,
        features,
        envelope
      };
    },

    cancel() {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recorder = null;
      chunks = [];
      releaseStream();
    }
  };
}

/** Frees a recording's object URL. Called whenever an attempt is discarded. */
export function disposeRecording(recording: Recording | null): void {
  if (recording) URL.revokeObjectURL(recording.url);
}

/**
 * Synthesises reference features from an authored clip's metadata.
 *
 * Real reference recordings do not exist yet, so comparing a learner's attempt
 * against a real waveform is impossible today. Rather than fabricate a
 * plausible-looking pitch track and pass off the resulting numbers as tone
 * feedback, this builds a flat reference from the authored duration and
 * segment boundaries: pace and pausing remain genuinely measurable against it,
 * while tone and rhythm correlate against a constant and are therefore
 * reported as unavailable by the evaluator. That is the honest degradation.
 */
export function referenceFeaturesFromMetadata(
  durationMs: number,
  segments?: Array<{ startMs: number; endMs: number }>
): AudioFeatures {
  const frameCount = Math.max(1, Math.round(durationMs / FRAME_MS));
  const energy = new Array<number>(frameCount).fill(0.8);

  if (segments && segments.length > 1) {
    // Mark the gaps between authored phrases as silence so pause placement is
    // compared against something real.
    for (let i = 0; i < segments.length - 1; i += 1) {
      const gapStart = Math.floor(segments[i].endMs / FRAME_MS);
      const gapEnd = Math.floor(segments[i + 1].startMs / FRAME_MS);
      for (let f = gapStart; f < gapEnd && f < frameCount; f += 1) energy[f] = 0.02;
    }
  }

  return {
    pitchHz: new Array<number>(frameCount).fill(0),
    energy,
    frameMs: FRAME_MS,
    durationMs
  };
}
