import { chineseBundle } from "../language-packs/zh-CN/src/index.js";

const bundle = chineseBundle;

const activityCounts = new Map<string, number>();
for (const lesson of bundle.lessons) {
  for (const activity of lesson.activities) {
    activityCounts.set(activity.kind, (activityCounts.get(activity.kind) ?? 0) + 1);
  }
}

const missingLexicalAudio = bundle.lexicalItems.filter((item) => !item.audio.available).length;
const missingSentenceAudio = bundle.sentences.filter((sentence) => !sentence.audio.available).length;
const reviewedObjects = [
  ...bundle.lexicalItems,
  ...bundle.sentences,
  ...bundle.patterns,
  ...bundle.lessons,
  ...bundle.scenarios,
  ...bundle.assessments
].filter((item) => item.provenance.publishStatus === "PUBLISHED").length;

const report = {
  language: bundle.profile.language,
  levels: bundle.levels.length,
  courses: bundle.courses.length,
  units: bundle.units.length,
  lessons: bundle.lessons.length,
  topics: bundle.topics.length,
  concepts: bundle.concepts.length,
  lexicalItems: bundle.lexicalItems.length,
  sentences: bundle.sentences.length,
  patterns: bundle.patterns.length,
  scenarios: bundle.scenarios.length,
  assessments: bundle.assessments.length,
  activities: bundle.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0),
  audio: {
    lexicalMissingRecordings: missingLexicalAudio,
    sentenceMissingRecordings: missingSentenceAudio,
    totalMissingRecordings: missingLexicalAudio + missingSentenceAudio
  },
  publishedReviewedObjects: reviewedObjects,
  activityKinds: Object.fromEntries([...activityCounts.entries()].sort(([a], [b]) => a.localeCompare(b)))
};

console.log("LINGOZA CONTENT COVERAGE");
console.log(JSON.stringify(report, null, 2));
