import type { SpeechRecognitionEvidence } from "../../../../packages/pronunciation-engine/src/index";

/**
 * Optional content verifier built on the host Web Speech API.
 *
 * Important privacy/property boundary:
 * - this is NEVER started unless the learner explicitly opted in;
 * - browser/WebView implementations may process recognition off-device;
 * - failure or lack of support degrades to prosody-only scoring;
 * - this verifies what text was recognized, not phoneme accuracy.
 */

interface RecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface RecognitionResultLike {
  readonly length: number;
  readonly isFinal?: boolean;
  [index: number]: RecognitionAlternativeLike;
}

interface RecognitionEventLike {
  readonly results: {
    readonly length: number;
    [index: number]: RecognitionResultLike;
  };
}

interface BrowserRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type BrowserRecognitionConstructor = new () => BrowserRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: BrowserRecognitionConstructor;
  webkitSpeechRecognition?: BrowserRecognitionConstructor;
};

function recognitionConstructor(): BrowserRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as SpeechWindow;
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return recognitionConstructor() !== null;
}

export interface SpeechTextVerifier {
  readonly supported: boolean;
  start(): void;
  stop(expectedText: string): Promise<SpeechRecognitionEvidence | null>;
  cancel(): void;
}

/**
 * One verifier instance can be reused across attempts. The recognizer itself is
 * recreated per attempt because several WebView implementations cannot restart
 * the same SpeechRecognition object reliably after `end`.
 */
export function createBrowserSpeechVerifier(language = "zh-CN"): SpeechTextVerifier {
  let recognition: BrowserRecognitionLike | null = null;
  let transcript = "";
  let confidence: number | undefined;
  let ended = true;
  let resolveEnd: (() => void) | null = null;
  let endPromise: Promise<void> | null = null;

  const finish = () => {
    if (ended) return;
    ended = true;
    resolveEnd?.();
    resolveEnd = null;
  };

  const clean = () => {
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition = null;
  };

  return {
    supported: isBrowserSpeechRecognitionSupported(),

    start() {
      const Constructor = recognitionConstructor();
      if (!Constructor) return;

      transcript = "";
      confidence = undefined;
      ended = false;
      endPromise = new Promise<void>((resolve) => {
        resolveEnd = resolve;
      });

      const instance = new Constructor();
      recognition = instance;
      instance.lang = language;
      instance.continuous = false;
      instance.interimResults = false;
      instance.maxAlternatives = 1;

      instance.onresult = (event) => {
        let bestText = "";
        let bestConfidence = -1;
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          const alternative = result[0];
          if (!alternative?.transcript) continue;
          const score = Number.isFinite(alternative.confidence) ? alternative.confidence : 0;
          if (score >= bestConfidence) {
            bestConfidence = score;
            bestText = alternative.transcript.trim();
          }
        }
        if (bestText) transcript = bestText;
        if (bestConfidence >= 0) confidence = bestConfidence;
      };
      instance.onerror = finish;
      instance.onend = finish;

      try {
        instance.start();
      } catch {
        finish();
        clean();
      }
    },

    async stop(expectedText) {
      const active = recognition;
      const pending = endPromise;
      if (!active || !pending) return null;

      if (!ended) {
        try {
          active.stop();
        } catch {
          finish();
        }
      }

      await Promise.race([
        pending,
        new Promise<void>((resolve) => window.setTimeout(resolve, 1200))
      ]);

      const recognizedText = transcript.trim();
      clean();
      endPromise = null;

      if (!recognizedText) return null;
      return {
        expectedText,
        recognizedText,
        confidence,
        providerId: "browser-web-speech"
      };
    },

    cancel() {
      if (recognition && !ended) {
        try {
          recognition.abort();
        } catch {
          /* best-effort cleanup */
        }
      }
      finish();
      clean();
      endPromise = null;
      transcript = "";
      confidence = undefined;
    }
  };
}
