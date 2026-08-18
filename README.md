# Lingoza

Lingoza is a multilingual language-learning platform designed to run without an AI model at runtime.

The core idea is to pre-build linguistic knowledge as validated, structured language packs and teach through deterministic engines for answer evaluation, curriculum mastery, dialogue flow, and spaced repetition.

## Principles

- No LLM, generative model, or cloud inference at runtime. Ever.
- Audio-first and speaking-first: if a drill can be spoken, it is spoken. There are no writing exercises and no free-text inputs anywhere in the learner UI.
- Language knowledge is data, not hardcoded UI. The core is language-neutral; anything Chinese-specific lives in a `languageData` bag the framework never reads.
- Every visible target-language string carries playable audio metadata. The content validator enforces this in CI.
- Mastery is a per-skill, decaying vector — never a `learned: true` flag.
- Assessments measure transfer, not recall of a rehearsed string.
- Nothing publishes without four human review sign-offs recorded in its provenance.

### On speech feedback

Lingoza ships no speech recognizer, so it never reports "pronunciation accuracy" or a phoneme score. `ModelFreeSpeechEvaluator` measures only what a waveform actually yields without a model — pitch contour, energy rhythm, pace and pause placement — and reports coarse measurements as qualitative bands rather than percentages. `SpeechEvaluationProvider` is the seam a real recognizer would slot into later; no learning code would change.

## Current structure

```text
apps/
  zalo-mini-app/          React + TypeScript learner client for Zalo Mini App

packages/
  content-schema/         Every content contract: levels, skills, topics, lexicon,
                          patterns, curriculum, dialogue, assessment, provenance
  curriculum-engine/      Concept graph: prerequisites, unlocking, next lesson,
                          learning paths, course/unit progress
  mastery-engine/         Per-skill mastery with forgetting curves and at-risk detection
  evaluation-engine/      Deterministic pattern/slot matching and structured feedback
  dialogue-engine/        Role-play state machine with hints and failure recovery
  pronunciation-engine/   SpeechEvaluationProvider + ModelFreeSpeechEvaluator
  assessment-engine/      Transfer-oriented item selection and per-skill scoring
  srs-engine/             Multi-skill spaced repetition and daily session assembly
  content-validator/      The CI gate that makes the content rules real
  analytics/              Event contracts (no provider wired up, no voice data)
  persistence/            Repository interfaces + memory/web-storage adapters

language-packs/
  zh-CN/                  Reference pack: A0/A1 seed curriculum

tools/
  validate-content.ts     `npm run validate:content`

tests/                    Behavioral tests for the learning core
```

### Vertical slice

The shipped A0/A1 Chinese seed runs the full loop end to end: home suggests the next lesson from the concept graph → unit screen shows can-do outcomes and lesson locks → the lesson player runs listening, shadowing, substitution, guided speaking, quick response and a cafe role-play → each activity feeds the mastery engine → the SRS engine assembles tomorrow's review → the progress screen reflects the change.

Answer evaluation still accepts natural variants through pattern slots rather than one exact string:

```text
我要一杯咖啡
我想要一杯咖啡
我想喝一杯咖啡
```

### Audio status

The pack ships authored audio *metadata* — paths, speeds, durations and phrase segments — but **no recordings exist yet**. The player degrades gracefully (speaker buttons render disabled and labelled rather than disappearing), and `npm run validate:content` reports every missing recording as a warning. Browser speech synthesis is deliberately not used as a stand-in. Audio is served from object storage/CDN via `VITE_LINGOZA_AUDIO_BASE`; none is bundled.

## Requirements

- Git
- Node.js 20 LTS or newer
- npm
- Zalo Mini App CLI (`zmp-cli`)

No database, OpenAI key, GPU, or local AI model is required for the current client/core.

## First-time setup

Clone or update the repository:

```powershell
git clone https://github.com/quochung9920/lingoza.git
cd lingoza
```

If you already cloned it:

```powershell
cd D:\lingoza
git checkout main
git pull origin main
```

Install the core and Mini App dependencies:

```powershell
npm install
npm run setup:zalo
```

Install Zalo Mini App CLI if it is not available yet:

```powershell
npm install -g zmp-cli
zmp --version
```

## Link this source code to the Lingoza Mini App

Lingoza Mini App ID:

```text
922579343002060000
```

Run from the repository root:

```powershell
npm run zalo:init
```

When Zalo asks for the Mini App ID, enter `922579343002060000`.

For an existing project, choose **Using ZMP to deploy only** and finish the Zalo login flow with the Zalo account that owns/manages the Lingoza Mini App.

`zmp init` may generate local environment/configuration data. Local `.env` files are intentionally ignored by Git and must not be committed.

## Run Lingoza

After the first-time setup/linking step:

```powershell
npm run dev:zalo
```

ZMP starts the Mini App development environment. The initial learner UI includes:

- daily learning progress
- lesson cards
- Chinese vocabulary from `language-packs/zh-CN`
- a restaurant conversation scenario
- deterministic natural-answer evaluation using `evaluation-engine`
- no AI/model inference at runtime

## Validate source code

```powershell
npm run check
npm run check:zalo
```

## Deploy to Zalo

Authenticate when needed:

```powershell
npm run zalo:login
```

Then deploy:

```powershell
npm run zalo:deploy
```

Use the Zalo account that has Admin/Developer permission for the Lingoza Mini App to complete any QR/login confirmation requested by Zalo.

## Runtime architecture

```text
Zalo Mini App / Future Web Clients
                |
          Learning Core
      /      /      \       \
Evaluation Curriculum Dialogue  SRS
      \      \      /       /
         Language Pack
                |
         Learner Progress
```

## Next milestones

1. Content validator and pack compiler.
2. Rich semantic groups, synonyms, register and error taxonomy.
3. Chinese normalization, Hanzi/Pinyin/tone-specific adapters.
4. Universal topic/concept ontology.
5. Lesson/exercise generation from templates.
6. Persistent learner mastery model and API.
7. Zalo user identity and permission integration.
8. Admin authoring and content QA tools.
9. Additional language packs using the same core contracts.

The repository is intentionally model-free at runtime. AI may be used during content authoring and QA, but generated content should be compiled and validated before shipping to learners.
