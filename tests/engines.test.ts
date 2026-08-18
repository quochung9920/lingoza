import { describe, expect, it } from "vitest";

import {
  ACTIVITY_SKILL_MAP,
  buildTopicIndex,
  isFullyReviewed,
  levelRank
} from "../packages/content-schema/src/index.js";
import {
  buildCurriculumGraph,
  courseProgress,
  isConceptMastered,
  learningPathTo,
  levelSkillProfile,
  nextLesson,
  toMasteryLookup,
  weakConcepts
} from "../packages/curriculum-engine/src/index.js";
import {
  applyOutcome,
  applyOutcomes,
  atRiskSkills,
  decayedScore,
  knowledgeDepth,
  nextSkillToPractice,
  projectMastery,
  type MasteryState
} from "../packages/mastery-engine/src/index.js";
import {
  assembleSession,
  dueItems,
  ratingFromScore,
  recordReview,
  reviewKey
} from "../packages/srs-engine/src/index.js";
import {
  advanceDialogueV2,
  conversationScore,
  deadEndStates,
  reachableStates,
  startDialogueV2
} from "../packages/dialogue-engine/src/index.js";
import {
  compilePatternToFrame,
  evaluateAnswer,
  realizePattern
} from "../packages/evaluation-engine/src/index.js";
import {
  recommendLevel,
  scoreAssessment,
  selectItems
} from "../packages/assessment-engine/src/index.js";
import { validateBundle } from "../packages/content-validator/src/index.js";
import { chineseBundle, frameFor, lexicalItems, patterns } from "../language-packs/zh-CN/src/index.js";

const graph = buildCurriculumGraph(chineseBundle);

const DAY = 86_400_000;
const T0 = "2026-08-18T09:00:00.000Z";
const at = (dayOffset: number) => new Date(Date.parse(T0) + dayOffset * DAY).toISOString();

/* ------------------------------------------------------------------ */

describe("content schema", () => {
  it("orders levels so A1 outranks A0", () => {
    expect(levelRank("A1")).toBeGreaterThan(levelRank("A0"));
  });

  it("resolves topic ancestry through nested branches", () => {
    const index = buildTopicIndex(chineseBundle.topics);
    expect(index.isWithin("food.restaurant.ordering", "food")).toBe(true);
    expect(index.isWithin("food.restaurant.ordering", "travel")).toBe(false);
    expect(index.ancestorsOf("food.restaurant.ordering").map((topic) => topic.id)).toEqual([
      "food.restaurant",
      "food"
    ]);
  });

  it("treats every activity kind as scoring at least one skill", () => {
    for (const [kind, skills] of Object.entries(ACTIVITY_SKILL_MAP)) {
      expect(skills.length, kind).toBeGreaterThan(0);
    }
  });

  it("does not consider seed content fully reviewed", () => {
    // The pack ships without human sign-off; claiming otherwise would make the
    // validator's publish gate meaningless.
    expect(isFullyReviewed(chineseBundle.lessons[0].provenance)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe("curriculum graph", () => {
  it("produces a valid topological order with no cycles", () => {
    const order = graph.topologicalOrder();
    expect(order).toHaveLength(chineseBundle.concepts.length);

    const seen = new Set<string>();
    for (const concept of order) {
      for (const required of concept.requires) expect(seen.has(required)).toBe(true);
      seen.add(concept.id);
    }
  });

  it("resolves the prerequisite closure of ordering a drink", () => {
    const closure = graph.prerequisiteClosure("restaurant.order");
    expect(closure).toContain("greeting.basic");
    expect(closure).toContain("classifier.cup");
    // Transitive: classifier.cup requires number.basic.
    expect(closure).toContain("number.basic");
  });

  it("suggests the first unmastered lesson and advances as concepts are learned", () => {
    const empty = toMasteryLookup([]);
    const first = nextLesson(graph, empty);
    expect(first?.lesson.id).toBe("zh.lesson.a0.hello");

    const withGreetings = toMasteryLookup([
      {
        conceptId: "greeting.basic",
        skills: { listeningRecognition: 0.9, meaningRecognition: 0.9, speaking: 0.9, pronunciation: 0.9 }
      }
    ]);
    expect(nextLesson(graph, withGreetings)?.lesson.id).toBe("zh.lesson.a0.name");
  });

  it("requires every declared skill to clear its threshold before mastery", () => {
    const concept = graph.concept("greeting.basic")!;
    const partial = toMasteryLookup([
      { conceptId: "greeting.basic", skills: { listeningRecognition: 0.95 } }
    ]);
    expect(isConceptMastered(concept, partial)).toBe(false);

    const full = toMasteryLookup([
      {
        conceptId: "greeting.basic",
        skills: { listeningRecognition: 0.9, meaningRecognition: 0.9, speaking: 0.9, pronunciation: 0.9 }
      }
    ]);
    expect(isConceptMastered(concept, full)).toBe(true);
  });

  it("reports the ordered path to a gated concept", () => {
    const path = learningPathTo(graph, "restaurant.order", toMasteryLookup([]));
    expect(path[path.length - 1].id).toBe("restaurant.order");
    expect(path.findIndex((c) => c.id === "number.basic")).toBeLessThan(
      path.findIndex((c) => c.id === "classifier.cup")
    );
  });

  it("marks units locked, in-progress and completed", () => {
    const untouched = courseProgress(graph, "zh.course.a1", toMasteryLookup([]));
    expect(untouched[0].status).toBe("locked");

    const started = courseProgress(
      graph,
      "zh.course.a1",
      toMasteryLookup([
        { conceptId: "greeting.basic", skills: { listeningRecognition: 0.9, speaking: 0.9 } },
        { conceptId: "beverage.basic", skills: { listeningRecognition: 0.4 } }
      ])
    );
    expect(started[0].status).toBe("in-progress");
  });

  it("counts unpractised concepts as zero in the level skill profile", () => {
    const profile = levelSkillProfile(graph, "A1", toMasteryLookup([]));
    expect(Object.values(profile).every((value) => value === 0)).toBe(true);
  });

  it("reports practised-but-weak concepts, not unseen ones", () => {
    const weak = weakConcepts(
      graph,
      toMasteryLookup([{ conceptId: "greeting.basic", skills: { speaking: 0.3 } }])
    );
    expect(weak).toHaveLength(1);
    expect(weak[0].conceptId).toBe("greeting.basic");
    expect(weak[0].weakSkills).toContain("speaking");
  });
});

/* ------------------------------------------------------------------ */

describe("mastery engine", () => {
  it("splits one outcome across the skills the activity proves", () => {
    const state = applyOutcome({}, {
      conceptIds: ["greeting.basic"],
      kind: "LISTEN_REPEAT",
      score: 0.9,
      at: T0
    });

    const skills = state["greeting.basic"].skills;
    expect(Object.keys(skills).sort()).toEqual(
      [...ACTIVITY_SKILL_MAP.LISTEN_REPEAT].sort()
    );
    expect(skills.speaking?.score).toBeCloseTo(0.9, 5);
  });

  it("decays an unpractised skill over time", () => {
    const state = applyOutcome({}, {
      conceptIds: ["greeting.basic"],
      kind: "LISTEN_CHOOSE",
      score: 1,
      at: T0
    });
    const skill = state["greeting.basic"].skills.listeningRecognition!;

    expect(decayedScore(skill, T0)).toBeCloseTo(1, 5);
    expect(decayedScore(skill, at(10))).toBeLessThan(0.6);
    expect(decayedScore(skill, at(10))).toBeGreaterThan(0);
  });

  it("extends the half-life as a success streak builds", () => {
    let streaked: MasteryState = {};
    for (let day = 0; day < 4; day += 1) {
      streaked = applyOutcome(streaked, {
        conceptIds: ["a"],
        kind: "LISTEN_CHOOSE",
        score: 1,
        at: at(day)
      });
    }
    const once = applyOutcome({}, {
      conceptIds: ["b"],
      kind: "LISTEN_CHOOSE",
      score: 1,
      at: at(3)
    });

    const later = at(13);
    expect(decayedScore(streaked.a.skills.listeningRecognition!, later)).toBeGreaterThan(
      decayedScore(once.b.skills.listeningRecognition!, later)
    );
  });

  it("distinguishes passive understanding from active production", () => {
    const passive = applyOutcome({}, {
      conceptIds: ["beverage.basic"],
      kind: "LISTEN_UNDERSTAND",
      score: 0.9,
      at: T0
    });
    expect(knowledgeDepth(passive, "beverage.basic")).toBe("passive");

    const active = applyOutcome(passive, {
      conceptIds: ["beverage.basic"],
      kind: "GUIDED_SPEAKING",
      score: 0.95,
      at: T0
    });
    expect(knowledgeDepth(active, "beverage.basic")).toBe("active");
  });

  it("never lets a stale high score ratchet mastery upward", () => {
    const old = applyOutcome({}, {
      conceptIds: ["x"],
      kind: "LISTEN_CHOOSE",
      score: 1,
      at: T0
    });
    // A mediocre attempt three weeks later must pull the score down, not blend
    // against the long-decayed original as if it were still current.
    const refreshed = applyOutcome(old, {
      conceptIds: ["x"],
      kind: "LISTEN_CHOOSE",
      score: 0.5,
      at: at(21)
    });
    expect(refreshed.x.skills.listeningRecognition!.score).toBeLessThan(0.6);
  });

  it("surfaces skills approaching the at-risk line, soonest first", () => {
    const state = applyOutcomes({}, [
      { conceptIds: ["fresh"], kind: "LISTEN_CHOOSE", score: 1, at: at(6) },
      { conceptIds: ["stale"], kind: "LISTEN_CHOOSE", score: 1, at: T0 }
    ]);
    const risks = atRiskSkills(state, at(7), undefined, 30);
    expect(risks[0].conceptId).toBe("stale");
  });

  it("picks the weakest declared skill to practise next", () => {
    const concept = graph.concept("restaurant.order")!;
    const state = applyOutcome({}, {
      conceptIds: ["restaurant.order"],
      kind: "LISTEN_UNDERSTAND",
      score: 1,
      at: T0
    });
    const skill = nextSkillToPractice(concept, state, T0);
    // Listening is satisfied; production is untouched and must come next.
    expect(["activeRecall", "speaking", "conversation", "pronunciation"]).toContain(skill);
  });

  it("projects decayed mastery into the curriculum engine's shape", () => {
    const state = applyOutcome({}, {
      conceptIds: ["greeting.basic"],
      kind: "LISTEN_CHOOSE",
      score: 1,
      at: T0
    });
    const [record] = projectMastery(state, T0);
    expect(record.conceptId).toBe("greeting.basic");
    expect(record.skills.listeningRecognition).toBeCloseTo(1, 5);
  });
});

/* ------------------------------------------------------------------ */

describe("srs engine", () => {
  it("maps scores onto ratings", () => {
    expect(ratingFromScore(1)).toBe("easy");
    expect(ratingFromScore(0.8)).toBe("good");
    expect(ratingFromScore(0.6)).toBe("hard");
    expect(ratingFromScore(0.2)).toBe("again");
  });

  it("schedules per (concept, skill) pair independently", () => {
    let schedule = recordReview({}, { conceptId: "c", skill: "speaking" }, 1, T0);
    schedule = recordReview(schedule, { conceptId: "c", skill: "listeningRecognition" }, 0.2, T0);

    const speaking = schedule[reviewKey({ conceptId: "c", skill: "speaking" })];
    const listening = schedule[reviewKey({ conceptId: "c", skill: "listeningRecognition" })];
    expect(speaking.intervalDays).toBeGreaterThan(listening.intervalDays);
  });

  it("returns only elapsed items as due", () => {
    const schedule = recordReview({}, { conceptId: "c", skill: "speaking" }, 1, T0);
    expect(dueItems(schedule, T0)).toHaveLength(0);
    expect(dueItems(schedule, at(30))).toHaveLength(1);
  });

  it("interleaves concepts and respects the time budget", () => {
    const plan = assembleSession(
      [],
      [],
      [
        { conceptId: "a", skill: "speaking", score: 0.2 },
        { conceptId: "a", skill: "pronunciation", score: 0.2 },
        { conceptId: "b", skill: "speaking", score: 0.2 },
        { conceptId: "b", skill: "pronunciation", score: 0.2 }
      ],
      { budgetSeconds: 300 }
    );

    expect(plan.estimatedSeconds).toBeLessThanOrEqual(300);
    // Consecutive slots must not come from the same concept.
    for (let i = 1; i < plan.slots.length; i += 1) {
      expect(plan.slots[i].conceptId).not.toBe(plan.slots[i - 1].conceptId);
    }
  });

  it("prioritises due items over merely weak ones", () => {
    const plan = assembleSession(
      [
        {
          conceptId: "due",
          skill: "speaking",
          intervalDays: 1,
          ease: 2.5,
          repetitions: 1,
          dueAt: T0
        }
      ],
      [],
      [{ conceptId: "weak", skill: "speaking", score: 0.1 }],
      { budgetSeconds: 600 }
    );
    expect(plan.slots[0].conceptId).toBe("due");
    expect(plan.slots[0].reason).toBe("due");
  });

  it("caps how much of one session a single concept can take", () => {
    const weak = (["speaking", "pronunciation", "activeRecall", "conversation", "retention"] as const).map(
      (skill) => ({ conceptId: "hog", skill, score: 0.1 })
    );
    const plan = assembleSession([], [], weak, { budgetSeconds: 3600, maxPerConcept: 2 });
    expect(plan.slots.length).toBeLessThanOrEqual(2);
  });

  it("only assigns listening or speaking activities to review slots", () => {
    const plan = assembleSession([], [], [{ conceptId: "a", skill: "retention", score: 0.1 }], {
      budgetSeconds: 300
    });
    for (const slot of plan.slots) {
      expect(slot.kind).not.toBe("LEVEL_ASSESSMENT");
    }
  });
});

/* ------------------------------------------------------------------ */

describe("evaluation engine", () => {
  it("compiles a v2 pattern into a matchable frame", () => {
    const frame = frameFor("zh.p.want-action");
    expect(evaluateAnswer("我想喝咖啡。", frame).patternMatched).toBe(true);
    expect(evaluateAnswer("我想吃饭", frame).patternMatched).toBe(true);
    expect(evaluateAnswer("咖啡想我喝", frame).patternMatched).toBe(false);
  });

  it("reports which slot is missing rather than a bare score", () => {
    const result = evaluateAnswer("我想咖啡", frameFor("zh.p.want-action"));
    expect(result.missingSlots).toContain("verb");
    expect(result.feedback.join(" ")).toMatch(/喝|uống|verb/i);
  });

  it("realizes a sentence from slot fillers", () => {
    const pattern = patterns.find((candidate) => candidate.id === "zh.p.want-action")!;
    expect(
      realizePattern(pattern, { subject: "我", verb: "喝", object: "茶" })
    ).toBe("我想喝茶");
  });

  it("rejects a pattern whose slot references an unknown item", () => {
    const broken = {
      ...patterns[0],
      slots: [{ ...patterns[0].slots[0], acceptedItemIds: ["zh.w.does-not-exist"] }]
    };
    expect(() => compilePatternToFrame(broken, lexicalItems, { locale: "vi-VN" })).toThrow(
      /unknown lexical item/
    );
  });
});

/* ------------------------------------------------------------------ */

describe("dialogue engine v2", () => {
  const scenario = chineseBundle.scenarios.find((s) => s.id === "zh.dialogue.cafe-order")!;

  it("advances on a declared intent", () => {
    const session = startDialogueV2(scenario);
    const result = advanceDialogueV2(scenario, session, "restaurant.order.drink", { score: 0.9 });
    expect(result.outcome).toBe("advanced");
    expect(result.session.stateId).toBe("confirm");
  });

  it("rejects an unknown intent without throwing, and offers a hint", () => {
    const session = startDialogueV2(scenario);
    const result = advanceDialogueV2(scenario, session, "restaurant.finish");
    expect(result.outcome).toBe("rejected");
    expect(result.session.stateId).toBe("greeting");
    expect(result.hint).toBeDefined();
  });

  it("routes to recovery instead of stranding the learner", () => {
    let session = startDialogueV2(scenario);
    session = advanceDialogueV2(scenario, session, "nonsense").session;
    const second = advanceDialogueV2(scenario, session, "nonsense");
    expect(second.outcome).toBe("recovered");
    expect(second.session.stateId).toBe("repeat");
    // Recovery still leads forward.
    expect(advanceDialogueV2(scenario, second.session, "restaurant.order.drink").session.stateId).toBe(
      "confirm"
    );
  });

  it("completes on a terminal state and averages the turn scores", () => {
    let session = startDialogueV2(scenario);
    session = advanceDialogueV2(scenario, session, "restaurant.order.drink", { score: 1 }).session;
    const done = advanceDialogueV2(scenario, session, "restaurant.finish", { score: 0.6 });
    expect(done.outcome).toBe("completed");
    expect(done.session.completed).toBe(true);
    expect(conversationScore(done.session)).toBeCloseTo(0.8, 5);
  });

  it("has no unreachable states and no dead ends", () => {
    for (const candidate of chineseBundle.scenarios) {
      const reachable = reachableStates(candidate);
      for (const state of candidate.states) {
        expect(reachable.has(state.id), `${candidate.id}/${state.id}`).toBe(true);
      }
      expect(deadEndStates(candidate)).toHaveLength(0);
    }
  });
});

/* ------------------------------------------------------------------ */

describe("assessment engine", () => {
  const assessment = chineseBundle.assessments.find((a) => a.id === "zh.assess.a1.cafe")!;

  it("selects items deterministically for the same seed", () => {
    const a = selectItems(assessment, { seed: "learner:1" });
    const b = selectItems(assessment, { seed: "learner:1" });
    expect(a.map((item) => item.id)).toEqual(b.map((item) => item.id));
  });

  it("spreads a sitting across skills", () => {
    const items = selectItems(assessment, { seed: "learner:1" });
    expect(new Set(items.map((item) => item.skill)).size).toBeGreaterThan(1);
  });

  it("deprioritises items derived from just-completed activities", () => {
    const items = selectItems(assessment, {
      seed: "learner:1",
      recentActivityIds: ["zh.act.a1.order.quick"]
    });
    const derived = items.findIndex((item) => item.derivedFromActivityId === "zh.act.a1.order.quick");
    // Either dropped from the sitting, or pushed out of the opening items.
    expect(derived === -1 || derived > 0).toBe(true);
  });

  it("fails a sitting when any single skill misses its threshold", () => {
    const items = selectItems(assessment, { seed: "learner:1" });
    const responses = items.map((item) => ({
      itemId: item.id,
      // Perfect on choices, silent on speaking.
      choiceIndex: item.correctChoiceIndex,
      spokenScore: 0,
      elapsedMs: 1000
    }));

    const result = scoreAssessment(assessment, items, responses, { completedAt: T0 });
    expect(result.passed).toBe(false);
    expect(result.skillResults.find((r) => r.skill === "speaking")?.passed).toBe(false);
    expect(result.skillResults.find((r) => r.skill === "listeningRecognition")?.passed).toBe(true);
  });

  it("biases placement downward rather than overshooting", () => {
    expect(recommendLevel(0, ["A0", "A1", "A2"])).toBe("A0");
    expect(recommendLevel(0.99, ["A0", "A1", "A2"])).toBe("A2");
    expect(recommendLevel(0.5, ["A0", "A1", "A2"])).toBe("A1");
  });
});

/* ------------------------------------------------------------------ */

describe("content validator", () => {
  it("passes the shipped zh-CN pack with no errors", () => {
    const report = validateBundle(chineseBundle);
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors.map((issue) => `${issue.code} @ ${issue.path}`)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("warns about unrecorded audio without blocking authoring", () => {
    const report = validateBundle(chineseBundle);
    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.issues.every((issue) => issue.severity === "warning")).toBe(true);
  });

  it("rejects a lesson with no speaking activity", () => {
    const broken = {
      ...chineseBundle,
      lessons: chineseBundle.lessons.map((lesson) =>
        lesson.id === "zh.lesson.a0.hello"
          ? {
              ...lesson,
              activities: lesson.activities.filter(
                (activity) => activity.kind === "LISTEN_UNDERSTAND"
              )
            }
          : lesson
      )
    };
    const report = validateBundle(broken);
    expect(report.issues.some((issue) => issue.code === "lesson.speaking.missing")).toBe(true);
  });

  it("rejects an assessment item that replays a drilled sentence", () => {
    const target = chineseBundle.assessments.find((a) => a.id === "zh.assess.a1.cafe")!;
    const broken = {
      ...chineseBundle,
      assessments: chineseBundle.assessments.map((assessment) =>
        assessment.id !== target.id
          ? assessment
          : {
              ...assessment,
              items: assessment.items.map((item) =>
                item.derivedFromActivityId === "zh.act.a1.order.quick"
                  ? { ...item, promptSentenceId: "zh.s.npc-what-drink" }
                  : item
              )
            }
      )
    };
    const report = validateBundle(broken);
    expect(report.issues.some((issue) => issue.code === "assessment.reuse.verbatim")).toBe(true);
  });

  it("rejects a linguistic item with no audio metadata", () => {
    const broken = {
      ...chineseBundle,
      lexicalItems: chineseBundle.lexicalItems.map((item, index) =>
        index === 0 ? { ...item, audio: { ...item.audio, normal: { ...item.audio.normal, src: "" } } } : item
      )
    };
    expect(
      validateBundle(broken).issues.some((issue) => issue.code === "audio.metadata.missing")
    ).toBe(true);
  });

  it("detects a prerequisite cycle", () => {
    const broken = {
      ...chineseBundle,
      concepts: chineseBundle.concepts.map((concept) =>
        concept.id === "greeting.basic"
          ? { ...concept, requires: ["restaurant.order"] }
          : concept
      )
    };
    expect(
      validateBundle(broken).issues.some((issue) => issue.code === "concept.graph.cycle")
    ).toBe(true);
  });

  it("detects an unreachable dialogue state", () => {
    const broken = {
      ...chineseBundle,
      scenarios: chineseBundle.scenarios.map((scenario) =>
        scenario.id !== "zh.dialogue.cafe-order"
          ? scenario
          : {
              ...scenario,
              states: scenario.states.map((state) =>
                state.id === "greeting" ? { ...state, recoveryStateId: undefined } : state
              )
            }
      )
    };
    expect(
      validateBundle(broken).issues.some((issue) => issue.code === "dialogue.state.unreachable")
    ).toBe(true);
  });

  it("refuses to publish content that has not passed every review gate", () => {
    const broken = {
      ...chineseBundle,
      lessons: chineseBundle.lessons.map((lesson, index) =>
        index === 0
          ? { ...lesson, provenance: { ...lesson.provenance, publishStatus: "PUBLISHED" as const } }
          : lesson
      )
    };
    expect(
      validateBundle(broken).issues.some((issue) => issue.code === "provenance.review.incomplete")
    ).toBe(true);
  });
});
