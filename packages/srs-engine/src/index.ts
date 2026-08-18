export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewState {
  intervalDays: number;
  ease: number;
  repetitions: number;
}

export function scheduleReview(state: ReviewState, rating: ReviewRating): ReviewState {
  const easeDelta: Record<ReviewRating, number> = {
    again: -0.2,
    hard: -0.05,
    good: 0,
    easy: 0.15
  };
  const multiplier: Record<ReviewRating, number> = {
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
