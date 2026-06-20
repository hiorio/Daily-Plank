import { describe, expect, it } from 'vitest';
import { WorkoutSession } from '../domain/workoutSession';
import {
  calculateRemainingMs,
  resolveStepProgressAfterElapsedTime,
  shiftStepEndAfterPause,
} from './TimerEngine';

const session: WorkoutSession = {
  id: 'test',
  title: 'test',
  description: 'test',
  level: 'BEGINNER',
  totalDurationSeconds: 60,
  steps: [
    { id: 'prepare', type: 'PREPARE', title: 'prepare', durationSeconds: 10 },
    { id: 'exercise', type: 'EXERCISE', title: 'exercise', exerciseId: 'forearm_plank', durationSeconds: 20 },
    { id: 'rest', type: 'REST', title: 'rest', durationSeconds: 10 },
    { id: 'finish', type: 'COOLDOWN', title: 'finish', durationSeconds: 20 },
  ],
};

describe('TimerEngine', () => {
  it('calculates remaining time from end timestamp and current timestamp', () => {
    expect(calculateRemainingMs(15_000, 12_250)).toBe(2_750);
    expect(calculateRemainingMs(15_000, 16_000)).toBe(0);
  });

  it('does not move time forward while paused because resume shifts the end timestamp', () => {
    const originalEnd = 30_000;
    const shiftedEnd = shiftStepEndAfterPause(originalEnd, 10_000, 25_000);

    expect(shiftedEnd).toBe(45_000);
  });

  it('keeps the current step when background return is still within the step', () => {
    const result = resolveStepProgressAfterElapsedTime(session, 0, 0, 10_000, 8_000);

    expect(result.completed).toBe(false);
    expect(result.currentStepIndex).toBe(0);
  });

  it('advances across multiple elapsed steps on background return', () => {
    const result = resolveStepProgressAfterElapsedTime(session, 0, 0, 10_000, 35_000);

    expect(result.completed).toBe(false);
    expect(result.currentStepIndex).toBe(2);
    expect(result.stepStartedAt).toBe(30_000);
    expect(result.stepEndsAt).toBe(40_000);
  });

  it('marks the session completed when all steps have elapsed', () => {
    const result = resolveStepProgressAfterElapsedTime(session, 0, 0, 10_000, 65_000);

    expect(result.completed).toBe(true);
  });
});
