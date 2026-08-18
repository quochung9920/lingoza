export type ReviewRating = "again" | "hard" | "good" | "easy";
export interface ReviewState {
    intervalDays: number;
    ease: number;
    repetitions: number;
}
export declare function scheduleReview(state: ReviewState, rating: ReviewRating): ReviewState;
