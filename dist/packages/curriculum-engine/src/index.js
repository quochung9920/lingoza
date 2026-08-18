export function availableConcepts(concepts, mastery, threshold = 0.7) {
    const byConcept = new Map(mastery.map((entry) => [entry.conceptId, entry]));
    return concepts.filter((concept) => concept.prerequisites.every((prerequisite) => {
        const record = byConcept.get(prerequisite);
        if (!record)
            return false;
        const scores = Object.values(record.skills).filter((score) => typeof score === "number");
        if (scores.length === 0)
            return false;
        return scores.reduce((sum, score) => sum + score, 0) / scores.length >= threshold;
    }));
}
export function weakestSkills(record, limit = 3) {
    return Object.entries(record.skills)
        .sort((a, b) => a[1] - b[1])
        .slice(0, limit)
        .map(([skill]) => skill);
}
