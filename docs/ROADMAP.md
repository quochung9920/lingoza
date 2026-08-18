# Lingoza product roadmap

The roadmap is intentionally ordered by learner value. Lingoza already has enough learning-engine surface area for the current stage; the next milestones turn that architecture into a product people can learn with for weeks and months.

## M0 — Stabilize the repository

- keep generated `node_modules/` and `dist/` out of Git
- keep one authoritative Zalo `app-config.json`
- require core tests/content validation and a production Zalo build in CI
- keep documentation aligned with actual runtime behavior

## M1 — Premium learner experience

- guided onboarding: language, goal, starting band, daily budget
- next-best-action Home
- Course → Unit → Lesson navigation
- real Topic → Unit/Lesson/Conversation exploration
- four-tab mobile navigation: Learn, Speak, Conversation, Progress
- learner settings for support layers, audio behavior and privacy
- accessible touch targets, Zalo safe areas, loading/error/offline states

## M2 — Production audio and speaking

- produce reviewed normal and slow Mandarin recordings
- host recordings on CDN/object storage under language-specific paths
- extract offline reference pitch/energy/phrase features
- compare learner prosody only against real reference data
- keep device speech synthesis as a prototype fallback, not the commercial audio source
- validate that every target-language string resolves to a reviewed playable asset before publish

## M3 — Chinese A0 production curriculum

Target a real multi-week starter course rather than a vertical slice:

- 8–12 units
- 40–60 lessons
- 250–400 lexical items/collocations
- 500–1,000 reviewed example and dialogue sentences
- 30–50 practical conversation situations
- varied review banks for listening, speaking, retrieval and conversation
- unit checkpoints and delayed retention checks

Release only after native-language, pedagogy and audio review.

## M4 — Account and cloud progress

- Zalo platform adapter for identity, lifecycle and permissions
- server-backed `LearnerRepository`
- cross-device mastery/SRS/streak/preferences sync
- conflict-safe offline queue
- delete/export data controls
- never expose private server credentials to the Mini App

## M5 — Evidence-driven learning quality

- wire the existing privacy-safe analytics event contract
- measure 1/7/30-day retention and time-to-mastery
- measure repeat-audio rate, speaking completion and lesson abandonment
- calibrate mastery thresholds, forgetting curves and SRS intervals from learner outcomes
- add experiment/version metadata without collecting raw voice by default

## M6 — Scale content, then languages

- complete A1, then A2/B1/B2/C1/C2 based on validated content-production capacity
- add Content Studio/admin review workflows
- add new languages through the language registry and language packs
- do not fork the learner UI or learning engines per language

## Commercial readiness gate

A commercial release is not considered complete merely because the app builds. It requires:

- reviewed production audio
- validated curriculum depth appropriate to the advertised level
- stable cloud persistence
- privacy and data controls
- crash/error observability
- accessibility/mobile QA
- content review provenance
- real learner beta evidence that retention and speaking behavior improve over time
