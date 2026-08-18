import type { Concept, Skill } from "../../content-schema/src/index.js";

export interface MasteryRecord {
  conceptId: string;
  skills: Partial<Record<Skill, number>>;
}

export function availableConcepts(
  concepts: Concept[],
  mastery: MasteryRecord[],
  threshold = 0.7
): Concept[] {
  const byConcept = new Map(mastery.map((entry) => [entry.conceptId, entry]));
  return concepts.filter((concept) =>
    concept.prerequisites.every((prerequisite) => {
      const record = byConcept.get(prerequisite);
      if (!record) return false;
      const scores = Object.values(record.skills).filter(
        (score): score is number => typeof score === "number"
      );
      if (scores.length === 0) return false;
      return scores.reduce((sum, score) => sum + score, 0) / scores.length >= threshold;
    })
  );
}

export function weakestSkills(record: MasteryRecord, limit = 3): Skill[] {
  return (Object.entries(record.skills) as [Skill, number][]) 
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([skill]) => skill);
}
