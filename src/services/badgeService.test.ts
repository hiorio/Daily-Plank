import { describe, expect, it } from 'vitest';
import { FREE_PLANK_SESSION_ID } from '../domain/freePlank';
import { WorkoutRecord } from '../domain/workoutRecord';
import { evaluateBadges, longestConsecutiveWorkoutDays } from './badgeService';

function record(startedAt: string, overrides: Partial<WorkoutRecord> = {}): WorkoutRecord {
  return {
    id: `${startedAt}-${overrides.sessionId ?? 's'}`,
    sessionId: 's',
    sessionTitle: '세션',
    startedAt,
    completedAt: startedAt,
    plannedDurationSeconds: 300,
    actualDurationSeconds: 300,
    completionRate: 100,
    skippedStepCount: 0,
    status: 'COMPLETED',
    ...overrides,
  };
}

describe('longestConsecutiveWorkoutDays', () => {
  it('finds the longest historical run, not just the current streak', () => {
    const days = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-10', '2026-06-11'];
    expect(longestConsecutiveWorkoutDays(days)).toBe(3);
  });

  it('ignores duplicate days', () => {
    expect(longestConsecutiveWorkoutDays(['2026-06-01', '2026-06-01', '2026-06-02'])).toBe(2);
  });

  it('returns zero for no workouts', () => {
    expect(longestConsecutiveWorkoutDays([])).toBe(0);
  });
});

describe('evaluateBadges', () => {
  it('earns the first workout badge with one completed record', () => {
    const badges = evaluateBadges([record('2026-06-01T08:00:00+09:00')]);
    expect(badges.find((badge) => badge.id === 'first_workout')?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === 'sessions_10')?.earned).toBe(false);
  });

  it('ignores cancelled records', () => {
    const badges = evaluateBadges([
      record('2026-06-01T08:00:00+09:00', { status: 'CANCELLED' }),
    ]);
    expect(badges.find((badge) => badge.id === 'first_workout')?.earned).toBe(false);
  });

  it('earns streak badges from historical runs', () => {
    const badges = evaluateBadges([
      record('2026-06-01T08:00:00+09:00'),
      record('2026-06-02T08:00:00+09:00'),
      record('2026-06-03T08:00:00+09:00'),
    ]);
    expect(badges.find((badge) => badge.id === 'streak_3')?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === 'streak_7')?.earned).toBe(false);
  });

  it('earns cumulative and free plank badges', () => {
    const badges = evaluateBadges([
      record('2026-06-01T08:00:00+09:00', { actualDurationSeconds: 1700 }),
      record('2026-06-02T08:00:00+09:00', {
        sessionId: FREE_PLANK_SESSION_ID,
        actualDurationSeconds: 130,
      }),
    ]);
    expect(badges.find((badge) => badge.id === 'total_30m')?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === 'free_1m')?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === 'free_2m')?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === 'total_1h')?.earned).toBe(false);
  });
});
