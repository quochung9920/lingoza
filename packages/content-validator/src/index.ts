import type {
  Activity,
  Assessment,
  ContentBundle,
  ContentId,
  LexicalItem,
  Provenance
} from "../../content-schema/src/index.js";
import {
  ACTIVITY_SKILL_MAP,
  LINGOZA_LEVELS,
  buildTopicIndex,
  isFullyReviewed
} from "../../content-schema/src/index.js";
import { buildCurriculumGraph } from "../../curriculum-engine/src/index.js";
import { deadEndStates, reachableStates } from "../../dialogue-engine/src/index.js";

/**
 * `@lingoza/content-validator` -- the gate that makes the content rules real.
 *
 * Every promise Lingoza makes about its content (every visible utterance has
 * audio, every lesson has a can-do objective, every assessment measures
 * transfer, nothing publishes without four sign-offs) is a rule that a human
 * will eventually forget. Encoding them here turns them into a CI failure with
 * a path and an id instead of a bug a learner finds.
 */

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: IssueSeverity;
  /** Stable machine code, e.g. `audio.missing`. */
  code: string;
  /** Dotted path into the bundle, e.g. `lessons[3].activities[1]`. */
  path: string;
  /** Id of the offending object, when it has one. */
  id?: ContentId;
  message: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  ok: boolean;
}

interface Ctx {
  bundle: ContentBundle;
  issues: ValidationIssue[];
}

function error(ctx: Ctx, code: string, path: string, message: string, id?: ContentId): void {
  ctx.issues.push({ severity: "error", code, path, id, message });
}

function warn(ctx: Ctx, code: string, path: string, message: string, id?: ContentId): void {
  ctx.issues.push({ severity: "warning", code, path, id, message });
}

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

/**
 * Collects every id in the bundle and flags blanks and collisions.
 *
 * Duplicates are checked across the *whole* bundle rather than per collection:
 * ids are used as cross-collection references everywhere, so a lesson sharing
 * an id with a pattern is a real ambiguity even though neither collection is
 * internally duplicated.
 */
function checkIdentity(ctx: Ctx): Set<ContentId> {
  const seen = new Map<ContentId, string>();
  const all = new Set<ContentId>();

  const register = (id: ContentId | undefined, path: string) => {
    if (!id || id.trim() === "") {
      error(ctx, "id.missing", path, "Content object is missing an id.");
      return;
    }
    const previous = seen.get(id);
    if (previous) {
      error(ctx, "id.duplicate", path, `Duplicate id "${id}", already used at ${previous}.`, id);
      return;
    }
    seen.set(id, path);
    all.add(id);
  };

  ctx.bundle.topics.forEach((topic, i) => register(topic.id, `topics[${i}]`));
  ctx.bundle.concepts.forEach((concept, i) => register(concept.id, `concepts[${i}]`));
  ctx.bundle.lexicalItems.forEach((item, i) => register(item.id, `lexicalItems[${i}]`));
  ctx.bundle.sentences.forEach((sentence, i) => register(sentence.id, `sentences[${i}]`));
  ctx.bundle.patterns.forEach((pattern, i) => register(pattern.id, `patterns[${i}]`));
  ctx.bundle.courses.forEach((course, i) => register(course.id, `courses[${i}]`));
  ctx.bundle.units.forEach((unit, i) => register(unit.id, `units[${i}]`));
  ctx.bundle.lessons.forEach((lesson, i) => {
    register(lesson.id, `lessons[${i}]`);
    lesson.activities.forEach((activity, j) =>
      register(activity.id, `lessons[${i}].activities[${j}]`)
    );
  });
  ctx.bundle.scenarios.forEach((scenario, i) => register(scenario.id, `scenarios[${i}]`));
  ctx.bundle.assessments.forEach((assessment, i) => {
    register(assessment.id, `assessments[${i}]`);
    assessment.items.forEach((item, j) =>
      register(item.id, `assessments[${i}].items[${j}]`)
    );
  });

  return all;
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

/**
 * The Universal Audio Rule, enforced.
 *
 * Anything the learner can see in the target language must be playable. A
 * missing recording is only a warning while the item is unpublished -- content
 * has to be writable before it is recorded -- but it hardens into an error the
 * moment something claims PUBLISHED.
 */
function checkAudio(ctx: Ctx): void {
  const check = (
    owner: { id: ContentId; audio: { normal?: { src?: string }; available: boolean }; provenance: Provenance },
    path: string,
    text: string
  ) => {
    if (!owner.audio?.normal?.src) {
      error(
        ctx,
        "audio.metadata.missing",
        path,
        `Linguistic item "${text}" has no audio metadata. Every visible target-language string needs a playable track.`,
        owner.id
      );
      return;
    }
    if (!owner.audio.available) {
      const published = owner.provenance.publishStatus === "PUBLISHED";
      const report = published ? error : warn;
      report(
        ctx,
        "audio.recording.missing",
        path,
        `No recording produced yet for "${text}" (placeholder metadata only).`,
        owner.id
      );
    }
  };

  ctx.bundle.lexicalItems.forEach((item, i) => check(item, `lexicalItems[${i}]`, item.text));
  ctx.bundle.sentences.forEach((sentence, i) =>
    check(sentence, `sentences[${i}]`, sentence.text)
  );
}

/* ------------------------------------------------------------------ */
/* References                                                          */
/* ------------------------------------------------------------------ */

function checkReferences(ctx: Ctx, ids: Set<ContentId>): void {
  const { bundle } = ctx;
  const topicIds = new Set(bundle.topics.map((topic) => topic.id));
  const conceptIds = new Set(bundle.concepts.map((concept) => concept.id));
  const itemIds = new Set(bundle.lexicalItems.map((item) => item.id));
  const sentenceIds = new Set(bundle.sentences.map((sentence) => sentence.id));
  const patternIds = new Set(bundle.patterns.map((pattern) => pattern.id));
  const validLevels = new Set<string>(LINGOZA_LEVELS);

  const ref = (
    id: ContentId | undefined,
    pool: Set<ContentId>,
    code: string,
    path: string,
    ownerId?: ContentId
  ) => {
    if (id === undefined) return;
    if (!pool.has(id)) {
      error(ctx, code, path, `Reference to unknown id "${id}".`, ownerId);
    }
  };

  bundle.topics.forEach((topic, i) => {
    if (topic.parentId !== null) {
      ref(topic.parentId, topicIds, "topic.parent.unknown", `topics[${i}].parentId`, topic.id);
    }
  });

  bundle.concepts.forEach((concept, i) => {
    if (!validLevels.has(concept.level)) {
      error(ctx, "level.invalid", `concepts[${i}].level`, `Unknown level "${concept.level}".`, concept.id);
    }
    concept.requires.forEach((id, j) =>
      ref(id, conceptIds, "prerequisite.unknown", `concepts[${i}].requires[${j}]`, concept.id)
    );
    concept.unlocks.forEach((id, j) =>
      ref(id, conceptIds, "reference.unknown", `concepts[${i}].unlocks[${j}]`, concept.id)
    );
    concept.relatedConcepts.forEach((id, j) =>
      ref(id, conceptIds, "reference.unknown", `concepts[${i}].relatedConcepts[${j}]`, concept.id)
    );
    concept.lexicalItemIds.forEach((id, j) =>
      ref(id, itemIds, "reference.unknown", `concepts[${i}].lexicalItemIds[${j}]`, concept.id)
    );
    concept.patternIds.forEach((id, j) =>
      ref(id, patternIds, "reference.unknown", `concepts[${i}].patternIds[${j}]`, concept.id)
    );
    concept.topics.forEach((id, j) =>
      ref(id, topicIds, "topic.unknown", `concepts[${i}].topics[${j}]`, concept.id)
    );
    if (concept.skills.length === 0) {
      error(ctx, "concept.skills.empty", `concepts[${i}].skills`, "Concept declares no skills.", concept.id);
    }
  });

  bundle.lexicalItems.forEach((item, i) => {
    if (Object.keys(item.meaning).length === 0) {
      error(ctx, "meaning.missing", `lexicalItems[${i}].meaning`, `"${item.text}" has no meaning in any locale.`, item.id);
    }
    if (!item.language || item.language.trim() === "") {
      error(ctx, "language.missing", `lexicalItems[${i}].language`, "Missing language tag.", item.id);
    }
    if (!validLevels.has(item.level)) {
      error(ctx, "level.invalid", `lexicalItems[${i}].level`, `Unknown level "${item.level}".`, item.id);
    }
    item.topics.forEach((id, j) =>
      ref(id, topicIds, "topic.unknown", `lexicalItems[${i}].topics[${j}]`, item.id)
    );
    item.collocations.forEach((id, j) =>
      ref(id, itemIds, "reference.unknown", `lexicalItems[${i}].collocations[${j}]`, item.id)
    );
    item.exampleSentenceIds.forEach((id, j) =>
      ref(id, sentenceIds, "reference.unknown", `lexicalItems[${i}].exampleSentenceIds[${j}]`, item.id)
    );
  });

  bundle.sentences.forEach((sentence, i) => {
    if (!sentence.language || sentence.language.trim() === "") {
      error(ctx, "language.missing", `sentences[${i}].language`, "Missing language tag.", sentence.id);
    }
    if (Object.keys(sentence.translation).length === 0) {
      error(ctx, "meaning.missing", `sentences[${i}].translation`, `"${sentence.text}" has no translation.`, sentence.id);
    }
    sentence.lexicalItemIds.forEach((id, j) =>
      ref(id, itemIds, "reference.unknown", `sentences[${i}].lexicalItemIds[${j}]`, sentence.id)
    );
    ref(sentence.patternId, patternIds, "reference.unknown", `sentences[${i}].patternId`, sentence.id);
  });

  bundle.patterns.forEach((pattern, i) => {
    const slotNames = new Set(pattern.slots.map((slot) => slot.name));
    pattern.templates.forEach((template, j) => {
      for (const match of template.matchAll(/\{([a-zA-Z0-9_-]+)\}/g)) {
        if (!slotNames.has(match[1])) {
          error(
            ctx,
            "pattern.slot.invalid",
            `patterns[${i}].templates[${j}]`,
            `Template references slot "${match[1]}" which the pattern does not define.`,
            pattern.id
          );
        }
      }
    });
    pattern.slots.forEach((slot, j) => {
      if (slot.acceptedItemIds.length === 0 && slot.acceptedSurfaces.length === 0) {
        error(
          ctx,
          "pattern.slot.invalid",
          `patterns[${i}].slots[${j}]`,
          `Slot "${slot.name}" accepts nothing, so no answer can ever match.`,
          pattern.id
        );
      }
      slot.acceptedItemIds.forEach((id, k) =>
        ref(id, itemIds, "reference.unknown", `patterns[${i}].slots[${j}].acceptedItemIds[${k}]`, pattern.id)
      );
    });
    if (pattern.exampleSentenceIds.length < 2) {
      // Patterns are taught by hearing instantiations, so one example is not a
      // lesson -- it is a definition with an illustration.
      error(
        ctx,
        "pattern.examples.insufficient",
        `patterns[${i}].exampleSentenceIds`,
        "A pattern needs at least two example sentences to be taught by ear.",
        pattern.id
      );
    }
    pattern.exampleSentenceIds.forEach((id, j) =>
      ref(id, sentenceIds, "reference.unknown", `patterns[${i}].exampleSentenceIds[${j}]`, pattern.id)
    );
  });

  bundle.courses.forEach((course, i) => {
    course.unitIds.forEach((id, j) => ref(id, ids, "reference.unknown", `courses[${i}].unitIds[${j}]`, course.id));
  });

  bundle.units.forEach((unit, i) => {
    ref(unit.courseId, ids, "reference.unknown", `units[${i}].courseId`, unit.id);
    unit.lessonIds.forEach((id, j) => ref(id, ids, "reference.unknown", `units[${i}].lessonIds[${j}]`, unit.id));
    unit.conceptIds.forEach((id, j) => ref(id, conceptIds, "reference.unknown", `units[${i}].conceptIds[${j}]`, unit.id));
    unit.topics.forEach((id, j) => ref(id, topicIds, "topic.unknown", `units[${i}].topics[${j}]`, unit.id));
    if (unit.canDoObjectives.length === 0) {
      error(ctx, "unit.canDo.missing", `units[${i}].canDoObjectives`, "Unit has no can-do outcomes.", unit.id);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

const LISTENING_KINDS = new Set(["LISTEN_UNDERSTAND", "LISTEN_CHOOSE", "LISTEN_REPEAT", "DIALOGUE", "LISTENING_CHALLENGE", "SHADOWING"]);
const SPEAKING_KINDS = new Set(["LISTEN_REPEAT", "SHADOWING", "PRONUNCIATION_DRILL", "QUICK_RESPONSE", "GUIDED_SPEAKING", "SUBSTITUTION_DRILL", "ROLE_PLAY"]);

/**
 * A lesson is only a lesson if it teaches something nameable and gets the
 * learner both listening and speaking. Rendering a screen is not the bar.
 */
function checkLessons(ctx: Ctx): void {
  const { bundle } = ctx;
  const conceptIds = new Set(bundle.concepts.map((concept) => concept.id));
  const sentenceIds = new Set(bundle.sentences.map((sentence) => sentence.id));
  const itemIds = new Set(bundle.lexicalItems.map((item) => item.id));
  const patternIds = new Set(bundle.patterns.map((pattern) => pattern.id));
  const scenarioIds = new Set(bundle.scenarios.map((scenario) => scenario.id));
  const assessmentIds = new Set(bundle.assessments.map((assessment) => assessment.id));

  bundle.lessons.forEach((lesson, i) => {
    const path = `lessons[${i}]`;

    if (Object.keys(lesson.canDo).length === 0) {
      error(ctx, "lesson.canDo.missing", `${path}.canDo`, "Lesson has no can-do objective.", lesson.id);
    }
    if (lesson.conceptIds.length === 0) {
      error(ctx, "lesson.concepts.missing", `${path}.conceptIds`, "Lesson teaches no concept.", lesson.id);
    }
    lesson.conceptIds.forEach((id, j) => {
      if (!conceptIds.has(id)) {
        error(ctx, "reference.unknown", `${path}.conceptIds[${j}]`, `Unknown concept "${id}".`, lesson.id);
      }
    });
    if (lesson.activities.length === 0) {
      error(ctx, "lesson.activities.empty", `${path}.activities`, "Lesson has no activities.", lesson.id);
      return;
    }

    const kinds = lesson.activities.map((activity) => activity.kind);
    if (!kinds.some((kind) => LISTENING_KINDS.has(kind))) {
      error(ctx, "lesson.listening.missing", `${path}.activities`, "Lesson has no listening activity.", lesson.id);
    }
    if (!kinds.some((kind) => SPEAKING_KINDS.has(kind))) {
      error(ctx, "lesson.speaking.missing", `${path}.activities`, "Lesson has no speaking activity.", lesson.id);
    }

    lesson.activities.forEach((activity, j) => {
      const activityPath = `${path}.activities[${j}]`;
      checkActivityReferences(ctx, activity, activityPath, {
        sentenceIds,
        itemIds,
        patternIds,
        scenarioIds,
        assessmentIds
      });
      if (activity.conceptIds.length === 0) {
        warn(
          ctx,
          "activity.concepts.missing",
          `${activityPath}.conceptIds`,
          "Activity produces no mastery evidence because it maps to no concept.",
          activity.id
        );
      }
      if ((activity.skills ?? ACTIVITY_SKILL_MAP[activity.kind]).length === 0) {
        error(ctx, "activity.skills.empty", `${activityPath}.skills`, "Activity scores no skill.", activity.id);
      }
    });
  });
}

function checkActivityReferences(
  ctx: Ctx,
  activity: Activity,
  path: string,
  pools: {
    sentenceIds: Set<ContentId>;
    itemIds: Set<ContentId>;
    patternIds: Set<ContentId>;
    scenarioIds: Set<ContentId>;
    assessmentIds: Set<ContentId>;
  }
): void {
  const need = (id: ContentId, pool: Set<ContentId>, field: string) => {
    if (!pool.has(id)) {
      error(ctx, "reference.unknown", `${path}.${field}`, `Unknown reference "${id}".`, activity.id);
    }
  };

  switch (activity.kind) {
    case "LISTEN_UNDERSTAND":
      need(activity.sentenceId, pools.sentenceIds, "sentenceId");
      if (
        activity.correctChoiceIndex < 0 ||
        activity.correctChoiceIndex >= activity.choices.length
      ) {
        error(ctx, "activity.choice.invalid", `${path}.correctChoiceIndex`, "Correct choice index is out of range.", activity.id);
      }
      break;
    case "LISTEN_CHOOSE":
      need(activity.promptSentenceId, pools.sentenceIds, "promptSentenceId");
      activity.optionItemIds.forEach((id, i) => need(id, pools.itemIds, `optionItemIds[${i}]`));
      if (!activity.optionItemIds.includes(activity.correctItemId)) {
        error(ctx, "activity.choice.invalid", `${path}.correctItemId`, "Correct item is not among the options.", activity.id);
      }
      break;
    case "LISTEN_REPEAT":
      need(
        activity.targetId,
        activity.targetType === "sentence" ? pools.sentenceIds : pools.itemIds,
        "targetId"
      );
      break;
    case "SHADOWING":
      need(activity.sentenceId, pools.sentenceIds, "sentenceId");
      if (activity.segmentOrder.length === 0) {
        error(ctx, "activity.segments.missing", `${path}.segmentOrder`, "Shadowing needs at least one segment.", activity.id);
      }
      break;
    case "PRONUNCIATION_DRILL":
      activity.targetIds.forEach((id, i) =>
        need(id, activity.targetType === "sentence" ? pools.sentenceIds : pools.itemIds, `targetIds[${i}]`)
      );
      break;
    case "QUICK_RESPONSE":
      need(activity.promptSentenceId, pools.sentenceIds, "promptSentenceId");
      need(activity.expectedPatternId, pools.patternIds, "expectedPatternId");
      activity.hintSentenceIds.forEach((id, i) => need(id, pools.sentenceIds, `hintSentenceIds[${i}]`));
      break;
    case "GUIDED_SPEAKING":
      need(activity.targetSentenceId, pools.sentenceIds, "targetSentenceId");
      need(activity.expectedPatternId, pools.patternIds, "expectedPatternId");
      activity.hintSentenceIds.forEach((id, i) => need(id, pools.sentenceIds, `hintSentenceIds[${i}]`));
      break;
    case "SUBSTITUTION_DRILL":
      need(activity.patternId, pools.patternIds, "patternId");
      activity.substitutionItemIds.forEach((id, i) => need(id, pools.itemIds, `substitutionItemIds[${i}]`));
      break;
    case "DIALOGUE":
    case "ROLE_PLAY":
      need(activity.scenarioId, pools.scenarioIds, "scenarioId");
      break;
    case "LISTENING_CHALLENGE":
      activity.sentenceIds.forEach((id, i) => need(id, pools.sentenceIds, `sentenceIds[${i}]`));
      break;
    case "VOCABULARY_REVIEW":
      activity.itemIds.forEach((id, i) => need(id, pools.itemIds, `itemIds[${i}]`));
      break;
    case "PATTERN_REVIEW":
      activity.patternIds.forEach((id, i) => need(id, pools.patternIds, `patternIds[${i}]`));
      break;
    case "UNIT_CHECKPOINT":
    case "LEVEL_ASSESSMENT":
      need(activity.assessmentId, pools.assessmentIds, "assessmentId");
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Dialogues                                                           */
/* ------------------------------------------------------------------ */

function checkDialogues(ctx: Ctx): void {
  const sentenceIds = new Set(ctx.bundle.sentences.map((sentence) => sentence.id));
  const patternIds = new Set(ctx.bundle.patterns.map((pattern) => pattern.id));

  ctx.bundle.scenarios.forEach((scenario, i) => {
    const path = `scenarios[${i}]`;
    const stateIds = new Set(scenario.states.map((state) => state.id));

    if (!stateIds.has(scenario.initialState)) {
      error(ctx, "dialogue.initialState.unknown", `${path}.initialState`, `Initial state "${scenario.initialState}" does not exist.`, scenario.id);
      return;
    }

    const reachable = reachableStates(scenario);
    scenario.states.forEach((state, j) => {
      const statePath = `${path}.states[${j}]`;

      if (!reachable.has(state.id)) {
        error(ctx, "dialogue.state.unreachable", statePath, `State "${state.id}" cannot be reached from the initial state.`, scenario.id);
      }
      if (state.npcLineSentenceId && !sentenceIds.has(state.npcLineSentenceId)) {
        error(ctx, "reference.unknown", `${statePath}.npcLineSentenceId`, `Unknown sentence "${state.npcLineSentenceId}".`, scenario.id);
      }
      for (const [intent, targetId] of Object.entries(state.transitions)) {
        if (!stateIds.has(targetId)) {
          error(ctx, "dialogue.transition.unknown", `${statePath}.transitions.${intent}`, `Transition targets unknown state "${targetId}".`, scenario.id);
        }
      }
      state.acceptedIntents.forEach((option, k) => {
        if (!state.transitions[option.intent]) {
          error(ctx, "dialogue.intent.unhandled", `${statePath}.acceptedIntents[${k}]`, `Intent "${option.intent}" is accepted but has no transition.`, scenario.id);
        }
        if (!sentenceIds.has(option.sentenceId)) {
          error(ctx, "reference.unknown", `${statePath}.acceptedIntents[${k}].sentenceId`, `Unknown sentence "${option.sentenceId}".`, scenario.id);
        }
        if (option.patternId && !patternIds.has(option.patternId)) {
          error(ctx, "reference.unknown", `${statePath}.acceptedIntents[${k}].patternId`, `Unknown pattern "${option.patternId}".`, scenario.id);
        }
      });
      if (state.learnerTurn && state.acceptedIntents.length === 0) {
        error(ctx, "dialogue.turn.empty", statePath, `Learner turn "${state.id}" offers no intent, so the learner cannot respond.`, scenario.id);
      }
      if (state.recoveryStateId && !stateIds.has(state.recoveryStateId)) {
        error(ctx, "dialogue.transition.unknown", `${statePath}.recoveryStateId`, `Recovery targets unknown state "${state.recoveryStateId}".`, scenario.id);
      }
    });

    for (const state of deadEndStates(scenario)) {
      error(ctx, "dialogue.deadEnd", `${path}.states`, `State "${state.id}" is a dead end: not terminal and no way forward.`, scenario.id);
    }
    if (!scenario.states.some((state) => state.terminal)) {
      error(ctx, "dialogue.terminal.missing", `${path}.states`, "Scenario has no terminal state.", scenario.id);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Assessments                                                         */
/* ------------------------------------------------------------------ */

/**
 * Assessments must measure transfer.
 *
 * The check is concrete rather than aspirational: if an item names the lesson
 * activity it derives from and reuses that activity's own prompt sentence, the
 * learner is being asked to recall a rehearsed string, and the item is
 * rejected.
 */
function checkAssessments(ctx: Ctx): void {
  const sentenceIds = new Set(ctx.bundle.sentences.map((sentence) => sentence.id));
  const conceptIds = new Set(ctx.bundle.concepts.map((concept) => concept.id));
  const patternIds = new Set(ctx.bundle.patterns.map((pattern) => pattern.id));

  // Sentence each activity actually drills, so reuse can be detected.
  const drilled = new Map<ContentId, ContentId>();
  for (const lesson of ctx.bundle.lessons) {
    for (const activity of lesson.activities) {
      switch (activity.kind) {
        case "LISTEN_UNDERSTAND":
        case "SHADOWING":
          drilled.set(activity.id, activity.sentenceId);
          break;
        case "LISTEN_CHOOSE":
        case "QUICK_RESPONSE":
          drilled.set(activity.id, activity.promptSentenceId);
          break;
        case "GUIDED_SPEAKING":
          drilled.set(activity.id, activity.targetSentenceId);
          break;
        case "LISTEN_REPEAT":
          if (activity.targetType === "sentence") drilled.set(activity.id, activity.targetId);
          break;
        default:
          break;
      }
    }
  }

  ctx.bundle.assessments.forEach((assessment: Assessment, i) => {
    const path = `assessments[${i}]`;
    if (assessment.items.length === 0) {
      error(ctx, "assessment.items.empty", `${path}.items`, "Assessment has no items.", assessment.id);
      return;
    }
    if (assessment.itemsPerSitting > assessment.items.length) {
      warn(
        ctx,
        "assessment.sitting.oversized",
        `${path}.itemsPerSitting`,
        `Sitting asks for ${assessment.itemsPerSitting} items but the bank holds ${assessment.items.length}; every sitting will be identical.`,
        assessment.id
      );
    }

    assessment.items.forEach((item, j) => {
      const itemPath = `${path}.items[${j}]`;
      if (!conceptIds.has(item.conceptId)) {
        error(ctx, "reference.unknown", `${itemPath}.conceptId`, `Unknown concept "${item.conceptId}".`, item.id);
      }
      if (!sentenceIds.has(item.promptSentenceId)) {
        error(ctx, "reference.unknown", `${itemPath}.promptSentenceId`, `Unknown sentence "${item.promptSentenceId}".`, item.id);
      }
      if (item.expectedPatternId && !patternIds.has(item.expectedPatternId)) {
        error(ctx, "reference.unknown", `${itemPath}.expectedPatternId`, `Unknown pattern "${item.expectedPatternId}".`, item.id);
      }
      if (item.responseMode === "speak") {
        if (!item.expectedPatternId) {
          error(ctx, "assessment.item.invalid", itemPath, "Spoken item has no expected pattern to check against.", item.id);
        }
      } else if (
        item.correctChoiceIndex === undefined ||
        !item.choices ||
        item.correctChoiceIndex < 0 ||
        item.correctChoiceIndex >= item.choices.length
      ) {
        error(ctx, "assessment.item.invalid", itemPath, "Choice item has no valid correct answer.", item.id);
      }

      const drilledSentence = item.derivedFromActivityId
        ? drilled.get(item.derivedFromActivityId)
        : undefined;
      if (drilledSentence && drilledSentence === item.promptSentenceId) {
        error(
          ctx,
          "assessment.reuse.verbatim",
          `${itemPath}.promptSentenceId`,
          `Item replays the exact sentence drilled by activity "${item.derivedFromActivityId}". Assessments must probe transfer, not recall of a rehearsed string.`,
          item.id
        );
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Graph & orphan checks                                               */
/* ------------------------------------------------------------------ */

function checkGraph(ctx: Ctx): void {
  const graph = buildCurriculumGraph(ctx.bundle);
  if (ctx.bundle.concepts.length > 0 && graph.topologicalOrder().length === 0) {
    error(
      ctx,
      "concept.graph.cycle",
      "concepts",
      "The concept prerequisite graph contains a cycle, so no valid learning order exists."
    );
  }

  // `unlocks` is authored, so it can drift out of step with `requires`.
  for (const [i, concept] of ctx.bundle.concepts.entries()) {
    for (const [j, unlockedId] of concept.unlocks.entries()) {
      const target = graph.concept(unlockedId);
      if (target && !target.requires.includes(concept.id)) {
        warn(
          ctx,
          "concept.unlocks.asymmetric",
          `concepts[${i}].unlocks[${j}]`,
          `"${concept.id}" claims to unlock "${unlockedId}", but that concept does not require it.`,
          concept.id
        );
      }
    }
  }
}

/**
 * Lexical items no lesson or concept ever reaches.
 *
 * A word nothing teaches is dead weight in the bundle: it costs bundle size
 * and review-queue noise while never appearing in a lesson.
 */
function checkOrphans(ctx: Ctx): void {
  const referenced = new Set<ContentId>();

  for (const concept of ctx.bundle.concepts) {
    concept.lexicalItemIds.forEach((id) => referenced.add(id));
  }
  for (const sentence of ctx.bundle.sentences) {
    sentence.lexicalItemIds.forEach((id) => referenced.add(id));
  }
  for (const pattern of ctx.bundle.patterns) {
    for (const slot of pattern.slots) slot.acceptedItemIds.forEach((id) => referenced.add(id));
  }
  for (const item of ctx.bundle.lexicalItems) {
    item.collocations.forEach((id) => referenced.add(id));
  }
  for (const lesson of ctx.bundle.lessons) {
    for (const activity of lesson.activities) {
      if (activity.kind === "VOCABULARY_REVIEW") activity.itemIds.forEach((id) => referenced.add(id));
      if (activity.kind === "LISTEN_CHOOSE") activity.optionItemIds.forEach((id) => referenced.add(id));
      if (activity.kind === "SUBSTITUTION_DRILL") activity.substitutionItemIds.forEach((id) => referenced.add(id));
      if (activity.kind === "LISTEN_REPEAT" && activity.targetType === "lexicalItem") referenced.add(activity.targetId);
      if (activity.kind === "PRONUNCIATION_DRILL" && activity.targetType === "lexicalItem") {
        activity.targetIds.forEach((id) => referenced.add(id));
      }
    }
  }

  ctx.bundle.lexicalItems.forEach((item: LexicalItem, i) => {
    if (!referenced.has(item.id)) {
      warn(
        ctx,
        "vocabulary.orphan",
        `lexicalItems[${i}]`,
        `"${item.text}" is not reachable from any concept, sentence, pattern or activity.`,
        item.id
      );
    }
  });
}

/* ------------------------------------------------------------------ */
/* Topics & provenance                                                 */
/* ------------------------------------------------------------------ */

function checkTopics(ctx: Ctx): void {
  const index = buildTopicIndex(ctx.bundle.topics);
  ctx.bundle.topics.forEach((topic, i) => {
    if (Object.keys(topic.label).length === 0) {
      error(ctx, "topic.invalid", `topics[${i}].label`, "Topic has no label.", topic.id);
    }
    // A topic reachable from its own ancestry means the tree is not a tree.
    if (index.ancestorsOf(topic.id).some((ancestor) => ancestor.id === topic.id)) {
      error(ctx, "topic.cycle", `topics[${i}]`, `Topic "${topic.id}" is its own ancestor.`, topic.id);
    }
  });
}

/**
 * Nothing reaches learners without four human sign-offs.
 *
 * This is the commercial-safety gate: it is also where an unlicensed import
 * would be caught, because `license` and `sourceReferences` are required
 * fields rather than documentation.
 */
function checkProvenance(ctx: Ctx): void {
  const audit = (provenance: Provenance | undefined, path: string, id: ContentId) => {
    if (!provenance) {
      error(ctx, "provenance.missing", path, "Content object has no provenance record.", id);
      return;
    }
    if (!provenance.license || provenance.license.trim() === "") {
      error(ctx, "provenance.license.missing", `${path}.license`, "Content has no declared license.", id);
    }
    if (provenance.origin === "licensed-import" && provenance.sourceReferences.length === 0) {
      error(
        ctx,
        "provenance.source.missing",
        `${path}.sourceReferences`,
        "Imported content must record where it came from and under what license.",
        id
      );
    }
    if (provenance.publishStatus === "PUBLISHED" && !isFullyReviewed(provenance)) {
      error(
        ctx,
        "provenance.review.incomplete",
        path,
        "Content is marked PUBLISHED but has not passed all four review gates.",
        id
      );
    }
  };

  ctx.bundle.concepts.forEach((c, i) => audit(c.provenance, `concepts[${i}].provenance`, c.id));
  ctx.bundle.lexicalItems.forEach((c, i) => audit(c.provenance, `lexicalItems[${i}].provenance`, c.id));
  ctx.bundle.sentences.forEach((c, i) => audit(c.provenance, `sentences[${i}].provenance`, c.id));
  ctx.bundle.patterns.forEach((c, i) => audit(c.provenance, `patterns[${i}].provenance`, c.id));
  ctx.bundle.courses.forEach((c, i) => audit(c.provenance, `courses[${i}].provenance`, c.id));
  ctx.bundle.units.forEach((c, i) => audit(c.provenance, `units[${i}].provenance`, c.id));
  ctx.bundle.lessons.forEach((c, i) => audit(c.provenance, `lessons[${i}].provenance`, c.id));
  ctx.bundle.scenarios.forEach((c, i) => audit(c.provenance, `scenarios[${i}].provenance`, c.id));
  ctx.bundle.assessments.forEach((c, i) => audit(c.provenance, `assessments[${i}].provenance`, c.id));
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function validateBundle(bundle: ContentBundle): ValidationReport {
  const ctx: Ctx = { bundle, issues: [] };

  const ids = checkIdentity(ctx);
  checkTopics(ctx);
  checkReferences(ctx, ids);
  checkAudio(ctx);
  checkLessons(ctx);
  checkDialogues(ctx);
  checkAssessments(ctx);
  checkGraph(ctx);
  checkOrphans(ctx);
  checkProvenance(ctx);

  const errorCount = ctx.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = ctx.issues.length - errorCount;

  return { issues: ctx.issues, errorCount, warningCount, ok: errorCount === 0 };
}

/** Human-readable report for the CLI. */
export function formatReport(report: ValidationReport, label: string): string {
  const lines = [`Content validation: ${label}`];
  if (report.issues.length === 0) {
    lines.push("  No issues found.");
  }
  for (const issue of report.issues) {
    const marker = issue.severity === "error" ? "ERROR" : "warn ";
    lines.push(`  ${marker} [${issue.code}] ${issue.path}${issue.id ? ` (${issue.id})` : ""}`);
    lines.push(`        ${issue.message}`);
  }
  lines.push(`  ${report.errorCount} error(s), ${report.warningCount} warning(s).`);
  return lines.join("\n");
}
