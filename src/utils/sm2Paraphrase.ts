import type { SM2State, SM2Output } from '../types/techCard';

/**
 * SM-2 Adapted Algorithm for Oral Paraphrase
 * Maps overallScore (1.0 to 5.0) to Anki's ratings: again, hard, good, easy
 */
export function computeSM2(score: number, state: SM2State, currentDate = new Date()): SM2Output {
  let rating: 'again' | 'hard' | 'good' | 'easy';
  let newInterval = 0;
  let newRepetition = state.repetition;
  let newEaseFactor = state.easeFactor;

  if (score < 3.0) {
    rating = 'again';
    newRepetition = 0;
    newInterval = 0; // Review in same session / 10 minutes
    newEaseFactor = Math.max(1.3, state.easeFactor - 0.20);
  } else if (score < 4.0) {
    rating = 'hard';
    newRepetition = state.repetition + 1;
    newInterval = state.intervalDays === 0 ? 1 : Math.round(state.intervalDays * 1.2);
    newEaseFactor = Math.max(1.3, state.easeFactor - 0.15);
  } else if (score <= 4.7) {
    rating = 'good';
    newRepetition = state.repetition + 1;
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 4;
    } else {
      newInterval = Math.round(state.intervalDays * state.easeFactor);
    }
  } else {
    rating = 'easy';
    newRepetition = state.repetition + 1;
    if (newRepetition === 1) {
      newInterval = 3;
    } else if (newRepetition === 2) {
      newInterval = 7;
    } else {
      newInterval = Math.round(state.intervalDays * state.easeFactor * 1.3);
    }
    newEaseFactor = state.easeFactor + 0.15;
  }

  const reviewDate = new Date(currentDate);
  if (newInterval === 0) {
    reviewDate.setMinutes(reviewDate.getMinutes() + 10);
  } else {
    reviewDate.setDate(reviewDate.getDate() + newInterval);
  }

  return {
    rating,
    newIntervalDays: newInterval,
    newEaseFactor: Number(newEaseFactor.toFixed(2)),
    newRepetition,
    nextReviewDate: reviewDate.toISOString(),
  };
}
