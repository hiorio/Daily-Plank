import { describe, expect, it } from 'vitest';
import { WorkoutRecord } from '../domain/workoutRecord';
import { calculateWorkoutStatistics } from './statisticsService';

function record(startedAt: string, duration = 300): WorkoutRecord {
  return {
    id: startedAt,
    sessionId: 's',
    sessionTitle: '세션',
    startedAt,
    completedAt: startedAt,
    plannedDurationSeconds: 300,
    actualDurationSeconds: duration,
    completionRate: 100,
    skippedStepCount: 0,
    status: 'COMPLETED',
  };
}

describe('calculateWorkoutStatistics', () => {
  it('calculates weekly workout count and duration from Monday to Sunday', () => {
    const now = new Date('2026-06-20T12:00:00+09:00');
    const stats = calculateWorkoutStatistics(
      [
        record('2026-06-15T08:00:00+09:00', 300),
        record('2026-06-17T08:00:00+09:00', 420),
        record('2026-06-14T08:00:00+09:00', 600),
      ],
      now,
    );

    expect(stats.weeklyWorkoutCount).toBe(2);
    expect(stats.weeklyDurationSeconds).toBe(720);
  });

  it('handles multiple records on the same day without inflating streak days', () => {
    const now = new Date('2026-06-20T12:00:00+09:00');
    const stats = calculateWorkoutStatistics(
      [
        record('2026-06-20T08:00:00+09:00'),
        record('2026-06-20T18:00:00+09:00'),
        record('2026-06-19T08:00:00+09:00'),
      ],
      now,
    );

    expect(stats.weeklyWorkoutCount).toBe(3);
    expect(stats.streakDays).toBe(2);
  });

  it('keeps yesterday streak when today has no workout', () => {
    const now = new Date('2026-06-20T12:00:00+09:00');
    const stats = calculateWorkoutStatistics(
      [record('2026-06-19T08:00:00+09:00'), record('2026-06-18T08:00:00+09:00')],
      now,
    );

    expect(stats.hasWorkedOutToday).toBe(false);
    expect(stats.streakDays).toBe(2);
  });

  it('returns zero streak when neither today nor yesterday has a completed workout', () => {
    const now = new Date('2026-06-20T12:00:00+09:00');
    const stats = calculateWorkoutStatistics([record('2026-06-17T08:00:00+09:00')], now);

    expect(stats.streakDays).toBe(0);
  });

  it('ignores cancelled records for workout-day statistics', () => {
    const now = new Date('2026-06-20T00:30:00+09:00');
    const cancelled = { ...record('2026-06-20T00:10:00+09:00'), status: 'CANCELLED' as const };

    expect(calculateWorkoutStatistics([cancelled], now).hasWorkedOutToday).toBe(false);
  });
});
