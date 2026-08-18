import type { ProgramBandStatus, ProgramStage } from "../../../packages/content-schema/src/index.js";
import type { HskBand } from "./hsk-reference.js";

/**
 * The external standard is broader than Lingoza's current learner runtime.
 * Lingoza intentionally remains listening/speaking first; reading, writing and
 * translation are tracked here as parity gaps rather than silently claimed.
 */
export type HskCapabilityDimension =
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "translation";

/**
 * The 2026 HSK 3.0 examination syllabus publishes level-specific buckets for
 * 1-6 and one shared advanced syllabus bucket for 7-9. The nine proficiency
 * grades still remain distinct learning outcomes in GF0025-2021.
 */
export type HskSyllabusBucket = "1" | "2" | "3" | "4" | "5" | "6" | "7-9";

export interface HskProductionTargets {
  /** Lingoza-owned production floor, not an official HSK requirement. */
  minimumUnits: number;
  /** Lingoza-owned production floor, not an official HSK requirement. */
  minimumLessons: number;
  /** Reviewed example/dialogue utterances required before commercial release. */
  minimumReviewedUtterances: number;
  /** Practical multi-turn situations required before commercial release. */
  minimumConversationScenarios: number;
  /** Unit/level transfer checks, excluding routine SRS review. */
  minimumAssessments: number;
}

export interface HskBandProductionPlan {
  band: HskBand;
  syllabusBucket: HskSyllabusBucket;
  stage: ProgramStage;
  programStatus: ProgramBandStatus;
  /** Internal authoring themes. These are not copied syllabus entries. */
  themes: readonly string[];
  /** Listen/speak outcomes that fit Lingoza's current product contract. */
  listeningSpeakingOutcomes: readonly string[];
  productionTargets: HskProductionTargets;
}

export const HSK_STANDARD_CAPABILITY_DIMENSIONS: readonly HskCapabilityDimension[] = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "translation"
];

export const LINGOZA_RUNTIME_CAPABILITY_DIMENSIONS: readonly HskCapabilityDimension[] = [
  "listening",
  "speaking"
];

/** Dimensions required for full-standard parity but intentionally absent today. */
export const LINGOZA_HSK_PARITY_GAPS: readonly HskCapabilityDimension[] =
  HSK_STANDARD_CAPABILITY_DIMENSIONS.filter(
    (dimension) => !LINGOZA_RUNTIME_CAPABILITY_DIMENSIONS.includes(dimension)
  );

const plan = (
  band: HskBand,
  syllabusBucket: HskSyllabusBucket,
  stage: ProgramStage,
  programStatus: ProgramBandStatus,
  themes: readonly string[],
  listeningSpeakingOutcomes: readonly string[],
  productionTargets: HskProductionTargets
): HskBandProductionPlan => ({
  band,
  syllabusBucket,
  stage,
  programStatus,
  themes,
  listeningSpeakingOutcomes,
  productionTargets
});

/**
 * Commercial authoring blueprint for all nine HSK-aligned bands.
 *
 * These targets intentionally exceed a tiny demo slice. They define the amount
 * and variety of reviewed learner material Lingoza wants before a band can be
 * marketed as a substantial course. They are product targets, not official HSK
 * vocabulary counts or an endorsement claim.
 */
export const HSK_PRODUCTION_PLAN: readonly HskBandProductionPlan[] = [
  plan(
    1,
    "1",
    "elementary",
    "building",
    [
      "pronunciation and tone foundations",
      "greetings and identity",
      "numbers, dates and time",
      "family and people",
      "daily routine",
      "food and drinks",
      "shopping and prices",
      "directions and transport",
      "school and basic work",
      "health and simple needs",
      "weather and hobbies",
      "integrated survival conversations"
    ],
    [
      "recognise and answer very familiar everyday utterances",
      "introduce oneself and handle basic daily needs with short speech",
      "maintain useful tone direction, rhythm and pausing on learned patterns"
    ],
    {
      minimumUnits: 12,
      minimumLessons: 60,
      minimumReviewedUtterances: 1000,
      minimumConversationScenarios: 50,
      minimumAssessments: 13
    }
  ),
  plan(
    2,
    "2",
    "elementary",
    "planned",
    [
      "expanded routines and schedules",
      "home and neighbourhood",
      "health and appointments",
      "study and classroom interaction",
      "workplace basics",
      "weather and seasonal plans",
      "preferences and hobbies",
      "travel bookings",
      "services and transactions",
      "describing past events",
      "simple plans and intentions",
      "problem solving",
      "social invitations",
      "integrated daily-life conversations"
    ],
    [
      "sustain short exchanges across familiar situations",
      "describe needs, plans and simple experiences without a fixed script",
      "understand the main idea of clear speech at a moderate pace"
    ],
    {
      minimumUnits: 14,
      minimumLessons: 70,
      minimumReviewedUtterances: 1200,
      minimumConversationScenarios: 60,
      minimumAssessments: 15
    }
  ),
  plan(
    3,
    "3",
    "elementary",
    "planned",
    [
      "connected narration",
      "comparison and choice",
      "reasons and explanations",
      "travel and accommodation",
      "public services",
      "study projects",
      "work tasks",
      "health and wellbeing",
      "relationships and social life",
      "news and everyday media",
      "technology in daily life",
      "culture and festivals",
      "handling misunderstandings",
      "planning and negotiation",
      "longer role plays",
      "elementary-stage integration"
    ],
    [
      "produce short connected speech with a clear purpose",
      "follow longer everyday conversations with less support",
      "handle common situations by recombining known language"
    ],
    {
      minimumUnits: 16,
      minimumLessons: 80,
      minimumReviewedUtterances: 1500,
      minimumConversationScenarios: 70,
      minimumAssessments: 17
    }
  ),
  plan(
    4,
    "4",
    "intermediate",
    "planned",
    [
      "multi-turn social conversation",
      "storytelling and sequencing",
      "cause and consequence",
      "opinions and reasons",
      "workplace collaboration",
      "study and presentations",
      "community and public life",
      "media and current affairs",
      "travel problem solving",
      "consumer decisions",
      "health information",
      "environment and lifestyle",
      "technology and communication",
      "culture and entertainment",
      "formal versus informal register",
      "structured listening summaries",
      "discussion strategies",
      "intermediate-stage integration I"
    ],
    [
      "take part in sustained multi-turn conversations on common social topics",
      "summarize the main point of structured spoken material",
      "explain reasons and viewpoints with a broader pattern inventory"
    ],
    {
      minimumUnits: 18,
      minimumLessons: 90,
      minimumReviewedUtterances: 1800,
      minimumConversationScenarios: 80,
      minimumAssessments: 19
    }
  ),
  plan(
    5,
    "5",
    "intermediate",
    "planned",
    [
      "long-form listening",
      "interviews and announcements",
      "organized opinions",
      "workplace decision making",
      "academic discussion",
      "social issues",
      "economy and consumer life",
      "science and technology",
      "health and public information",
      "culture, arts and media",
      "environment and sustainability",
      "travel and intercultural situations",
      "persuasion and disagreement",
      "summarizing information",
      "presentation skills",
      "register and politeness",
      "figurative everyday language",
      "argument structure",
      "extended role play",
      "intermediate-stage integration II"
    ],
    [
      "understand relatively long spoken content and identify stance",
      "present and support an opinion with organized reasoning",
      "operate effectively in study and workplace conversations"
    ],
    {
      minimumUnits: 20,
      minimumLessons: 100,
      minimumReviewedUtterances: 2200,
      minimumConversationScenarios: 90,
      minimumAssessments: 21
    }
  ),
  plan(
    6,
    "6",
    "intermediate",
    "planned",
    [
      "extended argument",
      "implicit meaning",
      "stance and nuance",
      "formal meetings",
      "professional problem solving",
      "academic lectures",
      "news analysis",
      "public policy and society",
      "business and economics",
      "science and innovation",
      "health and wellbeing",
      "culture and history",
      "literature and storytelling",
      "environment",
      "intercultural communication",
      "humour and pragmatic meaning",
      "register shifting",
      "spontaneous discussion",
      "debate foundations",
      "synthesis from multiple speakers",
      "high-load listening",
      "intermediate-stage integration III"
    ],
    [
      "follow longer reasoning and distinguish main from supporting information",
      "adjust spoken expression to context and register",
      "sustain relatively natural discussion across a broad topic range"
    ],
    {
      minimumUnits: 22,
      minimumLessons: 110,
      minimumReviewedUtterances: 2600,
      minimumConversationScenarios: 100,
      minimumAssessments: 23
    }
  ),
  plan(
    7,
    "7-9",
    "advanced",
    "planned",
    [
      "academic lectures and seminars",
      "professional briefings",
      "culture and society",
      "policy and economics",
      "science and technology",
      "long-form interviews",
      "evidence and argument",
      "critical response",
      "formal presentation",
      "specialist vocabulary strategies",
      "cross-domain synthesis",
      "advanced register",
      "rhetorical structure",
      "negotiation",
      "debate",
      "media analysis",
      "historical and cultural context",
      "research communication",
      "professional scenarios",
      "high-density listening",
      "spontaneous extended speech",
      "multiple-source synthesis",
      "advanced pragmatics",
      "advanced-stage integration I"
    ],
    [
      "understand information-dense long-form speech in familiar domains",
      "summarize, explain and critically respond to a viewpoint",
      "use increasingly formal vocabulary and structures in professional speech"
    ],
    {
      minimumUnits: 24,
      minimumLessons: 120,
      minimumReviewedUtterances: 3000,
      minimumConversationScenarios: 110,
      minimumAssessments: 25
    }
  ),
  plan(
    8,
    "7-9",
    "advanced",
    "planned",
    [
      "complex multi-sided argument",
      "speaker stance and implication",
      "interdisciplinary topics",
      "professional leadership communication",
      "academic critique",
      "advanced negotiation",
      "formal public speaking",
      "specialist interviews",
      "rhetorical nuance",
      "idiomatic and figurative speech",
      "dense media content",
      "policy and institutional language",
      "science communication",
      "arts and criticism",
      "ethics and society",
      "cross-cultural mediation",
      "rapid turn taking",
      "subtle disagreement",
      "register transformation",
      "multi-source synthesis",
      "extended unscripted response",
      "technical explanation",
      "critical debate",
      "advanced listening under load",
      "professional simulations",
      "advanced-stage integration II"
    ],
    [
      "recognize stance, nuance and implication in complex spoken content",
      "present a multi-sided issue with clear organization",
      "shift flexibly between everyday, professional and formal spoken registers"
    ],
    {
      minimumUnits: 26,
      minimumLessons: 130,
      minimumReviewedUtterances: 3400,
      minimumConversationScenarios: 120,
      minimumAssessments: 27
    }
  ),
  plan(
    9,
    "7-9",
    "advanced",
    "planned",
    [
      "specialized academic discourse",
      "specialized professional discourse",
      "abstract reasoning",
      "precision and reformulation",
      "multiple-source synthesis",
      "critical evaluation",
      "high-stakes presentation",
      "expert interview",
      "advanced debate",
      "complex negotiation",
      "rhetoric and style",
      "subtext and implication",
      "rapid authentic speech",
      "regional and register variation awareness",
      "cultural references",
      "institutional communication",
      "research presentation",
      "technical briefing",
      "crisis communication",
      "leadership communication",
      "advanced media analysis",
      "public policy",
      "economics and society",
      "science and humanities",
      "literature and arts",
      "intercultural mediation",
      "spontaneous expert response",
      "advanced-stage integration III"
    ],
    [
      "understand and synthesize multiple complex spoken sources",
      "argue, present and respond critically at an advanced level",
      "use Chinese flexibly in complex academic, professional and social contexts"
    ],
    {
      minimumUnits: 28,
      minimumLessons: 140,
      minimumReviewedUtterances: 4000,
      minimumConversationScenarios: 140,
      minimumAssessments: 29
    }
  )
];

export function productionPlanForBand(band: number): HskBandProductionPlan | undefined {
  return HSK_PRODUCTION_PLAN.find((candidate) => candidate.band === band);
}

export function validateHskProductionPlan(): string[] {
  const errors: string[] = [];
  const expectedBands: HskBand[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  if (HSK_PRODUCTION_PLAN.length !== expectedBands.length) {
    errors.push(`Expected 9 HSK production plans; received ${HSK_PRODUCTION_PLAN.length}.`);
  }

  for (const [index, expectedBand] of expectedBands.entries()) {
    const candidate = HSK_PRODUCTION_PLAN[index];
    if (candidate?.band !== expectedBand) {
      errors.push(`HSK production plan position ${index} must be band ${expectedBand}.`);
    }
    if (!candidate) continue;
    if (candidate.productionTargets.minimumLessons < candidate.productionTargets.minimumUnits * 4) {
      errors.push(`HSK ${candidate.band} has insufficient lesson depth for its unit target.`);
    }
    if (candidate.productionTargets.minimumReviewedUtterances < candidate.productionTargets.minimumLessons * 10) {
      errors.push(`HSK ${candidate.band} has insufficient reviewed-utterance depth.`);
    }
  }

  for (const band of [7, 8, 9] as const) {
    if (productionPlanForBand(band)?.syllabusBucket !== "7-9") {
      errors.push(`HSK ${band} must use the shared 7-9 examination-syllabus bucket.`);
    }
  }

  return errors;
}
