import { updateSM2, SM2State } from "../src/main/sr/sm2";

const today = () => new Date().toISOString().slice(0, 10);

function baseState(): SM2State {
  return {
    ease_factor: 2.5,
    interval_days: 1,
    due_date: today(),
    repetitions: 0,
  };
}

describe("SM-2 updateSM2", () => {
  test("first correct answer gives interval 1, increments repetitions", () => {
    const next = updateSM2(baseState(), 3);
    expect(next.repetitions).toBe(1);
    expect(next.interval_days).toBe(1);
    expect(next.ease_factor).toBeGreaterThanOrEqual(2.5);
  });

  test("second correct answer gives interval 6", () => {
    const after1 = updateSM2(baseState(), 3);
    const after2 = updateSM2(after1, 3);
    expect(after2.repetitions).toBe(2);
    expect(after2.interval_days).toBe(6);
  });

  test("third correct answer multiplies by ease factor", () => {
    const s1 = updateSM2(baseState(), 3);
    const s2 = updateSM2(s1, 3);
    const s3 = updateSM2(s2, 3);
    // SM-2: new ease is computed first, then interval = prev_interval * new_ease
    const expectedEase = Math.round((s2.ease_factor + (0.1 - 0 * (0.08 + 0 * 0.02))) * 100) / 100;
    expect(s3.interval_days).toBe(Math.round(6 * expectedEase));
    expect(s3.repetitions).toBe(3);
  });

  test("first incorrect answer resets interval to 1 and repetitions to 0", () => {
    const next = updateSM2(baseState(), 1);
    expect(next.interval_days).toBe(1);
    expect(next.repetitions).toBe(0);
  });

  test("incorrect after several correct resets interval and repetitions", () => {
    let state = baseState();
    state = updateSM2(state, 3);
    state = updateSM2(state, 3);
    state = updateSM2(state, 3); // interval should be > 1
    const failing = updateSM2(state, 1);
    expect(failing.interval_days).toBe(1);
    expect(failing.repetitions).toBe(0);
  });

  test("ease factor floor is 1.3", () => {
    let state = baseState();
    // Apply many failing answers
    for (let i = 0; i < 20; i++) {
      state = updateSM2(state, 1);
    }
    expect(state.ease_factor).toBeGreaterThanOrEqual(1.3);
  });

  test("due_date is in the future after correct answer", () => {
    const next = updateSM2(baseState(), 3);
    expect(next.due_date >= today()).toBe(true);
  });
});
