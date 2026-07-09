import { WorkoutRecord } from '../domain/workoutRecord';
import { addLocalDays, addLocalMonths, startOfLocalMonth, startOfLocalWeek, toLocalDateKey } from '../utils/date';

export interface WorkoutDaySummary {
  date: Date;
  dateKey: string;
  completedCount: number;
  durationSeconds: number;
  isToday: boolean;
  isCurrentMonth: boolean;
}

export interface WeeklyWorkoutSummary {
  days: WorkoutDaySummary[];
  totalCompletedCount: number;
  totalDurationSeconds: number;
}

export interface MonthlyWorkoutSummary {
  monthStart: Date;
  calendarDays: WorkoutDaySummary[];
  totalCompletedCount: number;
  totalDurationSeconds: number;
}

export function buildWeeklyWorkoutSummary(records: WorkoutRecord[], now = new Date()): WeeklyWorkoutSummary {
  const weekStart = startOfLocalWeek(now);
  const days = Array.from({ length: 7 }, (_, index) => addLocalDays(weekStart, index));
  const summaries = buildDaySummaries(records, days, now, startOfLocalMonth(now));

  return {
    days: summaries,
    totalCompletedCount: summaries.reduce((total, day) => total + day.completedCount, 0),
    totalDurationSeconds: summaries.reduce((total, day) => total + day.durationSeconds, 0),
  };
}

export function buildMonthlyWorkoutSummary(
  records: WorkoutRecord[],
  monthDate = new Date(),
  now = new Date(),
): MonthlyWorkoutSummary {
  const monthStart = startOfLocalMonth(monthDate);
  const nextMonthStart = addLocalMonths(monthStart, 1);
  const calendarStart = startOfLocalWeek(monthStart);
  const lastMonthDay = addLocalDays(nextMonthStart, -1);
  const calendarEnd = addLocalDays(startOfLocalWeek(lastMonthDay), 7);
  const days: Date[] = [];

  for (let cursor = calendarStart; cursor < calendarEnd; cursor = addLocalDays(cursor, 1)) {
    days.push(cursor);
  }

  const calendarDays = buildDaySummaries(records, days, now, monthStart);
  const currentMonthDays = calendarDays.filter((day) => day.isCurrentMonth);

  return {
    monthStart,
    calendarDays,
    totalCompletedCount: currentMonthDays.reduce((total, day) => total + day.completedCount, 0),
    totalDurationSeconds: currentMonthDays.reduce((total, day) => total + day.durationSeconds, 0),
  };
}

export function getWorkoutRecordDate(record: WorkoutRecord): Date {
  return new Date(record.completedAt ?? record.startedAt);
}

function buildDaySummaries(
  records: WorkoutRecord[],
  dates: Date[],
  now: Date,
  currentMonthStart: Date,
): WorkoutDaySummary[] {
  const todayKey = toLocalDateKey(now);
  const countsByDate = new Map<string, { completedCount: number; durationSeconds: number }>();

  for (const record of records) {
    if (record.status !== 'COMPLETED') continue;
    const dateKey = toLocalDateKey(getWorkoutRecordDate(record));
    const current = countsByDate.get(dateKey) ?? { completedCount: 0, durationSeconds: 0 };
    countsByDate.set(dateKey, {
      completedCount: current.completedCount + 1,
      durationSeconds: current.durationSeconds + record.actualDurationSeconds,
    });
  }

  return dates.map((date) => {
    const dateKey = toLocalDateKey(date);
    const summary = countsByDate.get(dateKey) ?? { completedCount: 0, durationSeconds: 0 };

    return {
      date,
      dateKey,
      completedCount: summary.completedCount,
      durationSeconds: summary.durationSeconds,
      isToday: dateKey === todayKey,
      isCurrentMonth:
        date.getFullYear() === currentMonthStart.getFullYear() && date.getMonth() === currentMonthStart.getMonth(),
    };
  });
}
