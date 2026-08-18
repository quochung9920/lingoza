import type {
  PhonemeEvidence,
  SpeechRecognitionEvidence
} from "../../../../packages/pronunciation-engine/src/index";

/**
 * Browser client for Lingoza's pronunciation gateway.
 *
 * The gateway URL is configuration, not a provider secret. Azure or any future
 * provider credential stays on the server. No request is made unless the
 * learner explicitly enabled advanced pronunciation assessment.
 */

const SPEECH_ASSESSMENT_URL = (
  import.meta.env?.VITE_LINGOZA_SPEECH_ASSESSMENT_URL as string | undefined
)?.trim();

export interface PronunciationWordResult {
  text: string;
  accuracy?: number;
  errorType?: string;
}

export interface PronunciationGatewaySummary {
  accuracy?: number;
  fluency?: number;
  completeness?: number;
  pronunciation?: number;
}

export interface PronunciationGatewayResult {
  providerId: string;
  recognition?: SpeechRecognitionEvidence;
  phonemes?: PhonemeEvidence;
  summary?: PronunciationGatewaySummary;
  words?: PronunciationWordResult[];
}

export interface PronunciationGatewayRequest {
  audio: Blob;
  targetText: string;
  language: string;
  targetId: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function finite01(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Defensive normalization at the network boundary. */
function normalizeGatewayResult(value: unknown): PronunciationGatewayResult | null {
  if (!isRecord(value) || typeof value.providerId !== "string") return null;

  let recognition: SpeechRecognitionEvidence | undefined;
  if (isRecord(value.recognition)) {
    const expectedText = value.recognition.expectedText;
    const recognizedText = value.recognition.recognizedText;
    const providerId = value.recognition.providerId;
    if (
      typeof expectedText === "string" &&
      typeof recognizedText === "string" &&
      typeof providerId === "string"
    ) {
      recognition = {
        expectedText,
        recognizedText,
        providerId,
        confidence: finite01(value.recognition.confidence)
      };
    }
  }

  let phonemes: PhonemeEvidence | undefined;
  if (isRecord(value.phonemes) && typeof value.phonemes.providerId === "string") {
    const units = Array.isArray(value.phonemes.units)
      ? value.phonemes.units.flatMap((unit) => {
          if (!isRecord(unit) || typeof unit.expected !== "string") return [];
          const score = finite01(unit.score);
          if (score === undefined) return [];
          return [
            {
              expected: unit.expected,
              observed: typeof unit.observed === "string" ? unit.observed : undefined,
              score,
              startMs: typeof unit.startMs === "number" ? unit.startMs : undefined,
              endMs: typeof unit.endMs === "number" ? unit.endMs : undefined
            }
          ];
        })
      : [];
    if (units.length > 0) phonemes = { providerId: value.phonemes.providerId, units };
  }

  const summary = isRecord(value.summary)
    ? {
        accuracy: finite01(value.summary.accuracy),
        fluency: finite01(value.summary.fluency),
        completeness: finite01(value.summary.completeness),
        pronunciation: finite01(value.summary.pronunciation)
      }
    : undefined;

  const words = Array.isArray(value.words)
    ? value.words.flatMap((word) => {
        if (!isRecord(word) || typeof word.text !== "string") return [];
        return [
          {
            text: word.text,
            accuracy: finite01(word.accuracy),
            errorType: typeof word.errorType === "string" ? word.errorType : undefined
          }
        ];
      })
    : undefined;

  return {
    providerId: value.providerId,
    recognition,
    phonemes,
    summary,
    words
  };
}

export function isAdvancedPronunciationConfigured(): boolean {
  return Boolean(SPEECH_ASSESSMENT_URL);
}

/**
 * Sends one short PCM WAV attempt to the configured Lingoza backend.
 * The endpoint is expected to be same-origin or CORS-enabled by deployment.
 */
export async function assessPronunciationWithGateway(
  request: PronunciationGatewayRequest
): Promise<PronunciationGatewayResult | null> {
  if (!SPEECH_ASSESSMENT_URL) return null;

  const bytes = new Uint8Array(await request.audio.arrayBuffer());
  const response = await fetch(SPEECH_ASSESSMENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      targetId: request.targetId,
      targetText: request.targetText,
      language: request.language,
      contentType: "audio/wav; codecs=audio/pcm; samplerate=16000",
      audioBase64: bytesToBase64(bytes)
    })
  });

  if (!response.ok) return null;
  return normalizeGatewayResult((await response.json()) as unknown);
}
