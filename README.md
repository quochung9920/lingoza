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

## Current foundation

```text
packages/
  content-schema/       Shared contracts for concepts, vocabulary, grammar and dialogue
  evaluation-engine/    Deterministic answer matching and structured feedback
  curriculum-engine/    Prerequisite graph and skill mastery
  dialogue-engine/      Scenario/state-machine conversations
  srs-engine/           Spaced repetition scheduling

language-packs/
  zh-CN/                First reference language pack

tests/                  Behavioral tests for the core
```

## Example

The Chinese pack can accept multiple natural ways of ordering a drink through one grammar frame:

```text
我要一杯咖啡
我想要一杯咖啡
我想喝一杯咖啡
```

These are matched through intent + grammar pattern + slots rather than one exact expected string.

## Runtime architecture

```text
Zalo Mini App / Web / Future Clients
                |
         Application API
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
7. Zalo Mini App learner client.
8. Admin authoring and content QA tools.
9. Additional language packs using the same core contracts.

## Development

```bash
npm install
npm run check
```

The repository is intentionally model-free at runtime. AI may be used during content authoring and QA, but generated content should be compiled and validated before shipping to learners.
