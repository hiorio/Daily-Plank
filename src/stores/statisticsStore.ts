import { create } from 'zustand';
import { getRecentWorkoutRecords } from '../database/workoutRecordRepository';
import { calculateWorkoutStatistics, WorkoutStatistics } from '../services/statisticsService';

interface StatisticsStore {
  statistics: WorkoutStatistics;
  loading: boolean;
  refresh: () => Promise<void>;
}

const emptyStatistics: WorkoutStatistics = {
  hasWorkedOutToday: false,
  weeklyWorkoutCount: 0,
  weeklyDurationSeconds: 0,
  streakDays: 0,
};

export const useStatisticsStore = create<StatisticsStore>((set) => ({
  statistics: emptyStatistics,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const records = await getRecentWorkoutRecords(365);
      set({ statistics: calculateWorkoutStatistics(records), loading: false });
    } catch (error) {
      if (__DEV__) console.warn('Statistics refresh failed', error);
      set({ statistics: emptyStatistics, loading: false });
    }
  },
}));
