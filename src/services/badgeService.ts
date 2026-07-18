import { FREE_PLANK_SESSION_ID } from '../domain/freePlank';
import { WorkoutRecord } from '../domain/workoutRecord';
import { addLocalDays, toLocalDateKey } from '../utils/date';

export interface BadgeStatus {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
}

// 역대 최장 연속 운동일. 오늘 기준 연속(streak)과 달리 과거 달성 이력도 인정한다.
export function longestConsecutiveWorkoutDays(completedDateKeys: string[]): number {
  const uniqueKeys = [...new Set(completedDateKeys)].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const key of uniqueKeys) {
    const [year, month, day] = key.split('-').map(Number);
    if (!year || !month || !day) continue;
    const date = new Date(year, month - 1, day);
    if (previous && toLocalDateKey(addLocalDays(previous, 1)) === key) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
}

export function evaluateBadges(records: WorkoutRecord[]): BadgeStatus[] {
  const completed = records.filter((record) => record.status === 'COMPLETED');
  const completedCount = completed.length;
  const totalSeconds = completed.reduce((total, record) => total + record.actualDurationSeconds, 0);
  const completedDateKeys = completed.map((record) => toLocalDateKey(new Date(record.startedAt)));
  const longestStreak = longestConsecutiveWorkoutDays(completedDateKeys);
  const bestFreePlankSeconds = completed
    .filter((record) => record.sessionId === FREE_PLANK_SESSION_ID)
    .reduce((best, record) => Math.max(best, record.actualDurationSeconds), 0);

  return [
    { id: 'first_workout', emoji: '🎯', title: '첫 걸음', description: '첫 운동 완료', earned: completedCount >= 1 },
    { id: 'sessions_10', emoji: '🏅', title: '열 번의 약속', description: '운동 10회 완료', earned: completedCount >= 10 },
    { id: 'streak_3', emoji: '🔥', title: '사흘 연속', description: '3일 연속 운동', earned: longestStreak >= 3 },
    { id: 'streak_7', emoji: '📅', title: '일주일 연속', description: '7일 연속 운동', earned: longestStreak >= 7 },
    { id: 'total_30m', emoji: '⏱️', title: '누적 30분', description: '총 운동 30분 달성', earned: totalSeconds >= 1800 },
    { id: 'total_1h', emoji: '🕐', title: '누적 1시간', description: '총 운동 1시간 달성', earned: totalSeconds >= 3600 },
    { id: 'free_1m', emoji: '💪', title: '1분 버티기', description: '자유 플랭크 1분', earned: bestFreePlankSeconds >= 60 },
    { id: 'free_2m', emoji: '🧱', title: '강철 코어', description: '자유 플랭크 2분', earned: bestFreePlankSeconds >= 120 },
  ];
}
