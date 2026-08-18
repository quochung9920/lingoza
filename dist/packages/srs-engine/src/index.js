/**
 * Next interval for one review item.
 *
 * `again` resets the interval to a single day and drops ease, on the principle
 * that a lapse means the item was not actually consolidated and should be
 * re-earned rather than merely delayed.
 */
export function scheduleReview(state, rating) {
    const easeDelta = {
        again: -0.2,
        hard: -0.05,
        good: 0,
        easy: 0.15
    };
    const multiplier = {
        again: 0,
        hard: 1.2,
        good: state.ease,
        easy: state.ease + 0.8
    };
    if (rating === "again") {
        return { intervalDays: 1, ease: Math.max(1.3, state.ease + easeDelta[rating]), repetitions: 0 };
    }
    const base = state.repetitions === 0 ? (rating === "hard" ? 1 : 2) : state.intervalDays;
    return {
        intervalDays: Math.max(1, Math.round(base * multiplier[rating])),
        ease: Math.max(1.3, state.ease + easeDelta[rating]),
        repetitions: state.repetitions + 1
    };
}
/** Maps a normalized activity score onto a rating, so the learner never grades themselves. */
export function ratingFromScore(score) {
    if (score >= 0.95)
        return "easy";
    if (score >= 0.75)
        return "good";
    if (score >= 0.5)
        return "hard";
    return "again";
}
export function reviewKey(key) {
    return `${key.conceptId}::${key.skill}`;
}
const MS_PER_DAY = 86_400_000;
export function initialReviewState(key, now) {
    return {
        ...key,
        intervalDays: 1,
        ease: 2.5,
        repetitions: 0,
        dueAt: new Date(Date.parse(now) + MS_PER_DAY).toISOString()
    };
}
/** Records an attempt and re-schedules the item. Pure; returns a new schedule. */
export function recordReview(schedule, key, score, now) {
    const id = reviewKey(key);
    const previous = schedule[id] ?? initialReviewState(key, now);
    const next = scheduleReview(previous, ratingFromScore(score));
    return {
        ...schedule,
        [id]: {
            ...key,
            ...next,
            dueAt: new Date(Date.parse(now) + next.intervalDays * MS_PER_DAY).toISOString()
        }
    };
}
export function dueItems(schedule, now) {
    const nowMs = Date.parse(now);
    return Object.values(schedule)
        .filter((item) => Date.parse(item.dueAt) <= nowMs)
        .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}
/**
 * Activity used to rehearse each skill.
 *
 * Every entry is a listening or speaking task -- there is no reading-only or
 * writing rehearsal anywhere in the review path, which is what keeps daily
 * practice aligned with the audio-first promise.
 */
export const SKILL_REVIEW_ACTIVITY = {
    listeningRecognition: "LISTEN_CHOOSE",
    meaningRecognition: "LISTEN_UNDERSTAND",
    activeRecall: "GUIDED_SPEAKING",
    speaking: "LISTEN_REPEAT",
    pronunciation: "PRONUNCIATION_DRILL",
    conversation: "QUICK_RESPONSE",
    retention: "VOCABULARY_REVIEW"
};
/** Rough per-slot cost, used to fit a session into the learner's time budget. */
export const SKILL_SLOT_SECONDS = {
    listeningRecognition: 20,
    meaningRecognition: 20,
    activeRecall: 35,
    speaking: 30,
    pronunciation: 40,
    conversation: 45,
    retention: 20
};
/**
 * Builds a session from three signals, in descending priority: items whose SRS
 * interval has elapsed, skills the mastery engine projects will fall below the
 * at-risk line shortly, and skills already sitting below threshold.
 *
 * Interleaving matters as much as selection, so the result is round-robined
 * across concepts: practising a concept's four skills back to back inflates
 * scores through short-term recall rather than building durable retrieval.
 */
export function assembleSession(due, atRisk, weak, options) {
    const maxSlots = options.maxSlots ?? 40;
    const maxPerConcept = options.maxPerConcept ?? 3;
    const candidates = new Map();
    const add = (conceptId, skill, reason, priority) => {
        const id = `${conceptId}::${skill}`;
        const existing = candidates.get(id);
        if (existing && existing.priority >= priority)
            return;
        candidates.set(id, {
            conceptId,
            skill,
            kind: SKILL_REVIEW_ACTIVITY[skill],
            reason,
            priority,
            estimatedSeconds: SKILL_SLOT_SECONDS[skill]
        });
    };
    for (const item of due)
        add(item.conceptId, item.skill, "due", 100);
    // Nearer to being forgotten => higher priority, on a 0..3 day horizon.
    for (const risk of atRisk)
        add(risk.conceptId, risk.skill, "at-risk", 90 - risk.daysUntilAtRisk * 10);
    for (const signal of weak)
        add(signal.conceptId, signal.skill, "weak", 50 - signal.score * 10);
    const ranked = [...candidates.values()].sort((a, b) => b.priority - a.priority);
    const byConcept = new Map();
    for (const slot of ranked) {
        const bucket = byConcept.get(slot.conceptId) ?? [];
        if (bucket.length >= maxPerConcept)
            continue;
        bucket.push(slot);
        byConcept.set(slot.conceptId, bucket);
    }
    // Round-robin so consecutive slots come from different concepts.
    const queues = [...byConcept.values()];
    const interleaved = [];
    for (let round = 0; interleaved.length < ranked.length; round += 1) {
        let progressed = false;
        for (const queue of queues) {
            const slot = queue[round];
            if (!slot)
                continue;
            interleaved.push(slot);
            progressed = true;
        }
        if (!progressed)
            break;
    }
    const slots = [];
    let total = 0;
    for (const slot of interleaved) {
        if (slots.length >= maxSlots)
            break;
        if (total + slot.estimatedSeconds > options.budgetSeconds)
            continue;
        slots.push(slot);
        total += slot.estimatedSeconds;
    }
    return { slots, estimatedSeconds: total };
}
