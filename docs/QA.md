# Lingoza QA gates

## Source gate

Every change should pass:

```powershell
npm ci
npm run check
npm --prefix apps/zalo-mini-app ci
npm run check:zalo
npm run build:zalo
```

The GitHub workflow runs the same core/type/build path on `main` and pull requests.

## Content gate

Run:

```powershell
npm run validate:content
npm run report:content
```

A content object cannot be treated as commercial-ready when required recordings or human review sign-offs remain absent, even if automated validation has no structural errors.

## Critical learner smoke flow

Before a Development release on Zalo, verify on a real phone:

1. fresh install reaches onboarding once
2. existing learner progress migrates without being reset
3. Home identifies the next curriculum lesson
4. Course/Unit/Topic navigation reaches real content
5. every target-language speaker control responds and never overlaps another clip
6. slow/replay controls work
7. microphone permission is requested only at the first speaking action
8. learner can record, stop and play back their attempt
9. completing an activity changes mastery/review state
10. completing a lesson changes Home/Progress
11. conversation role-play can reach a terminal state
12. settings persist Pinyin/translation/audio/daily-goal choices
13. reload preserves progress
14. the production `dist` deploy opens inside Zalo without missing asset errors

## Audio gate

For production curriculum, speaker buttons must use reviewed recordings. Device speech synthesis is acceptable only as a development/internal-test fallback.

Verify:

- normal and slow variants resolve through the language audio base path
- no two clips play simultaneously
- replay is deterministic
- shadowing segment timing stays inside track duration
- failed network audio produces usable feedback rather than a dead control
- reference prosody is derived from real reviewed audio before tone/rhythm scores are shown as meaningful comparison

## Accessibility/mobile gate

- interactive targets remain at least 44 px
- icon-only buttons have accessible names
- focus-visible works in browser development
- reduced-motion preference is respected
- information is not encoded by color alone
- Zalo menu/status/safe-area regions do not cover controls
- UI remains usable at narrow Android widths and larger text settings

## Data/privacy gate

- no App Secret/private key/server credential in frontend or Git
- microphone requested just in time
- raw voice is not included in analytics events
- default recording retention is zero
- server-backed persistence, when added, must expose deletion/export controls before commercial launch
