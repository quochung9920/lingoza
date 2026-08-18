# Lingoza Speech Gateway

Server-side gateway for opt-in pronunciation assessment. The Mini App never receives Azure Speech credentials.

## What it does

- accepts short learner attempts at `POST /v1/pronunciation/assess`;
- requires `zh-CN` and 16 kHz mono PCM WAV input from the Mini App;
- calls Azure Speech short-audio pronunciation assessment in scripted mode;
- requests `HundredMark`, `Phoneme`, `Comprehensive`, and miscue output;
- normalizes recognized text, phoneme scores, word scores, accuracy, fluency, completeness, and overall pronunciation score into Lingoza evidence;
- never stores the audio and never logs the learner utterance or provider key.

Azure Prosody Assessment is intentionally not requested for Mandarin. Lingoza keeps Mandarin tone/rhythm analysis in its own signal engine because Azure currently documents Prosody Assessment as `en-US` only.

## Local setup

1. Copy `services/speech-api/.env.example` values into your local environment. Do not commit real secrets.
2. Build the repository with `npm run build`.
3. Start the gateway with `npm run start:speech-api`.
4. Point the Mini App at the gateway with `VITE_LINGOZA_SPEECH_ASSESSMENT_URL=http://localhost:8787/v1/pronunciation/assess` in `apps/zalo-mini-app/.env.local`.
5. In Lingoza Settings, explicitly enable **Chấm phát âm nâng cao**.

## Production boundary

This is a speech-provider gateway, not the final account/auth layer. In production, deploy it behind Lingoza's authenticated API/gateway, TLS, rate limiting, abuse protection, request-size limits, and observability that excludes raw audio and learner text. Keep `AZURE_SPEECH_KEY` server-side only.

The REST adapter is intended for short lesson utterances. Longer shadowing, conversation, or streaming assessment should use a streaming-capable server provider implementation behind the same Lingoza contract rather than stretching this endpoint beyond its intended scope.
