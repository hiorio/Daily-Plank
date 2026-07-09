import { describe, expect, it } from 'vitest';
import { WorkoutRecord } from '../domain/workoutRecord';
import { buildMonthlyWorkoutSummary, buildWeeklyWorkoutSummary } from './historySummaryService';

function record(startedAt: string, duration = 300, status: WorkoutRecord['status'] = 'COMPLETED'): WorkoutRecord {
  return {
    id: startedAt,
    sessionId: 's',
    sessionTitle: '세션',
    startedAt,
    completedAt: status === 'COMPLETED' ? startedAt : null,
    plannedDurationSeconds: 300,
    actualDurationSeconds: duration,
    completionRate: status === 'COMPLETED' ? 100 : 50,
    skippedStepCount: 0,
    status,
  };
}

describe('history workout summaries', () => {
  it('marks the actual weekday and keeps multiple same-day workouts on that day', () => {
    const now = new Date('2026-07-09T14:00:00+09:00');
    const summary = buildWeeklyWorkoutSummary(
      [record('2026-07-09T08:00:00+09:00'), record('2026-07-09T12:00:00+09:00')],
      now,
    );

    expect(summary.totalCompletedCount).toBe(2);
    expect(summary.days.map((day) => day.completedCount)).toEqual([0, 0, 0, 2, 0, 0, 0]);
  });

  it('ignores cancelled records in day highlights', () => {
    const now = new Date('2026-07-09T14:00:00+09:00');
    const summary = buildWeeklyWorkoutSummary([record('2026-07-09T08:00:00+09:00', 100, 'CANCELLED')], now);

    expect(summary.totalCompletedCount).toBe(0);
    expect(summary.days.every((day) => day.completedCount === 0)).toBe(true);
  });

  it('builds a monthly calendar and counts only the selected month', () => {
    const now = new Date('2026-07-09T14:00:00+09:00');
    const summary = buildMonthlyWorkoutSummary(
      [
        record('2026-06-30T08:00:00+09:00'),
        record('2026-07-01T08:00:00+09:00', 300),
        record('2026-07-09T08:00:00+09:00', 420),
      ],
      now,
      now,
    );

    expect(summary.totalCompletedCount).toBe(2);
    expect(summary.totalDurationSeconds).toBe(720);
    expect(summary.calendarDays.length % 7).toBe(0);
  });
});
