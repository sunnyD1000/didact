export interface SM2State {
  ease_factor: number;
  interval_days: number;
  due_date: string; // ISO date string YYYY-MM-DD
  repetitions: number;
}

const MIN_EASE = 1.3;

/**
 * Update SM-2 state after a rating.
 * rating 1 = again (wrong), rating 3 = good (correct)
 */
export function updateSM2(state: SM2State, rating: 1 | 3): SM2State {
  const { ease_factor, interval_days, repetitions } = state;

  let newEase =
    ease_factor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
  if (newEase < MIN_EASE) newEase = MIN_EASE;

  let newInterval: number;
  let newRepetitions: number;

  if (rating === 1) {
    // Fail: reset to 1 day
    newInterval = 1;
    newRepetitions = 0;
  } else {
    // Pass: SM-2 interval progression
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval_days * newEase);
    }
    newRepetitions = repetitions + 1;
  }

  const due = new Date();
  due.setDate(due.getDate() + newInterval);
  const due_date = due.toISOString().slice(0, 10);

  return {
    ease_factor: Math.round(newEase * 100) / 100,
    interval_days: newInterval,
    due_date,
    repetitions: newRepetitions,
  };
}
