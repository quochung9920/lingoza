# Lingoza

Lingoza is an audio-first, speaking-first language-learning platform. The first learner client is a Zalo Mini App; the learning core is language-neutral and designed to support additional clients and language packs later.

## Product principles

- **Listen and speak first.** If an activity can be spoken instead of typed, Lingoza prefers speech. The learner UI has no writing exercises.
- **Every target-language utterance is playable.** Words, phrases, examples, prompts, answers and dialogue turns carry audio metadata and use the shared audio controls.
- **No LLM or generative AI at learner runtime.** Curriculum, mastery, evaluation, dialogue flow and review scheduling are deterministic.
- **Mastery is per skill, not `learned: true`.** Listening, meaning recognition, active recall, speaking, pronunciation/prosody, conversation and retention can progress separately.
- **Content is data.** Language-specific knowledge lives in language packs; React screens consume the generic content contracts.
- **Assessment measures transfer.** Checkpoints should test whether a learner can use a concept in a new context, not replay a memorized lesson string.
- **Commercial content remains review-gated.** Automated validation does not replace native-speaker, pedagogy and audio review.

## Current learner experience

The current vertical slice supports:

- first-run onboarding for goal, starting band and daily practice budget
- premium mobile-first Home with a curriculum-driven next lesson
- A0/A1 course and unit map
- real topic exploration into matching units, lessons and conversations
- listening, listen-and-choose, repeat, shadowing, substitution, guided speaking and quick response
- deterministic role-play conversations
- microphone capture and learner playback
- model-free prosody feedback architecture for pitch contour, rhythm, pace and pausing
- multi-skill mastery and spaced repetition
- adaptive review queue
- skill-level progress dashboard
- learner controls for Pinyin, translations, audio preferences, daily goal and privacy
- persisted prototype progress in browser storage, behind a repository interface ready for a server adapter

The Chinese pack is intentionally a **representative A0/A1 vertical slice**, not yet a complete commercial course. Use `npm run report:content` to inspect its current coverage.

## HSK 1-9 curriculum program

Lingoza now carries a complete **nine-band production blueprint** for an HSK-aligned Chinese program. The blueprint lives in `language-packs/zh-CN/src/hsk-production-plan.ts` and defines, for every HSK 1-9 band:

- ordered stage and examination-syllabus bucket
- internal authoring themes
- listening/speaking outcomes
- minimum commercial production depth for units, lessons, reviewed utterances, conversation scenarios and assessments
- explicit full-standard capability gaps instead of unsupported equivalence claims

The production floors across all nine bands total **180 units, 900 lessons, 20,700 reviewed utterances, 820 conversation scenarios and 189 transfer assessments**. These are **Lingoza-owned production targets**, not official HSK item-count requirements and not evidence that the material has already been authored or reviewed.

Current learner-content status remains deliberately conservative:

- HSK 1: `building`, with the existing A0/A1 foundation contributing to it
- HSK 2-9: `planned`
- no HSK band is marked `available`
- the exact HSK reference catalog remains review-gated before coverage percentages can be claimed
- production audio and human linguistic/native/pedagogy/audio sign-off remain required before commercial release

Lingoza's learner runtime is intentionally listening/speaking first. Full external-standard parity also involves reading, writing and translation; those dimensions are tracked as explicit parity gaps rather than being silently claimed as supported.

Inspect the program and its production targets with:

```powershell
npm run report:hsk
```

## Runtime architecture

```text
Zalo Mini App
     |
Learner UI / Design System
     |
Providers / platform adapters
     |
+---------------- Learning Core ----------------+
| Curriculum | Mastery | SRS | Dialogue | Eval |
| Assessment | Pronunciation | Content Validator|
+-----------------------------------------------+
     |
Language registry
     |
zh-CN pack today / more packs later
```

Core packages include:

```text
packages/
  content-schema/
  curriculum-engine/
  mastery-engine/
  evaluation-engine/
  dialogue-engine/
  pronunciation-engine/
  assessment-engine/
  srs-engine/
  content-validator/
  persistence/
  analytics/
```

## Audio status

The content schema already carries normal/slow recording paths, speaker metadata, durations and phrase segments. The learner client resolves production recordings beneath the active language pack path, for example:

```text
<AUDIO_BASE>/zh-CN/items/...
<AUDIO_BASE>/zh-CN/sentences/...
```

Set the production/staging root with:

```text
VITE_LINGOZA_AUDIO_BASE
```

The seed pack does **not** yet contain reviewed recordings. While those assets are being produced, the app can use the host device's speech synthesis as a prototype/internal-test fallback so speaker buttons remain usable. `audio.available` stays false, and the content validator continues to report the missing reviewed recordings. Commercial releases should use pre-produced, reviewed audio served from CDN/object storage rather than relying on device speech synthesis.

## Speaking feedback

Lingoza currently ships no speech recognizer. It therefore does not claim phoneme-level or word-recognition accuracy. `ModelFreeSpeechEvaluator` is limited to signals that can be measured from audio without a recognizer:

- pitch/tone contour when a real reference is available
- rhythm/energy shape
- pace
- pause placement

`SpeechEvaluationProvider` is the extension seam for a future recognizer-backed provider if the product policy changes. The learning core does not depend on one.

## Requirements

- Git
- Node.js 20 LTS or newer
- npm
- Zalo Mini App CLI (`zmp-cli`)

No OpenAI key, GPU or AI model is required.

## Install

```powershell
cd D:\lingoza
npm ci
npm run setup:zalo
```

If ZMP CLI is not installed:

```powershell
npm install -g zmp-cli
zmp --version
```

## Run locally

Local learner development uses **Vite**, not `zmp start`:

```powershell
cd D:\lingoza
npm run dev:zalo
```

Open the local URL printed by Vite, normally:

```text
http://localhost:5173/
```

## Validate

```powershell
npm run check
npm run check:zalo
npm run build:zalo
npm run report:content
npm run report:hsk
```

`npm run check` compiles the core, runs tests and validates content. CI also performs a production Zalo Mini App build.

## Deploy a Development build to Zalo

The current app is deployed as an existing web project.

```powershell
cd D:\lingoza
npm run build:zalo
cd apps\zalo-mini-app
zmp deploy
```

When prompted, use:

```text
Deploy your existing project
Dist folder: dist
Version: Development
```

Then open the generated Development entry/QR with the Zalo account that has access to the Mini App.

Lingoza Mini App ID:

```text
922579343002060000
```

The authoritative Zalo build configuration lives only at:

```text
apps/zalo-mini-app/app-config.json
```

## Content quality

The validator checks, among other rules:

- duplicate and broken content IDs
- invalid prerequisites and topic references
- missing audio metadata / recordings
- lessons without can-do outcomes
- lessons without listening or speaking practice
- invalid syntax slots
- unreachable dialogue states and dead ends
- assessment items that replay lesson prompts verbatim
- publish status without required review evidence

Run:

```powershell
npm run validate:content
```

## Current priorities

1. Produce reviewed normal/slow Mandarin recordings and reference acoustic features.
2. Author the HSK 1 production blueprint to its commercial depth before marking the band available.
3. Populate and cross-check the HSK reference catalog so exact coverage can be measured without fabricated percentages.
4. Scale authored HSK 2-9 learner content band by band while preserving review and audio gates.
5. Increase authored review-item variation so review measures retrieval instead of exact lesson memory.
6. Add Zalo identity and a server-backed learner repository for cross-device progress.
7. Wire privacy-safe learning analytics and calibrate mastery/SRS from real retention data.
8. Add an authoring/admin workflow once the production content model has stabilized.

See `docs/ROADMAP.md` for the product milestones.
