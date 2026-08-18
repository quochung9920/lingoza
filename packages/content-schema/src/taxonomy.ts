import type { ContentId, LocalizedText } from "./common.js";

/* ------------------------------------------------------------------ */
/* Levels                                                              */
/* ------------------------------------------------------------------ */

/**
 * Lingoza's own level band. Deliberately NOT called "CEFR level" — CEFR is
 * referenced via `cefrTarget`, never claimed as certification.
 */
export type LingozaLevel = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const LINGOZA_LEVELS: readonly LingozaLevel[] = [
  "A0",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2"
];

/** Sub-band within a level, e.g. `A1.1`. Levels always have >= 1 sublevel. */
export type SublevelId = string;

export function levelRank(level: LingozaLevel): number {
  return LINGOZA_LEVELS.indexOf(level);
}

/** CEFR band referenced for alignment. Never presented as certification. */
export type CefrReference = "pre-A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */

/**
 * The skill axes mastery is tracked on. These are the *only* dimensions the
 * engines reason about; every activity declares which ones it exercises.
 */
export type LearningSkill =
  /** Hear it and know which item it was. */
  | "listeningRecognition"
  /** See/hear it and know what it means. */
  | "meaningRecognition"
  /** Produce it from meaning alone, unprompted. */
  | "activeRecall"
  /** Say it intelligibly at speed. */
  | "speaking"
  /** Measurable prosody: tone contour, rhythm, pace, pausing. */
  | "pronunciation"
  /** Use it in a turn-taking exchange under time pressure. */
  | "conversation"
  /** Still available after a delay. */
  | "retention";

export const LEARNING_SKILLS: readonly LearningSkill[] = [
  "listeningRecognition",
  "meaningRecognition",
  "activeRecall",
  "speaking",
  "pronunciation",
  "conversation",
  "retention"
];

/** Skill mastery vector. Missing key === never practised, not zero. */
export type SkillVector = Partial<Record<LearningSkill, number>>;

/**
 * Vocabulary/pattern knowledge depth. Replaces the boolean `learned` flag:
 * a learner can understand 咖啡 long before they can order one out loud.
 */
export type KnowledgeDepth = "unseen" | "passive" | "active";

/* ------------------------------------------------------------------ */
/* Topics                                                              */
/* ------------------------------------------------------------------ */

/**
 * A node in the topic ontology. Topics nest arbitrarily deep
 * (`food` > `food.restaurant` > `food.restaurant.ordering`) so a lesson can be
 * filed as precisely as its content warrants while still rolling up.
 */
export interface Topic {
  id: ContentId;
  label: LocalizedText;
  /** Parent topic id, or null for a root domain. */
  parentId: ContentId | null;
  /** Ordering hint within the parent. */
  order: number;
  /** Emoji or icon token for the topic card. Presentation-only. */
  icon?: string;
}

/** Index that answers ancestry questions without repeated tree walks. */
export interface TopicIndex {
  byId: ReadonlyMap<ContentId, Topic>;
  childrenOf(topicId: ContentId): readonly Topic[];
  ancestorsOf(topicId: ContentId): readonly Topic[];
  roots(): readonly Topic[];
  /** True when `topicId` is `ancestorId` or nested beneath it. */
  isWithin(topicId: ContentId, ancestorId: ContentId): boolean;
}

export function buildTopicIndex(topics: readonly Topic[]): TopicIndex {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const children = new Map<ContentId, Topic[]>();
  const roots: Topic[] = [];

  for (const topic of topics) {
    if (topic.parentId === null) {
      roots.push(topic);
      continue;
    }
    const bucket = children.get(topic.parentId);
    if (bucket) bucket.push(topic);
    else children.set(topic.parentId, [topic]);
  }

  const byOrder = (a: Topic, b: Topic) => a.order - b.order;
  roots.sort(byOrder);
  for (const bucket of children.values()) bucket.sort(byOrder);

  const ancestorsOf = (topicId: ContentId): Topic[] => {
    const chain: Topic[] = [];
    const seen = new Set<ContentId>([topicId]);
    let current = byId.get(topicId);
    while (current?.parentId) {
      if (seen.has(current.parentId)) break; // defensive: cycles are a validator error
      const parent = byId.get(current.parentId);
      if (!parent) break;
      chain.push(parent);
      seen.add(parent.id);
      current = parent;
    }
    return chain;
  };

  return {
    byId,
    childrenOf: (topicId) => children.get(topicId) ?? [],
    ancestorsOf,
    roots: () => roots,
    isWithin(topicId, ancestorId) {
      if (topicId === ancestorId) return true;
      return ancestorsOf(topicId).some((topic) => topic.id === ancestorId);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Activities                                                          */
/* ------------------------------------------------------------------ */

/**
 * Every exercise type Lingoza supports. There is deliberately no writing or
 * free-text type: if a drill can be spoken, it is spoken.
 */
export type ActivityKind =
  | "LISTEN_UNDERSTAND"
  | "LISTEN_CHOOSE"
  | "LISTEN_REPEAT"
  | "SHADOWING"
  | "PRONUNCIATION_DRILL"
  | "QUICK_RESPONSE"
  | "GUIDED_SPEAKING"
  | "SUBSTITUTION_DRILL"
  | "DIALOGUE"
  | "ROLE_PLAY"
  | "LISTENING_CHALLENGE"
  | "VOCABULARY_REVIEW"
  | "PATTERN_REVIEW"
  | "UNIT_CHECKPOINT"
  | "LEVEL_ASSESSMENT";

export const ACTIVITY_KINDS: readonly ActivityKind[] = [
  "LISTEN_UNDERSTAND",
  "LISTEN_CHOOSE",
  "LISTEN_REPEAT",
  "SHADOWING",
  "PRONUNCIATION_DRILL",
  "QUICK_RESPONSE",
  "GUIDED_SPEAKING",
  "SUBSTITUTION_DRILL",
  "DIALOGUE",
  "ROLE_PLAY",
  "LISTENING_CHALLENGE",
  "VOCABULARY_REVIEW",
  "PATTERN_REVIEW",
  "UNIT_CHECKPOINT",
  "LEVEL_ASSESSMENT"
];

/** Activities that require the microphone, so consent is requested lazily. */
export const SPEAKING_ACTIVITY_KINDS: readonly ActivityKind[] = [
  "LISTEN_REPEAT",
  "SHADOWING",
  "PRONUNCIATION_DRILL",
  "QUICK_RESPONSE",
  "GUIDED_SPEAKING",
  "SUBSTITUTION_DRILL",
  "ROLE_PLAY"
];

export function requiresMicrophone(kind: ActivityKind): boolean {
  return SPEAKING_ACTIVITY_KINDS.includes(kind);
}

/** Which skills each activity kind can move. Used by the mastery engine. */
export const ACTIVITY_SKILL_MAP: Readonly<Record<ActivityKind, readonly LearningSkill[]>> = {
  LISTEN_UNDERSTAND: ["listeningRecognition", "meaningRecognition"],
  LISTEN_CHOOSE: ["listeningRecognition", "meaningRecognition"],
  LISTEN_REPEAT: ["listeningRecognition", "speaking", "pronunciation"],
  SHADOWING: ["speaking", "pronunciation", "listeningRecognition"],
  PRONUNCIATION_DRILL: ["pronunciation", "speaking"],
  QUICK_RESPONSE: ["activeRecall", "speaking", "conversation"],
  GUIDED_SPEAKING: ["activeRecall", "speaking"],
  SUBSTITUTION_DRILL: ["activeRecall", "speaking"],
  DIALOGUE: ["conversation", "listeningRecognition", "meaningRecognition"],
  ROLE_PLAY: ["conversation", "speaking", "activeRecall"],
  LISTENING_CHALLENGE: ["listeningRecognition", "retention"],
  VOCABULARY_REVIEW: ["meaningRecognition", "retention", "activeRecall"],
  PATTERN_REVIEW: ["activeRecall", "retention"],
  UNIT_CHECKPOINT: ["listeningRecognition", "activeRecall", "conversation", "retention"],
  LEVEL_ASSESSMENT: [
    "listeningRecognition",
    "meaningRecognition",
    "activeRecall",
    "speaking",
    "conversation",
    "retention"
  ]
};
