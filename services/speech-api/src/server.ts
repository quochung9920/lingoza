import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

/**
 * Lingoza speech gateway.
 *
 * This service is deliberately server-only. Provider credentials are read from
 * environment variables and are never returned to the Mini App. The current
 * adapter uses Azure Speech short-audio pronunciation assessment for scripted
 * Mandarin attempts and normalizes provider output into Lingoza evidence.
 *
 * Required environment:
 *   AZURE_SPEECH_REGION
 *   AZURE_SPEECH_KEY
 *
 * Optional:
 *   PORT=8787
 *   LINGOZA_ALLOWED_ORIGIN=https://your-mini-app-origin.example
 */

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const DEFAULT_PORT = 8787;
const PROVIDER_ID = "azure-speech-pronunciation-v1";

type JsonRecord = Record<string, unknown>;

interface AssessmentRequest {
  targetId?: string;
  targetText: string;
  language: "zh-CN";
  contentType: string;
  audioBase64: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function score01(value: unknown): number | undefined {
  const numeric = numberValue(value);
  if (numeric === undefined) return undefined;
  return Math.max(0, Math.min(1, numeric / 100));
}

function tickToMs(value: unknown): number | undefined {
  const ticks = numberValue(value);
  return ticks === undefined ? undefined : ticks / 10_000;
}

function applyCors(response: ServerResponse): void {
  const origin = process.env.LINGOZA_ALLOWED_ORIGIN?.trim();
  if (!origin) return;
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  applyCors(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("request-too-large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function parseRequest(value: unknown): AssessmentRequest | null {
  if (!isRecord(value)) return null;
  const targetText = value.targetText;
  const language = value.language;
  const contentType = value.contentType;
  const audioBase64 = value.audioBase64;
  const targetId = value.targetId;

  if (
    typeof targetText !== "string" ||
    targetText.trim().length === 0 ||
    targetText.length > 500 ||
    language !== "zh-CN" ||
    typeof contentType !== "string" ||
    !contentType.toLowerCase().startsWith("audio/wav") ||
    typeof audioBase64 !== "string" ||
    audioBase64.length === 0
  ) {
    return null;
  }

  return {
    targetId: typeof targetId === "string" ? targetId : undefined,
    targetText: targetText.trim(),
    language,
    contentType,
    audioBase64
  };
}

function azureEndpoint(region: string, language: string): string {
  if (!/^[a-z0-9-]+$/i.test(region)) throw new Error("invalid-azure-region");
  const query = new URLSearchParams({ language, format: "detailed" });
  return `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?${query.toString()}`;
}

function pronunciationHeader(targetText: string): string {
  // Azure currently exposes zh-CN phoneme names with SAPI. Prosody Assessment
  // itself is not enabled here because Microsoft documents that feature as
  // en-US only; Lingoza's local Mandarin prosody engine remains responsible for
  // tone/rhythm evidence.
  const config = {
    ReferenceText: targetText,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
    EnableMiscue: "True"
  };
  return Buffer.from(JSON.stringify(config), "utf8").toString("base64");
}

function normalizeAzureResponse(raw: unknown, expectedText: string): JsonRecord {
  const root = isRecord(raw) ? raw : {};
  const nbest = Array.isArray(root.NBest) && isRecord(root.NBest[0]) ? root.NBest[0] : {};
  const fullAssessment = isRecord(nbest.PronunciationAssessment)
    ? nbest.PronunciationAssessment
    : {};
  const recognizedText =
    typeof nbest.Display === "string"
      ? nbest.Display
      : typeof nbest.Lexical === "string"
        ? nbest.Lexical
        : typeof root.DisplayText === "string"
          ? root.DisplayText
          : "";

  const phonemeUnits: JsonRecord[] = [];
  const wordResults: JsonRecord[] = [];
  const words = Array.isArray(nbest.Words) ? nbest.Words : [];

  for (const wordValue of words) {
    if (!isRecord(wordValue)) continue;
    const wordText = typeof wordValue.Word === "string" ? wordValue.Word : "";
    const wordAssessment = isRecord(wordValue.PronunciationAssessment)
      ? wordValue.PronunciationAssessment
      : {};

    wordResults.push({
      text: wordText,
      accuracy: score01(wordAssessment.AccuracyScore),
      errorType: typeof wordAssessment.ErrorType === "string" ? wordAssessment.ErrorType : undefined
    });

    const phonemes = Array.isArray(wordValue.Phonemes) ? wordValue.Phonemes : [];
    for (const phonemeValue of phonemes) {
      if (!isRecord(phonemeValue) || typeof phonemeValue.Phoneme !== "string") continue;
      const phonemeAssessment = isRecord(phonemeValue.PronunciationAssessment)
        ? phonemeValue.PronunciationAssessment
        : {};
      const startMs = tickToMs(phonemeValue.Offset);
      const durationMs = tickToMs(phonemeValue.Duration);
      phonemeUnits.push({
        expected: phonemeValue.Phoneme,
        score: score01(phonemeAssessment.AccuracyScore) ?? 0,
        startMs,
        endMs:
          startMs !== undefined && durationMs !== undefined
            ? startMs + durationMs
            : undefined
      });
    }
  }

  return {
    providerId: PROVIDER_ID,
    recognition: recognizedText
      ? {
          expectedText,
          recognizedText,
          confidence: numberValue(nbest.Confidence),
          providerId: PROVIDER_ID
        }
      : undefined,
    phonemes:
      phonemeUnits.length > 0
        ? {
            providerId: PROVIDER_ID,
            units: phonemeUnits
          }
        : undefined,
    summary: {
      accuracy: score01(fullAssessment.AccuracyScore),
      fluency: score01(fullAssessment.FluencyScore),
      completeness: score01(fullAssessment.CompletenessScore),
      pronunciation: score01(fullAssessment.PronScore)
    },
    words: wordResults
  };
}

async function assessWithAzure(input: AssessmentRequest): Promise<JsonRecord> {
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  if (!region || !key) throw new Error("speech-provider-not-configured");

  const audio = Buffer.from(input.audioBase64, "base64");
  if (audio.length === 0 || audio.length > 3 * 1024 * 1024) throw new Error("invalid-audio");

  const response = await fetch(azureEndpoint(region, input.language), {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Pronunciation-Assessment": pronunciationHeader(input.targetText),
      "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
      Accept: "application/json"
    },
    body: audio
  });

  const raw = (await response.json()) as unknown;
  if (!response.ok) {
    const providerMessage = isRecord(raw) && typeof raw.Message === "string" ? raw.Message : "provider-error";
    throw new Error(`azure-speech:${response.status}:${providerMessage}`);
  }

  return normalizeAzureResponse(raw, input.targetText);
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    applyCors(response);
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method !== "POST" || request.url?.split("?")[0] !== "/v1/pronunciation/assess") {
    sendJson(response, 404, { error: "not-found" });
    return;
  }

  try {
    const input = parseRequest(await readJson(request));
    if (!input) {
      sendJson(response, 400, { error: "invalid-request" });
      return;
    }

    const result = await assessWithAzure(input);
    sendJson(response, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "assessment-failed";
    const status = message === "request-too-large" ? 413 : message === "speech-provider-not-configured" ? 503 : 502;
    // Do not log target text, audio, provider keys, or provider response bodies.
    console.error(`[speech-api] assessment failed: ${message.split(":")[0]}`);
    sendJson(response, status, { error: status === 503 ? "provider-not-configured" : "assessment-failed" });
  }
});

const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
server.listen(Number.isFinite(port) ? port : DEFAULT_PORT, () => {
  console.log(`[speech-api] listening on port ${Number.isFinite(port) ? port : DEFAULT_PORT}`);
});
