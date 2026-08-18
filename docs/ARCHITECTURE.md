# Lingoza architecture

## Design rule

Business/learning logic belongs in framework packages, language knowledge belongs in language packs, and clients orchestrate/present those capabilities. React components must not become a second implementation of mastery, SRS, curriculum or dialogue rules.

```text
apps/zalo-mini-app
        |
        +-- App / screens / design system
        +-- learner/content/audio providers
        +-- device adapters (recorder, future Zalo adapter)
        |
packages/* learning core
        |
language registry
        |
language-packs/zh-CN
```

## Learning core

- `content-schema`: contracts for taxonomy, lexical data, curriculum, activities, dialogues, assessment, provenance and audio.
- `curriculum-engine`: prerequisite graph, unlocking, course/unit progress, next lesson and topic-independent learning paths.
- `mastery-engine`: decaying per-skill mastery and active/passive knowledge depth.
- `srs-engine`: `(concept, skill)` review scheduling and daily session assembly.
- `evaluation-engine`: deterministic syntax/pattern/slot evaluation.
- `dialogue-engine`: deterministic role-play state machine with recovery paths.
- `assessment-engine`: transfer-oriented item selection/scoring.
- `pronunciation-engine`: model-free prosody comparison; no phoneme-recognition claims.
- `content-validator`: executable content quality rules.
- `persistence`: learner repository interfaces plus prototype browser/memory adapters.
- `analytics`: privacy-safe event contracts with no network provider enabled by default.

## Learner client

The Zalo Mini App intentionally keeps navigation small and explicit. Lesson playback is fullscreen; the main shell has four learner tabs. Topic discovery, unit detail, settings and scenarios are secondary routes and do not expand bottom navigation.

## Language packs

The learner client uses `language-registry.ts`. A registered pack supplies a `ContentBundle` and a language-specific audio base path. Core packages do not import Chinese data directly.

Chinese-specific data such as Pinyin, simplified/traditional forms, tones, classifiers and HSK references must stay inside the pack/schema language-data boundary.

## Audio

```text
AudioAsset.src: items/zh.w.hello.mp3
LanguageProfile.audioBasePath: zh-CN
VITE_LINGOZA_AUDIO_BASE: https://cdn.example/audio

=> https://cdn.example/audio/zh-CN/items/zh.w.hello.mp3
```

One `AudioManager` owns playback, preventing overlapping clips. Reviewed recordings win; current seed content may use device speech synthesis only as a temporary fallback while `audio.available` remains false.

## Speaking

Microphone capture happens only when the learner starts a speaking activity. Raw attempts are not uploaded by the current client. The default evaluator compares measurable prosody features and does not claim speech recognition.

Production tone/rhythm feedback requires real reference recordings and offline-extracted reference features; metadata-only references cannot support those claims.

## Persistence

Screens depend on `LearnerRepository`, not directly on a future API. Browser storage is a prototype adapter. The production path is a server-backed implementation carrying mastery, review schedule, streak, preferences and entitlements across devices.

## Platform boundary

Zalo-specific APIs should be added behind a `ZaloPlatformAdapter` rather than invoked throughout screens. That future adapter owns identity, lifecycle, permissions, share/deep-link behavior and platform capabilities.
