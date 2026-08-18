import type { ContentId } from "../packages/content-schema/src/index.js";
import { chineseBundle } from "../language-packs/zh-CN/src/index.js";
import { hskReferenceCatalog } from "../language-packs/zh-CN/src/hsk-reference.js";
import {
  HSK_PRODUCTION_PLAN,
  LINGOZA_HSK_PARITY_GAPS,
  LINGOZA_RUNTIME_CAPABILITY_DIMENSIONS,
  HSK_STANDARD_CAPABILITY_DIMENSIONS,
  productionPlanForBand,
  validateHskProductionPlan
} from "../language-packs/zh-CN/src/hsk-production-plan.js";

const program = chineseBundle.programs?.find((candidate) => candidate.id === "zh.program.hsk");

if (!program) {
  throw new Error("Chinese bundle has no zh.program.hsk roadmap.");
}

const productionPlanErrors = validateHskProductionPlan();
if (productionPlanErrors.length > 0) {
  throw new Error(`Invalid HSK production plan:\n${productionPlanErrors.join("\n")}`);
}

const courseById = new Map(chineseBundle.courses.map((course) => [course.id, course]));
const unitById = new Map(chineseBundle.units.map((unit) => [unit.id, unit]));
const conceptById = new Map(chineseBundle.concepts.map((concept) => [concept.id, concept]));
const itemById = new Map(chineseBundle.lexicalItems.map((item) => [item.id, item]));

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

const bands = program.bands.map((band) => {
  const courses = band.courseIds.flatMap((id) => {
    const course = courseById.get(id);
    return course ? [course] : [];
  });
  const unitIds = unique(courses.flatMap((course) => course.unitIds));
  const units = unitIds.flatMap((id) => {
    const unit = unitById.get(id);
    return unit ? [unit] : [];
  });
  const lessonIds = unique(units.flatMap((unit) => unit.lessonIds));
  const conceptIds = unique(units.flatMap((unit) => unit.conceptIds));
  const concepts = conceptIds.flatMap((id) => {
    const concept = conceptById.get(id);
    return concept ? [concept] : [];
  });
  const lexicalIds = unique(concepts.flatMap((concept) => concept.lexicalItemIds));
  const lexicalItems = lexicalIds.flatMap((id) => {
    const item = itemById.get(id as ContentId);
    return item ? [item] : [];
  });

  const missingLexicalRecordings = lexicalItems.filter((item) => !item.audio.available).length;
  const publishedLexicalItems = lexicalItems.filter(
    (item) => item.provenance.publishStatus === "PUBLISHED"
  ).length;
  const referenceEntries = hskReferenceCatalog.entries.filter((entry) => entry.band === band.ordinal);
  const productionPlan = productionPlanForBand(band.ordinal);

  return {
    band: band.ordinal,
    label: band.label["vi-VN"] ?? band.label["en-US"],
    stage: band.stage,
    status: band.status,
    syllabusBucket: productionPlan?.syllabusBucket ?? null,
    currentContribution: {
      courses: courses.length,
      units: units.length,
      lessons: lessonIds.length,
      concepts: concepts.length,
      lexicalItems: lexicalItems.length
    },
    commercialProductionTarget: productionPlan?.productionTargets ?? null,
    authoringThemes: productionPlan?.themes.length ?? 0,
    productionReadiness: {
      lexicalRecordingsReady: lexicalItems.length - missingLexicalRecordings,
      lexicalRecordingsMissing: missingLexicalRecordings,
      publishedLexicalItems
    },
    referenceCoverage: {
      catalogStatus: hskReferenceCatalog.status,
      referenceEntries: referenceEntries.length,
      percent: null,
      note:
        "No HSK percentage is claimed until the official per-band reference catalog is complete and cross-checked."
    }
  };
});

const ordinals = program.bands.map((band) => band.ordinal);
const hasNineOrderedBands =
  ordinals.length === 9 && ordinals.every((ordinal, index) => ordinal === index + 1);

console.log("LINGOZA HSK 1-9 READINESS");
console.log(
  JSON.stringify(
    {
      program: program.title["vi-VN"] ?? program.title["en-US"],
      alignmentReference: program.alignmentReference.reference,
      referenceCatalogStatus: hskReferenceCatalog.status,
      nineBandStructureValid: hasNineOrderedBands,
      productionPlanBands: HSK_PRODUCTION_PLAN.length,
      capabilityParity: {
        externalStandardDimensions: HSK_STANDARD_CAPABILITY_DIMENSIONS,
        learnerRuntimeDimensions: LINGOZA_RUNTIME_CAPABILITY_DIMENSIONS,
        gaps: LINGOZA_HSK_PARITY_GAPS,
        fullStandardParity: LINGOZA_HSK_PARITY_GAPS.length === 0
      },
      policy: {
        certificationClaim: false,
        availableRequiresReferenceCoverage: true,
        availableRequiresProductionAudio: true,
        availableRequiresHumanReview: true,
        productionPlanIsOfficialRequirement: false
      },
      bands
    },
    null,
    2
  )
);
