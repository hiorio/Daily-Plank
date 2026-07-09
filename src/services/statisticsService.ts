import { WorkoutRecord } from '../domain/workoutRecord';
import { getWorkoutRecordDate } from './historySummaryService';
import { countConsecutiveWorkoutDays, isDateInCurrentLocalWeek, toLocalDateKey } from '../utils/date';

export interface WorkoutStatistics {
  hasWorkedOutToday: boolean;
  weeklyWorkoutCount: number;
  weeklyDurationSeconds: number;
  streakDays: number;
}

export function calculateWorkoutStatistics(records: WorkoutRecord[], now = new Date()): WorkoutStatistics {
  const completedRecords = records.filter((record) => record.status === 'COMPLETED');
  const todayKey = toLocalDateKey(now);
  const weeklyRecords = completedRecords.filter((record) =>
    isDateInCurrentLocalWeek(getWorkoutRecordDate(record).toISOString(), now),
  );
  const completedDateKeys = completedRecords.map((record) => toLocalDateKey(getWorkoutRecordDate(record)));

  return {
    hasWorkedOutToday: completedDateKeys.includes(todayKey),
    weeklyWorkoutCount: weeklyRecords.length,
    weeklyDurationSeconds: weeklyRecords.reduce(
      (total, record) => total + record.actualDurationSeconds,
      0,
    ),
    streakDays: countConsecutiveWorkoutDays(completedDateKeys, now),
  };
}
