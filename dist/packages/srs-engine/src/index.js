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
