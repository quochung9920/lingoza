import type { Concept, Skill } from "../../content-schema/src/index.js";
export interface MasteryRecord {
    conceptId: string;
    skills: Partial<Record<Skill, number>>;
}
export declare function availableConcepts(concepts: Concept[], mastery: MasteryRecord[], threshold?: number): Concept[];
export declare function weakestSkills(record: MasteryRecord, limit?: number): Skill[];
