# Lingoza

Lingoza is a multilingual language-learning platform designed to run without an AI model at runtime.

The core idea is to pre-build linguistic knowledge as validated, structured language packs and teach through deterministic engines for answer evaluation, curriculum mastery, dialogue flow, and spaced repetition.

## Principles

- No LLM or generative model required at runtime.
- Language knowledge is data, not hardcoded UI.
- One universal curriculum/concept layer can support many languages.
- Every language pack follows the same contracts while retaining language-specific rules.
- Natural answer variants are represented through grammar frames, slots, synonyms, and language adapters.
- Learner state tracks skill-level mastery instead of a single "lesson completed" flag.

## Current structure

```text
apps/
  zalo-mini-app/         React + TypeScript learner client for Zalo Mini App

packages/
  content-schema/       Shared contracts for concepts, vocabulary, grammar and dialogue
  evaluation-engine/    Deterministic answer matching and structured feedback
  curriculum-engine/    Prerequisite graph and skill mastery
  dialogue-engine/      Scenario/state-machine conversations
  srs-engine/           Spaced repetition scheduling

language-packs/
  zh-CN/                First reference language pack

tests/                  Behavioral tests for the learning core
```

The first Zalo learner screen already consumes the shared `zh-CN` language pack and `evaluation-engine`. A learner can answer the restaurant exercise with natural variants such as:

```text
我要一杯咖啡
我想要一杯咖啡
我想喝一杯咖啡
```

The app evaluates these through intent + grammar patterns + slots rather than an AI model or one exact expected string.

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
