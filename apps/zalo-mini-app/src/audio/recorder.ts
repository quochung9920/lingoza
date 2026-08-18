import type { AudioFeatures } from "../../../../packages/pronunciation-engine/src/index";

/**
 * Microphone capture and acoustic feature extraction.
 *
 * The recorder produces three things from one short learner attempt:
 * - the original browser recording for immediate local playback;
 * - deterministic acoustic features used by Lingoza's local prosody scorer;
 * - a 16 kHz mono PCM WAV blob suitable for the optional pronunciation gateway.
 *
 * Nothing is uploaded by this module. Uploading the assessment blob is a
 * separate, explicit-consent decision made by the speaking surface.
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
  /** Original MediaRecorder container, used only for local playback. */
  blob: Blob;
  /** Normalized 16 kHz mono PCM WAV for an opt-in speech assessment provider. */
  assessmentAudio: Blob;
  durationMs: number;
  features: AudioFeatures;
  /** Downsampled envelope for the waveform, 0..1. */
  envelope: number[];
}

const FRAME_MS = 20;
const WAVEFORM_BARS = 48;
const ASSESSMENT_SAMPLE_RATE = 16_000;

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
 * accurate enough for contour comparison. It returns 0 for frames with too
 * little energy or no clear period; those frames are treated as unvoiced.
 */
function detectPitch(frame: Float32Array, sampleRate: number): number {
  const size = frame.length;

  let rms = 0;
  for (let i = 0; i < size; i += 1) rms += frame[i] * frame[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return 0;

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

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

/**
 * Converts decoded browser audio into the format accepted by the short-audio
 * pronunciation gateway: 16 kHz, mono, signed 16-bit PCM WAV.
 *
 * Resampling is linear and channel mixing is an arithmetic mean. This is not a
 * studio encoder; it is intentionally small and deterministic for short speech
 * attempts where intelligibility matters more than music-grade fidelity.
 */
export function encodeAssessmentWav(
  buffer: AudioBuffer,
  targetSampleRate = ASSESSMENT_SAMPLE_RATE
): Blob {
  const sourceRate = buffer.sampleRate;
  const outputLength = Math.max(1, Math.round(buffer.duration * targetSampleRate));
  const bytesPerSample = 2;
  const wav = new ArrayBuffer(44 + outputLength * bytesPerSample);
  const view = new DataView(wav);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + outputLength * bytesPerSample, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, outputLength * bytesPerSample, true);

  const channels = Array.from(
    { length: buffer.numberOfChannels },
    (_, channel) => buffer.getChannelData(channel)
  );

  for (let i = 0; i < outputLength; i += 1) {
    const sourcePosition = (i * sourceRate) / targetSampleRate;
    const low = Math.min(Math.floor(sourcePosition), buffer.length - 1);
    const high = Math.min(low + 1, buffer.length - 1);
    const fraction = sourcePosition - low;

    let mono = 0;
    for (const channel of channels) {
      mono += channel[low] + (channel[high] - channel[low]) * fraction;
    }
    mono /= Math.max(1, channels.length);
    const clamped = Math.max(-1, Math.min(1, mono));
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(44 + i * bytesPerSample, Math.round(pcm), true);
  }

  return new Blob([wav], { type: "audio/wav" });
}

/** Decodes a recorded blob into acoustic features and assessment audio. */
export async function extractFeatures(blob: Blob): Promise<{
  features: AudioFeatures;
  envelope: number[];
  assessmentAudio: Blob;
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
      envelope,
      assessmentAudio: encodeAssessmentWav(buffer)
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

/** Creates a recorder bound to one microphone session. */
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
      const { features, envelope, assessmentAudio } = await extractFeatures(blob);

      return {
        blob,
        assessmentAudio,
        url: URL.createObjectURL(blob),
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
 * Until native reference waveforms are authored, this keeps pitch at zero so
 * tone/rhythm are reported unavailable rather than fabricated. Duration and
 * phrase gaps still make pace and pause placement measurable.
 */
export function referenceFeaturesFromMetadata(
  durationMs: number,
  segments?: Array<{ startMs: number; endMs: number }>
): AudioFeatures {
  const frameCount = Math.max(1, Math.round(durationMs / FRAME_MS));
  const energy = new Array<number>(frameCount).fill(0.8);

  if (segments && segments.length > 1) {
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
